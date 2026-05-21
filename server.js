// WritersHub Grok Video Proxy — server.js
// Node.js 18+ (uses built-in fetch)
// Routes xAI API calls server-side to bypass browser CORS restrictions

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors()); // Allow requests from browser/artifact
app.use(express.json());

// Resolve xAI API key — env var preferred, header fallback
function getKey(req) {
  return process.env.XAI_API_KEY || req.headers['x-xai-key'];
}

// Health check
app.get('/', (_, res) => res.json({
  status: 'ok',
  service: 'WritersHub Grok Proxy',
  version: '1.0.0'
}));

// POST /api/generate — submit a video generation job
app.post('/api/generate', async (req, res) => {
  const key = getKey(req);
  if (!key) return res.status(401).json({ error: 'No xAI API key. Set XAI_API_KEY env var or pass x-xai-key header.' });

  const { prompt, duration = 10, aspect_ratio = '9:16', resolution = '720p' } = req.body;
  if (!prompt) return res.status(400).json({ error: 'prompt is required' });

  try {
    const r = await fetch('https://api.x.ai/v1/videos/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify({
        model: 'grok-imagine-video',
        prompt,
        duration,
        aspect_ratio,
        resolution
      })
    });

    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({
      error: data?.error?.message || 'xAI API error',
      detail: data
    });

    console.log(`[generate] Job submitted — request_id: ${data.request_id}`);
    res.json({ requestId: data.request_id });
  } catch (e) {
    console.error('[generate] Error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/status/:id — poll for video status
app.get('/api/status/:id', async (req, res) => {
  const key = getKey(req);
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
  console.log(`\n✅ WritersHub Grok Proxy running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/`);
  console.log(`   xAI Key: ${process.env.XAI_API_KEY ? 'loaded from env' : 'pass via x-xai-key header'}\n`);
});
