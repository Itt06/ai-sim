import http from 'node:http';

const port = Number(process.env.TOWNBOX_LLM_BRIDGE_PORT ?? 8787);
const upstream = (process.env.TOWNBOX_LLM_BASE_URL ?? 'http://127.0.0.1:11434/v1').replace(/\/$/, '');
const key = process.env.TOWNBOX_LLM_API_KEY;
http.createServer(async (req, res) => {
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('access-control-allow-headers', 'content-type, authorization');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  if (req.method !== 'POST' || req.url !== '/v1/chat/completions') { res.writeHead(404); res.end('not found'); return; }
  try {
    const chunks = []; for await (const chunk of req) chunks.push(chunk);
    const response = await fetch(`${upstream}/chat/completions`, { method: 'POST', headers: { 'content-type': 'application/json', ...(key ? { authorization: `Bearer ${key}` } : {}) }, body: Buffer.concat(chunks) });
    res.writeHead(response.status, { 'content-type': response.headers.get('content-type') ?? 'application/json' });
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) { res.writeHead(502, { 'content-type': 'application/json' }); res.end(JSON.stringify({ error: String(error) })); }
}).listen(port, '127.0.0.1', () => console.log(`TownBox LLM bridge: http://127.0.0.1:${port}/v1 -> ${upstream}`));
