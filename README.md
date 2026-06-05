# AsefAI — AI Chat

Aplikasi AI Chat modern dengan **streaming response**, **multi-model**, dan **auto fallback** ke DeepSeek kalau Groq kena rate limit.

**Live demo:** [ai-chat-groq-api.vercel.app](https://ai-chat-groq-api.vercel.app)

**Repo:** [github.com/msyafa-alg/AiChat-GroqApi](https://github.com/msyafa-alg/AiChat-GroqApi)

---

## Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Backend | Node.js + Express.js |
| AI (utama) | Groq API — Llama 3.3, Mixtral, Gemma |
| AI (fallback) | DeepSeek API — `deepseek-chat` |
| Frontend | HTML + CSS + Vanilla JavaScript |
| Markdown | Marked.js |
| Syntax Highlighting | Highlight.js |
| Deploy | Vercel (serverless) |

---

## Features

- 💬 **Chat dengan memory** — AI ingat konteks percakapan
- 🔄 **Auto fallback Groq → DeepSeek** — chat tetap jalan kalau Groq limit
- 🤖 **Model selector** — pilih model Groq (Llama, Mixtral, Gemma)
- 📝 **Custom system prompt** — atur persona AI sesuai kebutuhan
- 📂 **Multiple chat sessions** — kelola beberapa percakapan sekaligus
- ⚡ **Streaming response** — jawaban muncul token per token (SSE)
- ✨ **Markdown rendering** + syntax highlighting
- 📋 **Copy response** & copy code block
- 📱 **Responsive** — mobile friendly
- 🎨 **Dark UI** — tema Violet/Indigo

---

## Cara Kerja Fallback

```
User kirim pesan
    ↓
Coba Groq (model yang dipilih)
    ↓
Sukses → stream jawaban ✓
    ↓
Rate limit / quota habis?
    ↓
Otomatis pindah ke DeepSeek ✓
```

Fallback hanya aktif kalau `DEEPSEEK_API_KEY` sudah diisi. Kalau Groq gagal karena error lain (misalnya API key invalid), app tidak fallback — biar masalahnya jelas.

---

## Getting Started

### 1. Clone repo

```bash
git clone https://github.com/msyafa-alg/AiChat-GroqApi.git
cd AiChat-GroqApi
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

```env
GROQ_API_KEY=your_groq_api_key_here
DEEPSEEK_API_KEY=your_deepseek_api_key_here
PORT=3000
```

| Variable | Wajib? | Keterangan |
|----------|--------|------------|
| `GROQ_API_KEY` | ✅ Ya | Provider utama. Dapatkan di [console.groq.com](https://console.groq.com) |
| `DEEPSEEK_API_KEY` | Opsional | Fallback kalau Groq limit. Dapatkan di [platform.deepseek.com](https://platform.deepseek.com) |
| `PORT` | Opsional | Default `3000` |

### 4. Jalankan

```bash
npm run dev
```

Buka browser di `http://localhost:3000`.

---

## Deploy ke Vercel

1. Push repo ke GitHub
2. Import project di [vercel.com](https://vercel.com)
3. Tambahkan environment variables:
   - `GROQ_API_KEY`
   - `DEEPSEEK_API_KEY` (opsional, untuk fallback)
4. Deploy

Endpoint serverless ada di `api/chat.js`, dikonfigurasi lewat `vercel.json`.

---

## Project Structure

```
AiChat-GroqApi/
├── server.js              # Express server (local dev)
├── vercel.json            # Konfigurasi deploy Vercel
├── package.json
├── .env.example           # Template environment
├── api/
│   └── chat.js            # Serverless endpoint (Vercel)
├── routes/
│   └── chat.js            # Express route (local dev)
├── lib/
│   ├── chat.js            # Validasi + logic fallback
│   └── providers/
│       ├── groq.js        # Stream dari Groq
│       └── deepseek.js    # Stream dari DeepSeek (fallback)
└── public/
    ├── index.html
    ├── style.css
    └── app.js
```

---

## Model yang Tersedia (Groq)

| Model | Keterangan |
|-------|------------|
| `llama-3.3-70b-versatile` | Paling pintar (default) |
| `llama-3.1-8b-instant` | Ringan & cepat |
| `mixtral-8x7b-32768` | Seimbang, context panjang |
| `gemma2-9b-it` | Google, efisien |

Kalau fallback ke DeepSeek, backend otomatis pakai `deepseek-chat`.

---

## License

MIT
