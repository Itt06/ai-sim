import { AgentGoal, EpisodicMemory, LLMPersistentState } from 'game/llm/LLMDecisionTypes';
import { PersonId } from 'types/Genealogy';
import { PersonLogEntry } from 'types/LifeEvent';

export default class LLMMemoryStore {
    private memories: EpisodicMemory[] = [];
    private goals: AgentGoal[] = [];
    private selfSummary = '';
    private nextSeq = 0;
    private seenSeq = new Set<number>();

    ingest(personId: PersonId, entries: readonly PersonLogEntry[], location: string, tick: number, reflectionIntervalTicks = 24): void {
        for (const entry of entries) {
            if (this.seenSeq.has(entry.seq)) continue;
            this.seenSeq.add(entry.seq);
            const notable = entry.kind === 'event' || entry.lifecycle !== 'performed' || entry.defId.includes('work') || entry.defId.includes('arrest') || entry.defId.includes('married');
            if (!notable) continue;
            const people = Object.entries(entry.params ?? {}).filter(([key, value]) => ['target', 'person', 'about'].includes(key) && typeof value === 'string' && value !== personId).map(([, value]) => value as string);
            const lifecycle = entry.kind === 'action' ? entry.lifecycle : null;
            this.memories.push({ id: `m${this.nextSeq++}`, tick: entry.tick, type: `${entry.kind}:${entry.defId}`, people, locations: location ? [location] : [], summary: `${entry.defId.replace(/_/g, ' ')}${lifecycle && lifecycle !== 'performed' ? ` (${lifecycle})` : ''}`, salience: entry.kind === 'event' ? 3 : 2, sourceEventSeq: entry.seq });
        }
        this.memories = this.memories.sort((a, b) => b.salience - a.salience || b.tick - a.tick).slice(0, 120).sort((a, b) => a.tick - b.tick);
        if (reflectionIntervalTicks > 0 && tick % reflectionIntervalTicks === 0) this.consolidate();
    }

    retrieve(nearby: readonly PersonId[], location: string, terms: readonly string[], tick: number, limit: number): EpisodicMemory[] {
        const termSet = new Set(terms.map(term => term.toLowerCase()));
        return [...this.memories].map(memory => ({ memory, score: memory.salience * 10 + Math.max(0, 20 - (tick - memory.tick) / 24) + memory.people.filter(id => nearby.includes(id)).length * 15 + memory.locations.filter(value => value === location).length * 8 + [...termSet].filter(term => memory.summary.toLowerCase().includes(term)).length * 4 }))
            .sort((a, b) => b.score - a.score || b.memory.tick - a.memory.tick || a.memory.id.localeCompare(b.memory.id)).slice(0, limit).map(item => item.memory);
    }
    applyGoalUpdates(updates: { add?: string[]; complete?: string[] } | undefined, tick: number): void {
        for (const description of updates?.add?.slice(0, 3) ?? []) if (description.trim() && !this.goals.some(goal => goal.status === 'active' && goal.description === description.trim())) this.goals.push({ id: `g${this.nextSeq++}`, description: description.trim().slice(0, 160), createdTick: tick, status: 'active', priority: 50 });
        for (const id of updates?.complete ?? []) { const goal = this.goals.find(item => item.id === id); if (goal) goal.status = 'completed'; }
        this.goals = this.goals.slice(-12);
    }
    activeGoals(): AgentGoal[] { return this.goals.filter(goal => goal.status === 'active').slice(0, 5).map(goal => ({ ...goal })); }
    recentMemories(limit = 8): EpisodicMemory[] { return this.memories.slice(-limit).reverse().map(memory => ({ ...memory })); }
    summary(): string { return this.selfSummary; }
    private consolidate(): void { const important = [...this.memories].sort((a, b) => b.salience - a.salience || b.tick - a.tick).slice(0, 4); this.selfSummary = important.map(memory => memory.summary).join('; ').slice(0, 500); }
    serialize(selectedPersonId: PersonId | null, decisions: LLMPersistentState['decisions']): LLMPersistentState { return { version: 1, selectedPersonId, memories: this.memories.map(item => ({ ...item })), goals: this.goals.map(item => ({ ...item })), selfSummary: this.selfSummary, decisions: decisions.map(item => ({ ...item, params: { ...item.params } })), nextSeq: this.nextSeq }; }
    load(state: LLMPersistentState | undefined): void { this.memories = state?.memories?.map(item => ({ ...item })) ?? []; this.goals = state?.goals?.map(item => ({ ...item })) ?? []; this.selfSummary = state?.selfSummary ?? ''; this.nextSeq = state?.nextSeq ?? 0; this.seenSeq = new Set(this.memories.flatMap(item => item.sourceEventSeq === undefined ? [] : [item.sourceEventSeq])); }
}
