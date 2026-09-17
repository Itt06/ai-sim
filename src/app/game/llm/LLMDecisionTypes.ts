import { ActionParameterType } from 'types/Action';
import { PersonId } from 'types/Genealogy';
import { Value } from 'types/Simulation';

export interface LLMActionParameter { name: string; type: ActionParameterType; required: boolean; allowedValues: Value[]; }
export interface LLMActionCandidate { actionId: string; label: string; category: string; score: number; parameters: LLMActionParameter[]; }
export interface LLMDecision { actionId: string; params: Record<string, Value>; reason: string; goalUpdates?: { add?: string[]; complete?: string[] }; plan?: { actionId: string; params?: Record<string, Value> }[]; }
export type LLMDecisionStage = 'requested' | 'received' | 'validated' | 'queued' | 'won_arbitration' | 'action_started' | 'action_completed' | 'action_failed' | 'action_blocked' | 'action_interrupted' | 'rejected_stale' | 'rejected_invalid' | 'superseded_by_mandatory' | 'waited';
export interface LLMDecisionRecord { id: string; tick: number; actionId: string; params: Record<string, Value>; reason: string; stage: LLMDecisionStage; result?: string; latencyMs?: number; }
export interface EpisodicMemory { id: string; tick: number; type: string; people: PersonId[]; locations: string[]; summary: string; salience: number; sourceEventSeq?: number; }
export interface AgentGoal { id: string; description: string; createdTick: number; status: 'active' | 'completed' | 'abandoned'; priority: number; }
export interface LLMPersistentState { version: 1; selectedPersonId: PersonId | null; memories: EpisodicMemory[]; goals: AgentGoal[]; selfSummary: string; decisions: LLMDecisionRecord[]; nextSeq: number; }
export interface LLMRuntimeConfig { decisionCooldownTicks: number; candidateLimit: number; maxNearbyPeople: number; maxMemories: number; maxRecentEvents: number; maxStaleTicks: number; reflectionIntervalTicks: number; failureFallback: 'idle' | 'simulation'; }
export const DEFAULT_LLM_RUNTIME_CONFIG: LLMRuntimeConfig = { decisionCooldownTicks: 2, candidateLimit: 24, maxNearbyPeople: 8, maxMemories: 6, maxRecentEvents: 8, maxStaleTicks: 24, reflectionIntervalTicks: 24, failureFallback: 'idle' };
