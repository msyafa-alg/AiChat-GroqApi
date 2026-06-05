// ============================================
// AsefAI - Vercel Serverless Function (Streaming)
// ============================================
const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = {
  role: 'system',
  content: `Kamu adalah AsefAI, asisten AI yang cerdas, ramah, dan membantu.
Kamu siap membantu coding, debugging, belajar, dan menjawab pertanyaan umum.
Jawab dalam bahasa yang sama dengan pertanyaan pengguna.
Jika user menyebutkan namanya, ingat dan gunakan namanya dalam percakapan.`,
};

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { message, history } = req.body;

  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'Pesan tidak boleh kosong.' });
  }
  if (message.trim().length > 2000) {
    return res.status(400).json({ error: 'Pesan terlalu panjang.' });
  }

  const recentHistory = Array.isArray(history) ? history.slice(-20) : [];
  const validHistory = recentHistory.filter(
    m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string'
  );

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  try {
    const stream = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [SYSTEM_PROMPT, ...validHistory],
      temperature: 0.7,
      max_tokens: 2048,
      stream: true,
    });

    for await (const chunk of stream) {
      const token = chunk.choices[0]?.delta?.content || '';
      if (token) res.write(`data: ${JSON.stringify({ token })}\n\n`);
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();

  } catch (err) {
    console.error('❌ Groq Streaming Error:', err.message);
    res.write(`data: ${JSON.stringify({ error: 'Maaf, terjadi kesalahan.' })}\n\n`);
    res.end();
  }
};
