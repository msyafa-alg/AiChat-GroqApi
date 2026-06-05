// ============================================
// AsefAI - Vercel Serverless Function
// ============================================
require('dotenv').config();
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
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { message, history } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Pesan tidak boleh kosong.' });
  }

  const trimmed = message.trim();
  if (!trimmed) return res.status(400).json({ error: 'Pesan tidak boleh kosong.' });
  if (trimmed.length > 2000) return res.status(400).json({ error: 'Pesan terlalu panjang. Maksimal 2000 karakter.' });

  const recentHistory = Array.isArray(history) ? history.slice(-20) : [];
  const validHistory = recentHistory.filter(
    m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string'
  );

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [SYSTEM_PROMPT, ...validHistory],
      temperature: 0.7,
      max_tokens: 2048,
    });

    const reply = completion.choices[0]?.message?.content || 'Maaf, tidak ada respons.';
    return res.status(200).json({ reply });

  } catch (err) {
    console.error('❌ Groq API Error:', err.message);
    return res.status(500).json({ error: 'Maaf, terjadi kesalahan saat menghubungi AI. Coba lagi sebentar ya.' });
  }
};
