import ActionEngine from 'game/actions/ActionEngine';
import { BrainDeps } from 'game/actions/Brain';
import { LLMActionCandidate, EpisodicMemory, AgentGoal } from 'game/llm/LLMDecisionTypes';
import { PersonId } from 'types/Genealogy';
import { NEED_IDS } from 'types/Needs';
import { locationKey } from 'types/Objects';

export interface LLMObservation {
    tick: number; time: { hour: number; day: number }; self: unknown; needs: unknown; mood: number | null; traits: unknown;
    health: unknown; economy: unknown; employment: unknown; school: unknown; household: unknown; agenda: unknown; currentActivity: unknown;
    immediateEnvironment: unknown; knownPeople: unknown; recentEvents: unknown[]; relevantMemories: EpisodicMemory[];
    goals: AgentGoal[]; selfSummary: string; availableActions: LLMActionCandidate[];
}

export function buildLLMObservation(personId: PersonId, deps: BrainDeps, engine: ActionEngine, candidates: LLMActionCandidate[], memories: EpisodicMemory[], goals: AgentGoal[], selfSummary: string, maxNearby: number, maxRecentEvents: number): LLMObservation {
    const person = deps.state.people[personId];
    const world = deps.ctx.world;
    const location = world?.locationOf(personId) ?? null;
    const nearbyIds = location ? world?.peopleAt(location).filter(id => id !== personId).sort().slice(0, maxNearby) ?? [] : [];
    const nearbyPeople = nearbyIds.map(id => { const record = deps.state.people[id]; return { id, name: record ? `${record.firstName} ${record.familyName}` : id, relationship: deps.ctx.markets?.social?.edgeBetween(personId, id, deps.tick) ?? null }; });
    const inventory = deps.inventory?.carriedInstances(personId).slice(0, 16).map(item => ({ id: item.id, archetypeId: item.archetypeId, quantity: item.quantity })) ?? [];
    const nearbyObjects = world && deps.inventory ? world.objectsAt(world.objectLocationOf(personId)).slice(0, 16).map(id => deps.inventory!.getInstance(id)).filter((item): item is NonNullable<typeof item> => !!item).map(item => ({ id: item.id, archetypeId: item.archetypeId })) : [];
    const needs = deps.ctx.markets?.needs ? Object.fromEntries(NEED_IDS.map(need => [need, Math.round(deps.ctx.markets!.needs!.levelOf(personId, need, deps.tick, deps.state.worldSeed))])) : null;
    const context = engine.contextFor(personId, deps);
    const active = engine.activeInstanceOf(personId);
    const knownFacts = deps.ctx.markets?.knownFacts?.factsOf(personId, deps.tick).slice(-12).map(fact => ({ aboutId: fact.aboutId, eventId: fact.eventId, valence: fact.valence, learnedAtTick: fact.learnedAtTick })) ?? [];
    const recentEvents = deps.eventEngine.getPersonLog(personId).slice(-maxRecentEvents).map(entry => ({ tick: entry.tick, kind: entry.kind, id: entry.defId, ...(entry.kind === 'action' ? { lifecycle: entry.lifecycle } : {}) }));
    const agenda = deps.ctx.markets?.agenda?.dueEntriesOf(personId, deps.tick, (actionId, query) => engine.hasAction(personId, actionId, deps.tick, query)).slice(0, 6).map(entry => ({ actionId: entry.actionId, earliestTick: entry.earliestTick, latestTick: entry.latestTick })) ?? [];
    return {
        tick: deps.tick, time: { hour: ((deps.tick % 24) + 24) % 24, day: Math.floor(deps.tick / 24) },
        self: person ? { id: person.id, name: `${person.firstName} ${person.familyName}`, age: Math.max(0, Math.floor((deps.tick - person.birthTick) / deps.ticksPerYear)), gender: person.gender, location } : { id: personId },
        needs, mood: deps.ctx.markets?.mood?.moodOf(personId, deps.tick) ?? null, traits: deps.ctx.markets?.traits?.traitsOf(personId) ?? null,
        health: context.getAttr('health') ?? null, economy: { balance: deps.ctx.markets?.ledger?.getPersonBalance(personId) ?? null },
        employment: deps.jobOf?.(personId) ?? null, school: deps.schoolOf?.(personId) ?? null, household: deps.householdOf?.(personId) ?? null, agenda,
        currentActivity: active ? { actionId: active.defId, status: active.status, sinceTick: active.startedTick } : null,
        immediateEnvironment: { locationKey: location ? locationKey(location) : null, nearbyPeople, nearbyObjects, inventory },
        knownPeople: { relationships: deps.ctx.markets?.social?.edgesOf(personId, deps.tick).slice(0, 16) ?? [], facts: knownFacts },
        recentEvents, relevantMemories: memories, goals, selfSummary, availableActions: candidates,
    };
}
