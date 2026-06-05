// ============================================
// AsefAI - Route Chat
// Support: model selector + custom system prompt
// Auto fallback: Groq → Gemini on rate limit
// ============================================
const express = require('express');
const router = express.Router();
const { validateChatRequest, setupSSE, streamToResponse } = require('../lib/chat');

router.post('/', async (req, res) => {
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
    res.write(`data: ${JSON.stringify({ error: 'Maaf, terjadi kesalahan. Coba lagi sebentar ya.' })}\n\n`);
    res.end();
  }
});

module.exports = router;
