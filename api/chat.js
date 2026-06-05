// ============================================
// AsefAI - Vercel Serverless Function (Streaming)
// Auto fallback: Groq → DeepSeek on rate limit
// ============================================
const { validateChatRequest, setupSSE, streamToResponse } = require('../lib/chat');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const validated = validateChatRequest(req.body);
  if (validated.error) {
    return res.status(validated.error.status).json({ error: validated.error.message });
  }

  const { selectedModel, messages } = validated;

  setupSSE(res);

  try {
    await streamToResponse(res, { model: selectedModel, messages });
    res.end();
  } catch (err) {
    console.error(`❌ Chat Error [${selectedModel}]:`, err.message);
    res.write(`data: ${JSON.stringify({ error: 'Maaf, terjadi kesalahan.' })}\n\n`);
    res.end();
  }
};
