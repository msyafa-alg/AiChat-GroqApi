// ============================================
// AsefAI - Route Chat
// Support: model selector + custom system prompt
// ============================================
const express = require('express');
const router  = express.Router();
const Groq    = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Model yang diizinkan (whitelist keamanan)
const ALLOWED_MODELS = new Set([
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'mixtral-8x7b-32768',
  'gemma2-9b-it',
]);

const DEFAULT_SYSTEM = `Kamu adalah AsefAI, asisten AI yang cerdas, ramah, dan membantu.
Kamu siap membantu coding, debugging, belajar, dan menjawab pertanyaan umum.
Jawab dalam bahasa yang sama dengan pertanyaan pengguna.
Jika user menyebutkan namanya, ingat dan gunakan namanya dalam percakapan.`;

// ── POST /api/chat ─────────────────────────
router.post('/', async (req, res) => {
  const { message, history, model, systemPrompt } = req.body;

  // ── Validasi pesan ─────────────────────────
  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'Pesan tidak boleh kosong.' });
  }
  if (message.trim().length > 2000) {
    return res.status(400).json({ error: 'Pesan terlalu panjang. Maksimal 2000 karakter.' });
  }

  // ── Validasi & pilih model ─────────────────
  const selectedModel = ALLOWED_MODELS.has(model) ? model : 'llama-3.3-70b-versatile';

  // ── System prompt ──────────────────────────
  const sysContent = (typeof systemPrompt === 'string' && systemPrompt.trim())
    ? systemPrompt.trim().slice(0, 500) // batasi 500 karakter
    : DEFAULT_SYSTEM;

  // ── Build messages ─────────────────────────
  const recentHistory = Array.isArray(history) ? history.slice(-20) : [];
  const validHistory  = recentHistory.filter(
    m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string'
  );

  const messages = [
    { role: 'system', content: sysContent },
    ...validHistory,
  ];

  // ── SSE Headers ────────────────────────────
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  // ── Stream dari Groq ───────────────────────
  try {
    const stream = await groq.chat.completions.create({
      model: selectedModel,
      messages,
      temperature: 0.7,
      max_tokens: 2048,
      stream: true,
    });

    for await (const chunk of stream) {
      const token = chunk.choices[0]?.delta?.content || '';
      if (token) {
        res.write(`data: ${JSON.stringify({ token })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();

  } catch (err) {
    console.error(`❌ Groq Error [${selectedModel}]:`, err.message);
    res.write(`data: ${JSON.stringify({ error: 'Maaf, terjadi kesalahan. Coba lagi sebentar ya.' })}\n\n`);
    res.end();
  }
});

module.exports = router;
