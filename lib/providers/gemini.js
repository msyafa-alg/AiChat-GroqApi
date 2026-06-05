const { GoogleGenerativeAI } = require('@google/generative-ai');

const GEMINI_MODEL = 'gemini-2.0-flash';

function getSystemPrompt(messages) {
  const sys = messages.find(m => m.role === 'system');
  return sys?.content || '';
}

function toGeminiHistory(messages) {
  const withoutSystem = messages.filter(m => m.role !== 'system');
  if (withoutSystem.length === 0) return { history: [], lastMessage: '' };

  const last = withoutSystem[withoutSystem.length - 1];
  const rest = withoutSystem.slice(0, -1);
  const history = [];

  for (const m of rest) {
    const role = m.role === 'assistant' ? 'model' : 'user';
    const prev = history[history.length - 1];

    if (prev && prev.role === role) {
      prev.parts[0].text += '\n' + m.content;
    } else {
      history.push({ role, parts: [{ text: m.content }] });
    }
  }

  if (history.length > 0 && history[0].role === 'model') {
    history.shift();
  }

  return { history, lastMessage: last.content };
}

async function* streamGemini({ messages }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

  const genAI = new GoogleGenerativeAI(apiKey);
  const { history, lastMessage } = toGeminiHistory(messages);

  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction: getSystemPrompt(messages),
  });

  const chat = model.startChat({ history });
  const result = await chat.sendMessageStream(lastMessage);

  for await (const chunk of result.stream) {
    try {
      const token = chunk.text();
      if (token) yield token;
    } catch {
      // skip non-text chunks
    }
  }
}

module.exports = { streamGemini, GEMINI_MODEL };
