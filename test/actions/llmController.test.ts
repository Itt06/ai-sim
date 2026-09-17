import { BrainDeps, OptionalActionCandidate } from 'game/actions/Brain';
import EventEngine from 'game/events/EventEngine';
import BootstrapWorld from 'game/execution/BootstrapWorld';
import LLMController from 'game/llm/LLMController';
import { LLMProvider } from 'game/llm/OpenAICompatibleProvider';
import { Genders } from 'types/Social';

const candidates: OptionalActionCandidate[] = [{ actionId: 'read_book', label: 'Read a book' }];
const deps = (tick: number): BrainDeps => ({
    state: { worldSeed: 1, drawSeed: 1, placedIds: [], nextSeq: 2, lastSimulatedYear: 0, people: {
        p1: { id: 'p1', firstName: 'A', familyName: 'B', gender: Genders.Female, birthTick: -100, deathTick: null, fatherId: null, motherId: null, partnerships: [] },
    } },
    tick, ticksPerYear: 365, ctx: { mode: 'bootstrap', world: new BootstrapWorld() }, eventEngine: new EventEngine(), inventory: null,
});
const settle = async (): Promise<void> => { await Promise.resolve(); await Promise.resolve(); };

describe('LLM optional controller', () => {
    test('controls exactly the selected person and accepts only candidate IDs', async () => {
        const provider: LLMProvider = { model: 'fake', complete: async () => JSON.stringify({ actionId: 'read_book', params: {}, reason: '静かに過ごしたい' }) };
        const controller = new LLMController(provider);
        controller.select('p1');
        expect(controller.controls('p1')).toBe(true);
        expect(controller.controls('p2')).toBe(false);
        expect(controller.propose('p1', deps(10), candidates)).toBeNull();
        await settle();
        expect(controller.propose('p1', deps(11), candidates)?.actionId).toBe('read_book');
    });

    test('malformed or invented proposals enter backoff without an action', async () => {
        const provider: LLMProvider = { model: 'fake', complete: async () => JSON.stringify({ actionId: 'delete_world', reason: 'no' }) };
        const controller = new LLMController(provider);
        controller.select('p1');
        expect(controller.propose('p1', deps(10), candidates)).toBeNull();
        await settle();
        expect(controller.propose('p1', deps(11), candidates)).toBeNull();
        expect(controller.status('p1').status).toBe('backoff');
    });

    test('revalidates a response against the current candidate list', async () => {
        const provider: LLMProvider = { model: 'fake', complete: async () => JSON.stringify({ actionId: 'read_book', params: {}, reason: '読む' }) };
        const controller = new LLMController(provider);
        controller.select('p1');
        controller.propose('p1', deps(10), candidates);
        await settle();
        expect(controller.propose('p1', deps(11), [])).toBeNull();
    });
});
