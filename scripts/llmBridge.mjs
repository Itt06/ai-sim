import http from 'node:http';
import { pathToFileURL } from 'node:url';

const DEFAULT_ORIGINS = [1234, 3000, 4599].flatMap(port => [`http://127.0.0.1:${port}`, `http://localhost:${port}`]);
export function bridgeConfig(env = process.env) {
  return {
    port: Number(env.TOWNBOX_LLM_BRIDGE_PORT ?? 8787),
    upstream: (env.TOWNBOX_LLM_BASE_URL ?? 'http://127.0.0.1:11434/v1').replace(/\/$/, ''),
    key: env.TOWNBOX_LLM_API_KEY,
    allowedOrigins: new Set((env.TOWNBOX_LLM_ALLOWED_ORIGINS?.split(',').map(value => value.trim()).filter(Boolean) ?? DEFAULT_ORIGINS)),
    maxBodyBytes: Number(env.TOWNBOX_LLM_MAX_BODY_BYTES ?? 262144),
    allowNoOrigin: env.TOWNBOX_LLM_ALLOW_NO_ORIGIN === '1',
  };
}

function json(res, status, body, origin) {
  if (origin) res.setHeader('access-control-allow-origin', origin);
  res.setHeader('vary', 'Origin'); res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(body));
}

export function createBridgeServer(config = bridgeConfig()) {
  return http.createServer(async (req, res) => {
    const origin = req.headers.origin;
    if ((!origin && !config.allowNoOrigin) || (origin && !config.allowedOrigins.has(origin))) { json(res, 403, { error: 'origin not allowed' }); return; }
    if (origin) { res.setHeader('access-control-allow-origin', origin); res.setHeader('access-control-allow-headers', 'content-type'); res.setHeader('access-control-allow-methods', 'POST, OPTIONS'); res.setHeader('vary', 'Origin'); }
    if (req.method === 'OPTIONS') { if (req.url !== '/v1/chat/completions') { json(res, 404, { error: 'not found' }, origin); return; } res.writeHead(204); res.end(); return; }
    if (req.method !== 'POST' || req.url !== '/v1/chat/completions') { json(res, 404, { error: 'not found' }, origin); return; }
    if (!String(req.headers['content-type'] ?? '').toLowerCase().startsWith('application/json')) { json(res, 415, { error: 'application/json required' }, origin); return; }
    try {
      const chunks = []; let size = 0;
      for await (const chunk of req) { size += chunk.length; if (size > config.maxBodyBytes) { json(res, 413, { error: 'request too large' }, origin); req.resume(); return; } chunks.push(chunk); }
      const body = Buffer.concat(chunks); JSON.parse(body.toString('utf8'));
      const response = await fetch(`${config.upstream}/chat/completions`, { method: 'POST', headers: { 'content-type': 'application/json', ...(config.key ? { authorization: `Bearer ${config.key}` } : {}) }, body });
      const responseBody = Buffer.from(await response.arrayBuffer());
      res.writeHead(response.status, { 'content-type': response.headers.get('content-type')?.startsWith('application/json') ? 'application/json' : 'application/json' });
      res.end(response.headers.get('content-type')?.startsWith('application/json') ? responseBody : JSON.stringify({ error: 'upstream returned an unsupported response' }));
    } catch (error) { json(res, 502, { error: error instanceof SyntaxError ? 'invalid JSON' : 'upstream request failed' }, origin); }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const config = bridgeConfig();
  createBridgeServer(config).listen(config.port, '127.0.0.1', () => console.log(`TownBox LLM bridge listening on http://127.0.0.1:${config.port}/v1`));
}
