import { BrainDeps } from 'game/actions/Brain';
import ActionEngine from 'game/actions/ActionEngine';
import { LLMActionCandidate } from 'game/llm/LLMDecisionTypes';
import { buildLLMActionCandidates, validateLLMParameters } from 'game/llm/LLMActionCandidates';
import LLMMemoryStore from 'game/llm/LLMMemoryStore';
import EventEngine from 'game/events/EventEngine';
import BootstrapWorld from 'game/execution/BootstrapWorld';
import LLMController from 'game/llm/LLMController';
import { LLMProvider } from 'game/llm/OpenAICompatibleProvider';
import { Genders } from 'types/Social';

const candidates: LLMActionCandidate[] = [{ actionId: 'read_book', label: 'Read a book', category: 'leisure', score: 1, parameters: [] }];
const deps = (tick: number): BrainDeps => ({
    state: { worldSeed: 1, drawSeed: 1, placedIds: [], nextSeq: 2, lastSimulatedYear: 0, people: {
        p1: { id: 'p1', firstName: 'A', familyName: 'B', gender: Genders.Female, birthTick: -100, deathTick: null, fatherId: null, motherId: null, partnerships: [] },
        p2: { id: 'p2', firstName: 'C', familyName: 'D', gender: Genders.Male, birthTick: -100, deathTick: null, fatherId: null, motherId: null, partnerships: [] },
    } },
    tick, ticksPerYear: 365, ctx: { mode: 'bootstrap', world: new BootstrapWorld() }, eventEngine: new EventEngine(), inventory: null,
});
const settle = async (): Promise<void> => { await Promise.resolve(); await Promise.resolve(); };
const attach = (controller: LLMController): LLMController => { controller.attachEngine(new ActionEngine()); return controller; };

describe('LLM optional controller', () => {
    test('controls exactly the selected person and accepts only candidate IDs', async () => {
        const provider: LLMProvider = { model: 'fake', complete: async () => JSON.stringify({ actionId: 'read_book', params: {}, reason: '静かに過ごしたい' }) };
        const controller = attach(new LLMController(provider));
        controller.select('p1');
        expect(controller.controls('p1')).toBe(true);
        expect(controller.controls('p2')).toBe(false);
        expect(controller.propose('p1', deps(10), candidates)).toBeNull();
        await settle();
        expect(controller.propose('p1', deps(11), candidates)?.actionId).toBe('read_book');
    });

    test('malformed or invented proposals enter backoff without an action', async () => {
        const provider: LLMProvider = { model: 'fake', complete: async () => JSON.stringify({ actionId: 'delete_world', reason: 'no' }) };
        const controller = attach(new LLMController(provider));
        controller.select('p1');
        expect(controller.propose('p1', deps(10), candidates)).toBeNull();
        await settle();
        expect(controller.propose('p1', deps(11), candidates)).toBeNull();
        expect(controller.status('p1').status).toBe('backoff');
    });

    test('revalidates a response against the current candidate list', async () => {
        const provider: LLMProvider = { model: 'fake', complete: async () => JSON.stringify({ actionId: 'read_book', params: {}, reason: '読む' }) };
        const controller = attach(new LLMController(provider));
        controller.select('p1');
        controller.propose('p1', deps(10), candidates);
        await settle();
        expect(controller.propose('p1', deps(11), [])).toBeNull();
    });

    test('switching residents invalidates the old in-flight response', async () => {
        let resolve!: (value: string) => void;
        const provider: LLMProvider = { model: 'fake', complete: () => new Promise(done => { resolve = done; }) };
        const controller = attach(new LLMController(provider));
        controller.select('p1'); controller.propose('p1', deps(10), candidates);
        controller.select('p2'); resolve(JSON.stringify({ actionId: 'read_book', params: {}, reason: 'old' })); await settle();
        expect(controller.propose('p1', deps(11), candidates)).toBeNull();
        expect(controller.selectedPerson()).toBe('p2');
    });

    test('parameter validation rejects arbitrary target ids', () => {
        const social: LLMActionCandidate = { actionId: 'talked_to_person', label: 'Talk', category: 'social', score: 1, parameters: [{ name: 'target', type: 'person', required: true, allowedValues: ['p2'] }] };
        expect(validateLLMParameters(social, { target: 'p2' })).toBe(true);
        expect(validateLLMParameters(social, { target: 'intruder' })).toBe(false);
    });

    test('candidate ranking exposes local social targets and deterministic exploration', () => {
        const engine = new ActionEngine(); const context = deps(20); const world = context.ctx.world as BootstrapWorld; world.register('p1'); world.register('p2');
        const first = buildLLMActionCandidates('p1', context, engine, 12); const again = buildLLMActionCandidates('p1', context, engine, 12);
        expect(again).toEqual(first);
        expect(first.some(candidate => candidate.parameters.some(parameter => parameter.type === 'person' && parameter.allowedValues.includes('p2')))).toBe(true);
        const sets = [20, 21, 22, 23].map(tick => { const next = { ...context, tick }; return buildLLMActionCandidates('p1', next, engine, 12).map(item => item.actionId).join(','); });
        expect(new Set(sets).size).toBeGreaterThan(1);
    });

    test('subjective memory retrieval and persistence remain bounded and separate', () => {
        const store = new LLMMemoryStore();
        store.ingest('p1', [{ seq: 1, tick: 10, kind: 'event', defId: 'got_a_job', roles: {}, triggerSource: 'system', causationId: null, params: { target: 'p2' } }], 'home', 10);
        store.applyGoalUpdates({ add: ['Keep the new job'] }, 10);
        expect(store.retrieve(['p2'], 'home', ['job'], 11, 2)[0]?.type).toBe('event:got_a_job');
        const state = store.serialize('p1', []); const restored = new LLMMemoryStore(); restored.load(state);
        expect(restored.activeGoals()[0]?.description).toBe('Keep the new job');
        expect(restored.recentMemories()[0]?.sourceEventSeq).toBe(1);
    });

    test('controller selection round-trips without transient requests', () => {
        const controller = attach(new LLMController(null)); controller.select('p1');
        const restored = attach(new LLMController(null)); restored.loadState(controller.serialize(), new Set(['p1']));
        expect(restored.selectedPerson()).toBe('p1'); expect(restored.status('p1').status).toBe('idle');
        restored.loadState(controller.serialize(), new Set(['p2'])); expect(restored.selectedPerson()).toBeNull();
    });
});
