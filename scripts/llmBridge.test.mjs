import assert from 'node:assert/strict';
import { request } from 'node:http';
import test from 'node:test';
import { createBridgeServer } from './llmBridge.mjs';

function call(port, { origin, body = '{}', contentType = 'application/json' }) {
  return new Promise((resolve, reject) => {
    const req = request({ host: '127.0.0.1', port, path: '/v1/chat/completions', method: 'POST', headers: { origin, 'content-type': contentType, 'content-length': Buffer.byteLength(body) } }, res => { const chunks = []; res.on('data', chunk => chunks.push(chunk)); res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString() })); });
    req.on('error', reject); req.end(body);
  });
}

async function withServer(config, fn) {
  const server = createBridgeServer(config); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try { await fn(server.address().port); } finally { await new Promise(resolve => server.close(resolve)); }
}

test('bridge rejects disallowed origins', async () => withServer({ allowedOrigins: new Set(['http://localhost:3000']), maxBodyBytes: 100, allowNoOrigin: false, upstream: 'http://127.0.0.1:1', key: 'secret' }, async port => {
  const response = await call(port, { origin: 'https://evil.example' }); assert.equal(response.status, 403); assert.equal(response.body.includes('secret'), false);
}));

test('bridge rejects oversized and non-json requests before proxying', async () => withServer({ allowedOrigins: new Set(['http://localhost:3000']), maxBodyBytes: 4, allowNoOrigin: false, upstream: 'http://127.0.0.1:1' }, async port => {
  assert.equal((await call(port, { origin: 'http://localhost:3000', body: '{"large":true}' })).status, 413);
  assert.equal((await call(port, { origin: 'http://localhost:3000', body: '{}', contentType: 'text/plain' })).status, 415);
}));
