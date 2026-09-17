export interface LLMProviderConfig { baseUrl: string; model: string; apiKey?: string; temperature?: number; timeoutMs?: number; }
export interface LLMProvider { readonly model: string; complete(system: string, user: string): Promise<string>; }

export default class OpenAICompatibleProvider implements LLMProvider {
    public readonly model: string;
    constructor(private readonly config: LLMProviderConfig) { this.model = config.model; }
    async complete(system: string, user: string): Promise<string> {
        const abort = new AbortController();
        const timer = window.setTimeout(() => abort.abort(), this.config.timeoutMs ?? 15000);
        try {
            const response = await fetch(`${this.config.baseUrl.replace(/\/$/, '')}/chat/completions`, {
                method: 'POST', headers: { 'content-type': 'application/json', ...(this.config.apiKey ? { authorization: `Bearer ${this.config.apiKey}` } : {}) },
                body: JSON.stringify({ model: this.config.model, temperature: this.config.temperature ?? 0.2, messages: [{ role: 'system', content: system }, { role: 'user', content: user }], response_format: { type: 'json_object' } }), signal: abort.signal,
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const body = await response.json() as { choices?: { message?: { content?: string } }[] };
            const content = body.choices?.[0]?.message?.content;
            if (!content) throw new Error('empty response');
            return content;
        } finally { window.clearTimeout(timer); }
    }
}
