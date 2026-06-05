// ============================================
// AsefAI - Groq Provider
// Support: multiple API keys dengan auto-fallback
// ============================================
const Groq = require('groq-sdk');

// Kumpulkan semua key yang tersedia dari .env
function getApiKeys() {
  const keys = [];
  // Support format GROQ_API_KEY_1, GROQ_API_KEY_2, dst
  for (let i = 1; i <= 10; i++) {
    const key = process.env[`GROQ_API_KEY_${i}`];
    if (key && key.trim() && !key.includes('your_')) keys.push(key.trim());
  }
  // Juga support format lama GROQ_API_KEY
  if (process.env.GROQ_API_KEY && !process.env.GROQ_API_KEY.includes('your_')) {
    keys.push(process.env.GROQ_API_KEY.trim());
  }
  return [...new Set(keys)]; // hapus duplikat
}

function isRateLimitError(err) {
  const status = err.status ?? err.statusCode;
  if (status === 429) return true;
  const msg = String(err.message || '').toLowerCase();
  return /rate.?limit|quota|too many|tokens per day|tpd/i.test(msg);
}

async function* streamGroq({ model, messages }) {
  const keys = getApiKeys();

  if (keys.length === 0) {
    throw new Error('Tidak ada Groq API key yang dikonfigurasi.');
  }

  let lastError = null;

  for (let i = 0; i < keys.length; i++) {
    const keyLabel = `Key ${i + 1}/${keys.length}`;

    try {
      console.log(`🔑 Mencoba Groq ${keyLabel}...`);

      const client = new Groq({ apiKey: keys[i] });
      const stream = await client.chat.completions.create({
        model,
        messages,
        temperature: 0.7,
        max_tokens: 2048,
        stream: true,
      });

      for await (const chunk of stream) {
        const token = chunk.choices[0]?.delta?.content || '';
        if (token) yield token;
      }

      console.log(`✅ Groq ${keyLabel} berhasil`);
      return; // sukses, selesai

    } catch (err) {
      lastError = err;

      if (isRateLimitError(err)) {
        console.warn(`⚠️ Groq ${keyLabel} rate limited, coba key berikutnya...`);
        continue; // coba key berikutnya
      }

      // Error lain (bukan rate limit) — lempar langsung
      throw err;
    }
  }

  // Semua key habis
  console.error(`❌ Semua Groq API key (${keys.length}) telah rate limited`);
  throw Object.assign(
    new Error(`Semua API key telah mencapai batas limit. ${lastError?.message || ''}`),
    { isAllKeysExhausted: true }
  );
}

module.exports = { streamGroq };
