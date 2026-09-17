import ActionEngine from 'game/actions/ActionEngine';
import { BrainDeps } from 'game/actions/Brain';
import { LLMActionCandidate } from 'game/llm/LLMDecisionTypes';
import { ActionDefinition, ActionParameterSpec } from 'types/Action';
import { PersonId } from 'types/Genealogy';
import { Value } from 'types/Simulation';
import { NEED_IDS } from 'types/Needs';
import { evaluatePredicateCached } from 'util/predicate';
import { hashStringToSeed, SeededRandom } from 'util/random';

function valuesFor(spec: ActionParameterSpec, personId: PersonId, deps: BrainDeps): Value[] {
    const world = deps.ctx.world;
    const inventory = deps.inventory;
    if (spec.type === 'person' && world) return world.peopleAt(world.locationOf(personId)).filter(id => id !== personId).sort();
    if ((spec.type === 'objectArchetype' || spec.type === 'objectInstance') && inventory) {
        const nearbyIds = world ? world.objectsAt(world.objectLocationOf(personId)) : [];
        const objects = [...inventory.carriedInstances(personId), ...nearbyIds.map(id => inventory.getInstance(id)).filter((item): item is NonNullable<typeof item> => !!item)];
        return [...new Set(objects.map(item => spec.type === 'objectInstance' ? item.id : item.archetypeId))].sort();
    }
    if (spec.type === 'boolean') return [true, false];
    return [];
}

function baseScore(def: ActionDefinition, personId: PersonId, deps: BrainDeps): number {
    let score = (def.selection?.weight ?? 1) * 10;
    if (def.location && deps.ctx.world) {
        const here = deps.ctx.world.locationOf(personId);
        if (def.location === here.kind || (def.location === 'home' && here.kind === 'home')) score += 20;
    }
    if (def.category === 'social' && deps.ctx.world && deps.ctx.world.peopleAt(deps.ctx.world.locationOf(personId)).length > 1) score += 18;
    if (def.satisfies && deps.ctx.markets?.needs) {
        const levels = Object.fromEntries(NEED_IDS.map(need => [need, deps.ctx.markets!.needs!.levelOf(personId, need, deps.tick, deps.state.worldSeed)]));
        for (const [need, amount] of Object.entries(def.satisfies)) score += Math.max(0, 100 - (levels[need as keyof typeof levels] ?? 100)) * Number(amount) / 100;
    }
    if (def.selection?.cooldownTicks && deps.tick >= 0) score -= 2;
    return score;
}

export function buildLLMActionCandidates(personId: PersonId, deps: BrainDeps, engine: ActionEngine, limit: number): LLMActionCandidate[] {
    const context = engine.contextFor(personId, deps);
    const all: LLMActionCandidate[] = [];
    for (const [actionId, def] of Object.entries(engine.getManifest()).sort(([a], [b]) => a.localeCompare(b))) {
        if (def.category === 'work' || def.category === 'obligation' || def.category === 'movement') continue;
        if (def.type !== 'continuous' && def.category !== 'social' && !['grab', 'put_down', 'discard_object', 'use_object'].includes(actionId)) continue;
        if ((def.selection?.weight ?? 1) <= 0 && def.category !== 'social' && !['grab', 'put_down', 'discard_object', 'use_object'].includes(actionId)) continue;
        if (typeof def.location === 'string' && def.location.startsWith('venue:') && deps.ctx.world && !deps.ctx.world.hasVenue(def.location.slice(6))) continue;
        if (def.selection?.cooldownTicks !== undefined && engine.hasAction(personId, actionId, deps.tick, { withinTicks: def.selection.cooldownTicks })) continue;
        const parameterEntries = Object.entries(def.parameters ?? {});
        if (def.requirements && parameterEntries.length === 0 && !evaluatePredicateCached(def.requirements, context)) continue;
        const parameters = parameterEntries.map(([name, spec]) => ({
            name, type: spec.type, required: spec.required === true,
            allowedValues: valuesFor(spec, personId, deps).filter(value => !def.requirements || parameterEntries.length > 1 || evaluatePredicateCached(def.requirements, engine.contextFor(personId, deps, { [name]: value }))),
        }));
        if (parameters.some(parameter => parameter.required && parameter.allowedValues.length === 0)) continue;
        all.push({ actionId, label: def.label, category: def.category, score: baseScore(def, personId, deps), parameters });
    }
    all.sort((a, b) => b.score - a.score || a.actionId.localeCompare(b.actionId));
    if (all.length <= limit) return all;
    const must = all.filter(candidate => candidate.category === 'social' || candidate.parameters.length > 0).slice(0, Math.min(6, limit));
    const chosen = new Map(must.map(candidate => [candidate.actionId, candidate]));
    for (const candidate of all) { if (chosen.size >= Math.max(0, limit - 2)) break; chosen.set(candidate.actionId, candidate); }
    const remaining = all.filter(candidate => !chosen.has(candidate.actionId));
    const rng = new SeededRandom(deps.state.worldSeed).fork(deps.tick).fork(hashStringToSeed(personId)).fork(0x11aa);
    while (chosen.size < limit && remaining.length) {
        const candidate = remaining.splice(Math.floor(rng.next() * remaining.length), 1)[0]!;
        chosen.set(candidate.actionId, candidate);
    }
    return [...chosen.values()].sort((a, b) => b.score - a.score || a.actionId.localeCompare(b.actionId)).slice(0, limit);
}

export function validateLLMParameters(candidate: LLMActionCandidate, params: Record<string, Value>): boolean {
    const schema = new Map(candidate.parameters.map(parameter => [parameter.name, parameter]));
    if (Object.keys(params).some(name => !schema.has(name))) return false;
    return candidate.parameters.every(parameter => {
        const value = params[parameter.name];
        if (value === undefined) return !parameter.required;
        return parameter.allowedValues.some(allowed => allowed === value);
    });
}
