import { ActionIntent, BrainDeps, OptionalActionCandidate, OptionalDecisionController } from 'game/actions/Brain';
import { LLMProvider } from 'game/llm/OpenAICompatibleProvider';
import { PersonId } from 'types/Genealogy';

export type LLMStatus = 'idle' | 'thinking' | 'acting' | 'cooldown' | 'error' | 'backoff';
export interface LLMDecisionInfo { controller: 'simulation' | 'llm'; status: LLMStatus; model: string | null; lastAction: string | null; reason: string | null; latencyMs: number | null; error: string | null; }
interface Proposal { actionId: string; params?: Record<string, string | number | boolean>; reason: string }
const SYSTEM_PROMPT = 'Choose one optional action for one simulated person. Use only supplied facts and candidate action IDs. Return strict JSON only: {"actionId":"...","params":{},"reason":"brief public rationale"}. Never invent IDs or request direct movement.';

export default class LLMController implements OptionalDecisionController {
    private personId: PersonId | null = null;
    private pending = false;
    private ready: { proposal: Proposal; requestedTick: number; candidates: Set<string>; latencyMs: number } | null = null;
    private cooldownUntil = 0;
    private failures = 0;
    private info: LLMDecisionInfo = { controller: 'simulation', status: 'idle', model: null, lastAction: null, reason: null, latencyMs: null, error: null };
    constructor(private readonly provider: LLMProvider | null) {}
    select(personId: PersonId | null): void { this.personId = personId; this.pending = false; this.ready = null; this.failures = 0; this.info = { controller: personId ? 'llm' : 'simulation', status: 'idle', model: this.provider?.model ?? null, lastAction: null, reason: null, latencyMs: null, error: null }; }
    controls(personId: PersonId): boolean { return this.personId === personId; }
    selectedPerson(): PersonId | null { return this.personId; }
    status(personId: PersonId): LLMDecisionInfo { return this.controls(personId) ? { ...this.info } : { controller: 'simulation', status: 'idle', model: null, lastAction: null, reason: null, latencyMs: null, error: null }; }
    propose(personId: PersonId, deps: BrainDeps, candidates: readonly OptionalActionCandidate[]): ActionIntent | null {
        if (!this.controls(personId) || !this.provider) return null;
        if (this.ready) {
            const ready = this.ready; this.ready = null;
            const currentCandidates = new Set(candidates.map(candidate => candidate.actionId));
            if (deps.tick - ready.requestedTick > 24 || !ready.candidates.has(ready.proposal.actionId) || !currentCandidates.has(ready.proposal.actionId)) { this.info = { ...this.info, status: 'error', error: '古い、または無効な提案を破棄しました' }; return null; }
            this.cooldownUntil = deps.tick + 2;
            this.info = { ...this.info, status: 'acting', lastAction: ready.proposal.actionId, reason: ready.proposal.reason.slice(0, 240), latencyMs: ready.latencyMs, error: null };
            this.log(deps.tick, personId, ready.proposal, ready.latencyMs, 'accepted');
            return { actionId: ready.proposal.actionId, params: ready.proposal.params ?? {}, sourceHook: 'llmOptionalChoice', priority: 10, necessity: 'optional', band: 'fallback', mayInterrupt: false, causationId: null };
        }
        if (candidates.length === 0) return null;
        if (this.pending || deps.tick < this.cooldownUntil) {
            this.info = { ...this.info, status: this.pending ? 'thinking' : (this.info.error ? 'backoff' : 'cooldown') };
            return null;
        }
        this.request(personId, deps, candidates); return null;
    }
    private request(personId: PersonId, deps: BrainDeps, candidates: readonly OptionalActionCandidate[]): void {
        this.pending = true; this.info = { ...this.info, status: 'thinking', error: null }; const started = performance.now();
        const person = deps.state.people[personId]; const location = deps.ctx.world?.locationOf(personId) ?? null;
        const nearby = location ? deps.ctx.world?.peopleAt(location).filter(id => id !== personId).slice(0, 8) ?? [] : [];
        const observation = { tick: deps.tick, self: person ? { id: person.id, name: `${person.firstName} ${person.familyName}`, gender: person.gender } : { id: personId }, immediateEnvironment: { location, nearbyPeople: nearby }, candidates };
        const candidateSet = new Set(candidates.map(candidate => candidate.actionId));
        void this.provider!.complete(SYSTEM_PROMPT, JSON.stringify(observation)).then(raw => {
            const parsed = JSON.parse(raw) as Partial<Proposal>;
            if (typeof parsed.actionId !== 'string' || !candidateSet.has(parsed.actionId) || typeof parsed.reason !== 'string' || (parsed.params !== undefined && (typeof parsed.params !== 'object' || Array.isArray(parsed.params) || Object.keys(parsed.params).length > 0))) throw new Error('invalid proposal');
            this.failures = 0; this.ready = { proposal: { actionId: parsed.actionId, params: parsed.params ?? {}, reason: parsed.reason }, requestedTick: deps.tick, candidates: candidateSet, latencyMs: Math.round(performance.now() - started) }; this.info = { ...this.info, status: 'idle' };
        }).catch(error => { this.failures += 1; this.cooldownUntil = deps.tick + Math.min(48, 2 ** this.failures); this.info = { ...this.info, status: 'backoff', error: error instanceof Error ? error.message : String(error) }; this.log(deps.tick, personId, null, Math.round(performance.now() - started), 'failure'); }).finally(() => { this.pending = false; });
    }
    private log(tick: number, personId: PersonId, proposal: Proposal | null, latencyMs: number, outcome: string): void { console.info('[TownBox LLM]', { tick, personId, requestHash: `${personId}:${tick}`, actionId: proposal?.actionId ?? null, params: proposal?.params ?? {}, reason: proposal?.reason ?? null, model: this.provider?.model ?? null, latencyMs, outcome }); }
}
