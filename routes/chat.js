// ============================================
// AsefAI - Route Chat
// Menangani request ke Groq API dengan memory
// ============================================
const express = require('express');
const router = express.Router();
const Groq = require('groq-sdk');

// Inisialisasi Groq dengan API Key dari .env
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// System prompt — identitas AsefAI
const SYSTEM_PROMPT = {
  role: 'system',
  content: `Kamu adalah AsefAI, asisten AI yang cerdas, ramah, dan membantu.
Kamu siap membantu coding, debugging, belajar, dan menjawab pertanyaan umum.
Jawab dalam bahasa yang sama dengan pertanyaan pengguna.
Jika user menyebutkan namanya, ingat dan gunakan namanya dalam percakapan.`,
};

// ── POST /api/chat ────────────────────────────
router.post('/', async (req, res) => {
  const { message, history } = req.body;

  // ── Validasi Input ─────────────────────────
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Pesan tidak boleh kosong.' });
  }

  const trimmed = message.trim();

  if (trimmed.length === 0) {
    return res.status(400).json({ error: 'Pesan tidak boleh kosong.' });
  }

  if (trimmed.length > 2000) {
    return res.status(400).json({ error: 'Pesan terlalu panjang. Maksimal 2000 karakter.' });
  }

  // ── Bangun messages dengan history ────────
  // Ambil max 20 pesan terakhir agar tidak overload token
  const recentHistory = Array.isArray(history) ? history.slice(-20) : [];

  // Validasi setiap item history: harus punya role & content string
  const validHistory = recentHistory.filter(
    m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string'
  );

  const messages = [SYSTEM_PROMPT, ...validHistory];

  // ── Kirim ke Groq API ──────────────────────
  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages,
      temperature: 0.7,
      max_tokens: 2048,
    });

    const reply = completion.choices[0]?.message?.content || 'Maaf, tidak ada respons.';
    return res.json({ reply });

  } catch (err) {
    console.error('❌ Groq API Error:', err.message);
    return res.status(500).json({
      error: 'Maaf, terjadi kesalahan saat menghubungi AI. Coba lagi sebentar ya.',
    });
  }
});

module.exports = router;
