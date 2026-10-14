/* Minimal server-side model proxy for Render. The API key never reaches the browser. */
'use strict';
const http = require('node:http');
const PORT = Number(process.env.PORT || 10000);
const MODEL = process.env.AGENT_MODEL;
const API_KEY = process.env.OPENAI_API_KEY;
const API_URL = process.env.OPENAI_API_URL || 'https://api.openai.com/v1/responses';

function send(res, status, body) {
  res.writeHead(status, {'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': process.env.GAME_ORIGIN || '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS'});
  res.end(JSON.stringify(body));
}

async function agent(req, res) {
  if (!API_KEY || !MODEL) return send(res, 503, {error: 'Model service is not configured.'});
  let raw = '';
  req.on('data', chunk => { raw += chunk; if (raw.length > 100000) req.destroy(); });
  req.on('end', async () => {
    try {
      const input = JSON.parse(raw || '{}');
      if (typeof input.prompt !== 'string' || !input.prompt.trim()) return send(res, 400, {error: 'prompt is required'});
      const upstream = await fetch(API_URL, {method: 'POST', headers: {'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json'}, body: JSON.stringify({model: MODEL, input: input.prompt, max_output_tokens: Math.min(1000, Math.max(1, Number(input.max_output_tokens) || 300))})});
      const data = await upstream.json();
      if (!upstream.ok) return send(res, upstream.status, {error: data.error?.message || 'Model request failed'});
      const text = data.output_text || data.output?.flatMap(item => item.content || []).filter(part => part.type === 'output_text').map(part => part.text || '').join('') || data.choices?.[0]?.message?.content || '';
      return send(res, 200, {text});
    } catch (error) { return send(res, 500, {error: error.message || 'Request failed'}); }
  });
}

http.createServer((req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204, {});
  if (req.method === 'GET' && req.url === '/health') return send(res, 200, {ok: true, configured: Boolean(API_KEY && MODEL)});
  if (req.method === 'POST' && req.url === '/api/agent') return agent(req, res);
  return send(res, 404, {error: 'Not found'});
}).listen(PORT, () => console.log(`Agent API listening on ${PORT}`));
