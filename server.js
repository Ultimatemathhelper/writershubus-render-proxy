const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-xai-key", "x-anthropic-key"]
}));
app.options("*", cors());
app.use(express.json());

// Health check
app.get('/', (_, res) => res.json({
  status: 'ok',
  service: 'WritersHub Grok Proxy',
  version: '3.0.0'
}));

// POST /api/claude — proxy Anthropic Claude API
app.post('/api/claude', async (req, res) => {
  const key = process.env.ANTHROPIC_API_KEY || req.headers['x-anthropic-key'];
  if (!key) return res.status(401).json({ error: 'No Anthropic API key. Set ANTHROPIC_API_KEY in Render environment.' });
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(req.body)
    });
    const data = await r.json();
    console.log(`[claude] status: ${r.status}`);
    res.status(r.status).json(data);
  } catch (e) {
    console.error('[claude] Error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// POST /api/generate — submit Grok video generation job
app.post('/api/generate', async (req, res) => {
  const key = process.env.XAI_API_KEY || req.headers['x-xai-key'];
  if (!key) return res.status(401).json({ error: 'No xAI API key. Set XAI_API_KEY in Render environment.' });
  const { prompt, duration = 10, aspect_ratio = '9:16', resolution = '720p' } = req.body;
  if (!prompt) return res.status(400).json({ error: 'prompt is required' });
  try {
    const r = await fetch('https://api.x.ai/v1/videos/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify({ model: 'grok-imagine-video', prompt, duration, aspect_ratio, resolution })
    });
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data?.error?.message || 'xAI API error' });
    console.log(`[generate] request_id: ${data.request_id}`);
    res.json({ requestId: data.request_id });
  } catch (e) {
    console.error('[generate] Error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/status/:id — poll Grok video status
app.get('/api/status/:id', async (req, res) => {
  const key = process.env.XAI_API_KEY || req.headers['x-xai-key'];
  if (!key) return res.status(401).json({ error: 'No xAI API key.' });
  try {
    const r = await fetch(`https://api.x.ai/v1/videos/${req.params.id}`, {
      headers: { 'Authorization': `Bearer ${key}` }
    });
    const data = await r.json();
    if (data.status === 'done') console.log(`[status] Done — ${data.video?.url}`);
    res.json(data);
  } catch (e) {
    console.error('[status] Error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`\n✅ WritersHub Proxy v3.0 running on port ${PORT}`);
  console.log(`   Anthropic key: ${process.env.ANTHROPIC_API_KEY ? '✅ loaded' : '❌ missing'}`);
  console.log(`   xAI key: ${process.env.XAI_API_KEY ? '✅ loaded' : '❌ missing'}\n`);
});
