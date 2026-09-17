import ActionEngine from 'game/actions/ActionEngine';
import { ActionIntent, BrainDeps, OptionalDecisionController } from 'game/actions/Brain';
import { validateLLMParameters } from 'game/llm/LLMActionCandidates';
import { DEFAULT_LLM_RUNTIME_CONFIG, LLMActionCandidate, LLMDecision, LLMDecisionRecord, LLMPersistentState, LLMRuntimeConfig } from 'game/llm/LLMDecisionTypes';
import LLMMemoryStore from 'game/llm/LLMMemoryStore';
import { buildLLMObservation, LLMObservation } from 'game/llm/LLMObservationBuilder';
import { LLMProvider } from 'game/llm/OpenAICompatibleProvider';
import { PersonId } from 'types/Genealogy';
import { locationKey } from 'types/Objects';

export type LLMStatus = 'idle' | 'thinking' | 'queued' | 'acting' | 'cooldown' | 'error' | 'backoff';
export interface LLMDecisionInfo { controller: 'simulation' | 'llm'; status: LLMStatus; model: string | null; lastAction: string | null; reason: string | null; latencyMs: number | null; error: string | null; lifecycle: string | null; promptChars: number | null; responseChars: number | null; }
const SYSTEM_PROMPT = 'You control discretionary choices for one human in TownBox. The observation is your only reliable knowledge. Choose only an available action and allowed parameter values; TownBox decides outcomes. You may choose __wait__. Return strict JSON only: {"actionId":"...","params":{},"reason":"short public rationale","goalUpdates":{"add":[],"complete":[]}}. Do not provide hidden reasoning.';

interface ReadyDecision { decision: LLMDecision; requestId: number; generation: number; personId: PersonId; requestedTick: number; fingerprint: string; candidates: LLMActionCandidate[]; latencyMs: number; responseChars: number; }

export default class LLMController implements OptionalDecisionController {
    private personId: PersonId | null = null;
    private generation = 0;
    private requestSeq = 0;
    private inFlight: number | null = null;
    private ready: ReadyDecision | null = null;
    private cooldownUntil = 0;
    private failures = 0;
    private actionEngine: ActionEngine | null = null;
    private memory = new LLMMemoryStore();
    private decisions: LLMDecisionRecord[] = [];
    private lastObservation: LLMObservation | null = null;
    private lastCandidates: LLMActionCandidate[] = [];
    private lastRetrievedMemoryIds: string[] = [];
    private info: LLMDecisionInfo = this.blankInfo('simulation');

    constructor(private readonly provider: LLMProvider | null, private readonly config: LLMRuntimeConfig = DEFAULT_LLM_RUNTIME_CONFIG) {}
    attachEngine(engine: ActionEngine): void { this.actionEngine = engine; }
    select(personId: PersonId | null): void { this.generation += 1; this.personId = personId; this.inFlight = null; this.ready = null; this.failures = 0; this.info = this.blankInfo(personId ? 'llm' : 'simulation'); }
    controls(personId: PersonId): boolean { return this.personId === personId; }
    delegatesOptionalChoices(personId: PersonId): boolean { return this.controls(personId) && !(this.config.failureFallback === 'simulation' && this.info.status === 'backoff'); }
    candidateLimit(): number { return this.config.candidateLimit; }
    needsCandidates(personId: PersonId, tick: number): boolean { return this.controls(personId) && (this.ready !== null || (this.inFlight === null && tick >= this.cooldownUntil)); }
    selectedPerson(): PersonId | null { return this.personId; }
    status(personId: PersonId): LLMDecisionInfo { return this.controls(personId) ? { ...this.info } : this.blankInfo('simulation'); }
    debug(): { observation: LLMObservation | null; candidates: LLMActionCandidate[]; retrievedMemoryIds: string[]; memories: ReturnType<LLMMemoryStore['recentMemories']>; goals: ReturnType<LLMMemoryStore['activeGoals']>; decisions: LLMDecisionRecord[] } { return { observation: this.lastObservation, candidates: this.lastCandidates.map(item => ({ ...item })), retrievedMemoryIds: [...this.lastRetrievedMemoryIds], memories: this.memory.recentMemories(), goals: this.memory.activeGoals(), decisions: this.decisions.slice(-20).reverse() }; }

    propose(personId: PersonId, deps: BrainDeps, candidates: readonly LLMActionCandidate[]): ActionIntent | null {
        const person = deps.state.people[personId];
        const dead = !person || (person.deathTick !== null && person.deathTick <= deps.tick);
        if (!this.controls(personId) || !this.provider || !this.actionEngine || dead) { if (this.controls(personId) && dead) this.select(null); return null; }
        this.ingest(personId, deps);
        if (this.ready) return this.consumeReady(personId, deps, candidates);
        if (this.inFlight !== null || deps.tick < this.cooldownUntil || candidates.length === 0) { this.info = { ...this.info, status: this.inFlight !== null ? 'thinking' : (this.info.error ? 'backoff' : 'cooldown') }; return null; }
        this.request(personId, deps, candidates); return null;
    }

    noteResolution(personId: PersonId, actionId: string, stage: 'action_started' | 'action_blocked' | 'superseded_by_mandatory', result?: string): void {
        if (!this.controls(personId)) return;
        const record = [...this.decisions].reverse().find(item => item.actionId === actionId && ['queued', 'won_arbitration'].includes(item.stage));
        if (record) { record.stage = stage; record.result = result; this.info = { ...this.info, status: stage === 'action_started' ? 'acting' : 'idle', lifecycle: stage, error: stage === 'action_blocked' ? result ?? 'blocked' : this.info.error }; }
    }

    serialize(): LLMPersistentState { return this.memory.serialize(this.personId, this.decisions.slice(-80)); }
    loadState(state: LLMPersistentState | undefined, validPeople?: Set<PersonId>): void { this.generation += 1; this.inFlight = null; this.ready = null; this.memory.load(state); this.decisions = state?.decisions?.slice(-80).map(item => ({ ...item, params: { ...item.params } })) ?? []; const selected = state?.selectedPersonId ?? null; this.personId = selected && (!validPeople || validPeople.has(selected)) ? selected : null; this.info = this.blankInfo(this.personId ? 'llm' : 'simulation'); }

    private consumeReady(personId: PersonId, deps: BrainDeps, current: readonly LLMActionCandidate[]): ActionIntent | null {
        const ready = this.ready!; this.ready = null;
        const currentCandidate = current.find(candidate => candidate.actionId === ready.decision.actionId);
        const currentFingerprint = this.fingerprint(personId, deps, current);
        if (ready.generation !== this.generation || ready.personId !== personId || deps.tick - ready.requestedTick > this.config.maxStaleTicks || ready.fingerprint !== currentFingerprint || (ready.decision.actionId !== '__wait__' && (!currentCandidate || !validateLLMParameters(currentCandidate, ready.decision.params)))) {
            this.record(deps.tick, ready.decision, 'rejected_stale', ready.latencyMs, 'context changed'); this.info = { ...this.info, status: 'error', lifecycle: 'rejected_stale', error: '状況が変化したため提案を破棄しました' }; return null;
        }
        this.memory.applyGoalUpdates(ready.decision.goalUpdates, deps.tick);
        this.cooldownUntil = deps.tick + this.config.decisionCooldownTicks;
        if (ready.decision.actionId === '__wait__') { this.record(deps.tick, ready.decision, 'waited', ready.latencyMs); this.info = { ...this.info, status: 'cooldown', lifecycle: 'waited', lastAction: '__wait__', reason: ready.decision.reason, latencyMs: ready.latencyMs }; return null; }
        this.record(deps.tick, ready.decision, 'queued', ready.latencyMs);
        this.info = { ...this.info, status: 'queued', lifecycle: 'queued', lastAction: ready.decision.actionId, reason: ready.decision.reason.slice(0, 240), latencyMs: ready.latencyMs, error: null, responseChars: ready.responseChars };
        return { actionId: ready.decision.actionId, params: ready.decision.params, sourceHook: 'llmOptionalChoice', priority: 10, necessity: 'optional', band: 'fallback', mayInterrupt: false, causationId: null };
    }

    private request(personId: PersonId, deps: BrainDeps, candidates: readonly LLMActionCandidate[]): void {
        const generation = this.generation; const requestId = ++this.requestSeq; const started = performance.now();
        const location = deps.ctx.world ? locationKey(deps.ctx.world.locationOf(personId)) : '';
        const nearby = deps.ctx.world?.peopleAt(deps.ctx.world.locationOf(personId)).filter(id => id !== personId) ?? [];
        const terms = candidates.slice(0, 8).flatMap(candidate => [candidate.actionId, candidate.category]);
        const memories = this.memory.retrieve(nearby, location, terms, deps.tick, this.config.maxMemories);
        const observation = buildLLMObservation(personId, deps, this.actionEngine!, [...candidates], memories, this.memory.activeGoals(), this.memory.summary(), this.config.maxNearbyPeople, this.config.maxRecentEvents);
        const prompt = JSON.stringify(observation); const fingerprint = this.fingerprint(personId, deps, candidates);
        this.lastObservation = observation; this.lastCandidates = [...candidates]; this.lastRetrievedMemoryIds = memories.map(memory => memory.id); this.inFlight = requestId;
        this.info = { ...this.info, status: 'thinking', lifecycle: 'requested', error: null, promptChars: prompt.length };
        void this.provider!.complete(SYSTEM_PROMPT, prompt).then(raw => {
            if (this.generation !== generation || this.personId !== personId || this.inFlight !== requestId) return;
            this.info = { ...this.info, lifecycle: 'received', responseChars: raw.length };
            const parsed = JSON.parse(raw) as Partial<LLMDecision>;
            const params = parsed.params ?? {};
            const candidate = candidates.find(item => item.actionId === parsed.actionId);
            if (typeof parsed.actionId !== 'string' || typeof parsed.reason !== 'string' || typeof params !== 'object' || Array.isArray(params) || (parsed.actionId !== '__wait__' && (!candidate || !validateLLMParameters(candidate, params)))) throw new Error('invalid proposal');
            const decision: LLMDecision = { actionId: parsed.actionId, params, reason: parsed.reason.slice(0, 240), ...(parsed.goalUpdates ? { goalUpdates: parsed.goalUpdates } : {}), ...(parsed.plan ? { plan: parsed.plan.slice(0, 3) } : {}) };
            this.failures = 0; this.ready = { decision, requestId, generation, personId, requestedTick: deps.tick, fingerprint, candidates: [...candidates], latencyMs: Math.round(performance.now() - started), responseChars: raw.length }; this.info = { ...this.info, status: 'idle', lifecycle: 'validated' };
        }).catch(error => { if (this.generation !== generation || this.personId !== personId) return; this.failures += 1; this.cooldownUntil = deps.tick + Math.min(48, 2 ** this.failures); this.info = { ...this.info, status: 'backoff', lifecycle: 'rejected_invalid', error: error instanceof Error ? error.message : 'request failed' }; }).finally(() => { if (this.inFlight === requestId) this.inFlight = null; });
    }

    private ingest(personId: PersonId, deps: BrainDeps): void { const location = deps.ctx.world ? locationKey(deps.ctx.world.locationOf(personId)) : ''; const logs = deps.eventEngine.getPersonLog(personId); this.memory.ingest(personId, logs.slice(-20), location, deps.tick, this.config.reflectionIntervalTicks); const latest = logs[logs.length - 1]; if (latest?.kind === 'action') { const record = [...this.decisions].reverse().find(item => item.actionId === latest.defId && !['action_completed', 'action_failed', 'action_blocked', 'action_interrupted'].includes(item.stage)); if (record && ['completed', 'failed', 'blocked', 'interrupted', 'performed'].includes(latest.lifecycle)) { record.stage = latest.lifecycle === 'performed' || latest.lifecycle === 'completed' ? 'action_completed' : `action_${latest.lifecycle}` as LLMDecisionRecord['stage']; record.result = latest.failureReason; this.info = { ...this.info, lifecycle: record.stage, status: 'idle' }; } } }
    private fingerprint(personId: PersonId, deps: BrainDeps, candidates: readonly LLMActionCandidate[]): string { const location = deps.ctx.world ? locationKey(deps.ctx.world.locationOf(personId)) : ''; const active = this.actionEngine?.activeInstanceOf(personId)?.defId ?? ''; const targets = candidates.flatMap(candidate => candidate.parameters.flatMap(parameter => parameter.allowedValues.map(String))).sort(); return JSON.stringify([this.generation, personId, location, active, candidates.map(item => item.actionId), targets]); }
    private record(tick: number, decision: LLMDecision, stage: LLMDecisionRecord['stage'], latencyMs?: number, result?: string): void { this.decisions.push({ id: `d${this.requestSeq}-${tick}`, tick, actionId: decision.actionId, params: { ...decision.params }, reason: decision.reason, stage, ...(latencyMs === undefined ? {} : { latencyMs }), ...(result ? { result } : {}) }); this.decisions = this.decisions.slice(-80); console.info('[TownBox LLM]', this.decisions[this.decisions.length - 1]); }
    private blankInfo(controller: 'simulation' | 'llm'): LLMDecisionInfo { return { controller, status: 'idle', model: controller === 'llm' ? this.provider?.model ?? null : null, lastAction: null, reason: null, latencyMs: null, error: null, lifecycle: null, promptChars: null, responseChars: null }; }
}
