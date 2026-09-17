export interface LLMProviderConfig { baseUrl: string; model: string; apiKey?: string; temperature?: number; timeoutMs?: number; jsonMode?: boolean; }
export interface LLMProvider { readonly model: string; complete(system: string, user: string): Promise<string>; }

export default class OpenAICompatibleProvider implements LLMProvider {
    public readonly model: string;
    constructor(private readonly config: LLMProviderConfig) { this.model = config.model; }
    async complete(system: string, user: string): Promise<string> {
        const abort = new AbortController();
        const timer = globalThis.setTimeout(() => abort.abort(), this.config.timeoutMs ?? 15000);
        try {
            const send = (jsonMode: boolean): Promise<Response> => fetch(`${this.config.baseUrl.replace(/\/$/, '')}/chat/completions`, {
                method: 'POST', headers: { 'content-type': 'application/json', ...(this.config.apiKey ? { authorization: `Bearer ${this.config.apiKey}` } : {}) },
                body: JSON.stringify({ model: this.config.model, temperature: this.config.temperature ?? 0.2, messages: [{ role: 'system', content: system }, { role: 'user', content: user }], ...(jsonMode ? { response_format: { type: 'json_object' } } : {}) }), signal: abort.signal,
            });
            let response = await send(this.config.jsonMode !== false);
            if (!response.ok && this.config.jsonMode !== false && [400, 404, 422].includes(response.status)) response = await send(false);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const body = await response.json() as { choices?: { message?: { content?: string } }[] };
            const content = body.choices?.[0]?.message?.content;
            if (!content) throw new Error('empty response');
            return content;
        } finally { globalThis.clearTimeout(timer); }
    }
}
