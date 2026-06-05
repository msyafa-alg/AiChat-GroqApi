// ============================================
// AsefAI - Route Chat (Groq only)
// ============================================
const express = require('express');
const router  = express.Router();
const { validateChatRequest, setupSSE, streamToResponse } = require('../lib/chat');

router.post('/', async (req, res) => {
  const validated = validateChatRequest(req.body);
  if (validated.error) {
    return res.status(validated.error.status).json({ error: validated.error.message });
  }

  const { selectedModel, messages } = validated;
  setupSSE(res);

  await streamToResponse(res, { model: selectedModel, messages });
  res.end();
});

module.exports = router;
