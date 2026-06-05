// ============================================
// AsefAI - Chat Helper (Groq only)
// ============================================
const { streamGroq } = require('./providers/groq');

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

function validateChatRequest(body) {
  const { message, history, model, systemPrompt } = body;

  if (!message || typeof message !== 'string' || !message.trim()) {
    return { error: { status: 400, message: 'Pesan tidak boleh kosong.' } };
  }
  if (message.trim().length > 2000) {
    return { error: { status: 400, message: 'Pesan terlalu panjang. Maksimal 2000 karakter.' } };
  }

  const sysContent = (typeof systemPrompt === 'string' && systemPrompt.trim())
    ? systemPrompt.trim().slice(0, 500)
    : DEFAULT_SYSTEM;

  const recentHistory = Array.isArray(history) ? history.slice(-20) : [];
  const validHistory = recentHistory.filter(
    m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string'
  );

  const selectedModel = ALLOWED_MODELS.has(model) ? model : 'llama-3.3-70b-versatile';

  const messages = [
    { role: 'system', content: sysContent },
    ...validHistory,
  ];

  return { selectedModel, messages };
}

function setupSSE(res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  if (typeof res.flushHeaders === 'function') res.flushHeaders();
}

async function streamToResponse(res, { model, messages }) {
  const writeToken = (token) => {
    res.write(`data: ${JSON.stringify({ token })}\n\n`);
  };

  try {
    for await (const token of streamGroq({ model, messages })) {
      writeToken(token);
    }
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);

  } catch (err) {
    console.error('❌ Groq Error:', err.message);

    // Deteksi jenis error dan kirim pesan yang sesuai
    const msg = String(err.message || '');
    let userMessage;

    if (err.isAllKeysExhausted || /semua api key/i.test(msg)) {
      userMessage = '⚠️ Semua API key telah mencapai batas limit hari ini. Silakan coba lagi besok.';
    } else if (/rate.?limit|quota|too many|tokens per day|TPD/i.test(msg)) {
      userMessage = '⚠️ Limit Groq telah habis. Sedang mencoba key cadangan...';
    } else if (/insufficient.?balance|billing/i.test(msg)) {
      userMessage = '⚠️ Credit API habis. Silakan hubungi admin.';
    } else if (/invalid.?api.?key|authentication/i.test(msg)) {
      userMessage = '⚠️ API key tidak valid. Silakan hubungi admin.';
    } else {
      userMessage = '⚠️ Terjadi kesalahan. Silakan coba lagi sebentar.';
    }

    res.write(`data: ${JSON.stringify({ error: userMessage })}\n\n`);
  }
}

module.exports = {
  ALLOWED_MODELS,
  DEFAULT_SYSTEM,
  validateChatRequest,
  setupSSE,
  streamToResponse,
};
