// ============================================
// AsefAI - Server Utama
// ============================================
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const chatRoute = require('./routes/chat');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ───────────────────────────────
app.use(cors());
app.use(express.json());

// Sajikan file statis dari folder public
app.use(express.static(path.join(__dirname, 'public')));

// ── Routes ───────────────────────────────────
app.use('/api/chat', chatRoute);

// Semua route lain kembalikan index.html (SPA fallback)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Start Server ─────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ AsefAI berjalan di http://localhost:${PORT}`);
});
