# AsefAI — AI Chat

Aplikasi AI Chat modern powered by **Llama 3.3** via **Groq API**.

Built with Node.js, Express.js, dan Vanilla JavaScript.

---

## Tech Stack

- **Backend** — Node.js + Express.js
- **AI** — Groq API (Llama 3.3 70B)
- **Frontend** — HTML + CSS + Vanilla JS
- **Markdown** — Marked.js
- **Syntax Highlighting** — Highlight.js

## Features

- 💬 Chat dengan memory (AI ingat konteks percakapan)
- ✨ Markdown rendering + syntax highlighting
- 📋 Copy response & copy code block
- ⌨️ Typing indicator
- 📱 Responsive (mobile friendly)
- 🎨 Dark UI dengan tema Violet/Indigo

## Getting Started

### 1. Clone repo

```bash
git clone https://github.com/username/asef-ai.git
cd asef-ai
```

### 2. Install dependencies

```bash
npm install
```

### 3. Setup environment

```bash
cp .env.example .env
```

Edit `.env` dan isi API key kamu:

```
GROQ_API_KEY=your_groq_api_key_here
```

Dapatkan API key gratis di [console.groq.com](https://console.groq.com).

### 4. Jalankan

```bash
npm run dev
```

Buka browser di `http://localhost:3000`.

## Project Structure

```
asef-ai/
├── server.js          # Express server
├── package.json
├── .env               # API key (tidak di-commit)
├── .env.example       # Template environment
├── routes/
│   └── chat.js        # Endpoint POST /api/chat
└── public/
    ├── index.html
    ├── style.css
    └── app.js
```

## License

MIT
