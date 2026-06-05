// ============================================
// AsefAI — Frontend Logic
// ============================================

// ── Marked config ─────────────────────────
marked.setOptions({ breaks: true, gfm: true });

// ── DOM ───────────────────────────────────
const chatArea        = document.getElementById('chatArea');
const messagesEl      = document.getElementById('messages');
const welcomeScreen   = document.getElementById('welcomeScreen');
const messageInput    = document.getElementById('messageInput');
const btnSend         = document.getElementById('btnSend');
const btnNewChat      = document.getElementById('btnNewChat');
const btnClear        = document.getElementById('btnClear');
const btnHamburger    = document.getElementById('btnHamburger');
const btnScrollBottom = document.getElementById('btnScrollBottom');
const sidebar         = document.getElementById('sidebar');
const sidebarOverlay  = document.getElementById('sidebarOverlay');
const charCountEl     = document.getElementById('charCount');
const iconSend        = btnSend.querySelector('.icon-send');
const iconLoading     = btnSend.querySelector('.icon-loading');

// ── State ─────────────────────────────────
let isLoading = false;
let conversationHistory = []; // memory percakapan
let sidebarHistory = [];      // judul untuk sidebar

// ── Boot ──────────────────────────────────
init();

function init() {
  // Suggestion chips
  document.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      messageInput.value = chip.dataset.text;
      updateCharCount();
      autoResize();
      messageInput.focus();
      sendMessage();
    });
  });

  messageInput.addEventListener('keydown', onKeyDown);
  messageInput.addEventListener('input', () => { updateCharCount(); autoResize(); });

  btnSend.addEventListener('click', sendMessage);
  btnNewChat.addEventListener('click', newChat);
  btnClear.addEventListener('click', clearChat);
  btnHamburger.addEventListener('click', toggleSidebar);
  sidebarOverlay.addEventListener('click', closeSidebar);
  btnScrollBottom.addEventListener('click', () => scrollToBottom(true));

  // Sembunyikan tombol scroll kalau sudah di bawah
  chatArea.addEventListener('scroll', onChatScroll);
}

// ── Send Message ───────────────────────────
async function sendMessage() {
  const message = messageInput.value.trim();
  if (!message || isLoading) return;

  hideWelcome();

  // Render bubble user
  appendMessage('user', message);

  // Push ke history
  conversationHistory.push({ role: 'user', content: message });

  // Reset input
  messageInput.value = '';
  updateCharCount();
  autoResize();

  // Typing indicator
  const typingEl = showTyping();
  setLoading(true);

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history: conversationHistory }),
    });

    const data = await res.json();
    removeTyping(typingEl);

    if (!res.ok) {
      appendMessage('error', data.error || 'Terjadi kesalahan.');
      conversationHistory.pop();
    } else {
      appendMessage('ai', data.reply);
      conversationHistory.push({ role: 'assistant', content: data.reply });

      // Tambah ke sidebar sekali per sesi awal
      if (conversationHistory.length === 2) addToSidebar(message);
    }

  } catch {
    removeTyping(typingEl);
    appendMessage('error', 'Gagal terhubung ke server. Pastikan server berjalan.');
    conversationHistory.pop();
  }

  setLoading(false);
  messageInput.focus();
}

// ── Append Message ─────────────────────────
function appendMessage(role, content) {
  const row = document.createElement('div');
  row.classList.add('msg-row', role === 'error' ? 'ai' : role);
  if (role === 'error') row.classList.add('error');

  const inner = document.createElement('div');
  inner.classList.add('msg-inner');

  // Header: avatar + sender
  const header = document.createElement('div');
  header.classList.add('msg-header');

  const avatar = document.createElement('div');
  avatar.classList.add('msg-avatar');
  avatar.textContent = role === 'user' ? 'K' : 'A';

  const sender = document.createElement('div');
  sender.classList.add('msg-sender');
  sender.textContent = role === 'user' ? 'Kamu' : 'AsefAI';

  if (role === 'user') {
    header.appendChild(sender);
    header.appendChild(avatar);
    header.style.flexDirection = 'row-reverse';
  } else {
    header.appendChild(avatar);
    header.appendChild(sender);
  }

  // Bubble
  const bubble = document.createElement('div');
  bubble.classList.add('msg-bubble');

  if (role === 'ai') {
    bubble.innerHTML = parseMarkdown(content);
    // Syntax highlight + code block headers
    bubble.querySelectorAll('pre').forEach(pre => wrapCodeBlock(pre));
  } else {
    bubble.textContent = content;
  }

  // Footer: time + copy
  const footer = document.createElement('div');
  footer.classList.add('msg-footer');

  const timeEl = document.createElement('span');
  timeEl.classList.add('msg-time');
  timeEl.textContent = now();
  footer.appendChild(timeEl);

  if (role === 'ai') {
    const copyBtn = makeCopyBtn(content);
    footer.appendChild(copyBtn);
  }

  inner.appendChild(header);
  inner.appendChild(bubble);
  inner.appendChild(footer);
  row.appendChild(inner);
  messagesEl.appendChild(row);

  scrollToBottom();
}

// ── Parse Markdown ─────────────────────────
function parseMarkdown(text) {
  return marked.parse(text);
}

// ── Wrap Code Block ────────────────────────
function wrapCodeBlock(pre) {
  const code = pre.querySelector('code');
  if (!code) return;

  // Highlight
  hljs.highlightElement(code);

  // Detect language
  let lang = '';
  code.classList.forEach(c => { if (c.startsWith('language-')) lang = c.replace('language-', ''); });

  // Wrapper div
  const wrapper = document.createElement('div');
  wrapper.classList.add('code-wrapper');

  // Header bar
  const header = document.createElement('div');
  header.classList.add('code-header');

  const label = document.createElement('span');
  label.classList.add('code-lang-label');
  label.textContent = lang || 'code';

  const copyBtn = document.createElement('button');
  copyBtn.classList.add('btn-copy-code');
  copyBtn.innerHTML = `<svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> Copy`;
  copyBtn.addEventListener('click', () => copyText(code.innerText, copyBtn, 'Copied!'));

  header.appendChild(label);
  header.appendChild(copyBtn);

  // Insert wrapper before pre
  pre.parentNode.insertBefore(wrapper, pre);
  wrapper.appendChild(header);
  wrapper.appendChild(pre);
}

// ── Copy Button (response) ─────────────────
function makeCopyBtn(content) {
  const btn = document.createElement('button');
  btn.classList.add('btn-copy-msg');
  btn.innerHTML = `<svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> Copy`;
  btn.addEventListener('click', () => copyText(content, btn, 'Copied'));
  return btn;
}

// ── Generic Copy ───────────────────────────
async function copyText(text, btn, successLabel) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = Object.assign(document.createElement('textarea'), { value: text, style: 'position:fixed;opacity:0' });
    document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
  }

  const original = btn.innerHTML;
  btn.innerHTML = `<svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg> ${successLabel}`;
  btn.classList.add('copied');
  setTimeout(() => { btn.innerHTML = original; btn.classList.remove('copied'); }, 2000);
}

// ── Typing Indicator ───────────────────────
function showTyping() {
  const row = document.createElement('div');
  row.classList.add('typing-row');

  const inner = document.createElement('div');
  inner.classList.add('typing-inner');

  const header = document.createElement('div');
  header.classList.add('msg-header');

  const avatar = document.createElement('div');
  avatar.classList.add('msg-avatar');
  avatar.textContent = 'A';
  avatar.style.background = 'linear-gradient(135deg, #7c6fe0, #a78bfa)';
  avatar.style.color = '#fff';

  const senderEl = document.createElement('div');
  senderEl.classList.add('msg-sender');
  senderEl.textContent = 'AsefAI';

  header.appendChild(avatar);
  header.appendChild(senderEl);

  const bubble = document.createElement('div');
  bubble.classList.add('typing-bubble');
  bubble.innerHTML = `
    <div class="typing-dots"><span></span><span></span><span></span></div>
    <span class="typing-label">Sedang mengetik...</span>
  `;

  inner.appendChild(header);
  inner.appendChild(bubble);
  row.appendChild(inner);
  messagesEl.appendChild(row);
  scrollToBottom();
  return row;
}

function removeTyping(el) { el?.remove(); }

// ── Loading ────────────────────────────────
function setLoading(val) {
  isLoading = val;
  btnSend.disabled = val;
  iconSend.classList.toggle('hidden', val);
  iconLoading.classList.toggle('hidden', !val);
}

// ── New Chat / Clear ───────────────────────
function newChat() {
  conversationHistory = [];
  messagesEl.innerHTML = '';
  showWelcome();
  messageInput.focus();
  closeSidebar();
}

function clearChat() {
  if (!messagesEl.children.length) return;
  conversationHistory = [];
  messagesEl.innerHTML = '';
  showWelcome();
}

// ── Welcome ────────────────────────────────
function showWelcome() { welcomeScreen.style.display = 'flex'; }
function hideWelcome()  { welcomeScreen.style.display = 'none'; }

// ── Sidebar history ────────────────────────
function addToSidebar(message) {
  const historyEl = document.getElementById('chatHistory');
  historyEl.querySelector('.history-empty')?.remove();

  const item = document.createElement('div');
  item.classList.add('history-item');
  const label = message.length > 38 ? message.slice(0, 38) + '…' : message;
  item.textContent = label;
  item.title = message;

  historyEl.insertBefore(item, historyEl.firstChild);
  while (historyEl.children.length > 20) historyEl.removeChild(historyEl.lastChild);
}

// ── Sidebar toggle ─────────────────────────
function toggleSidebar() {
  sidebar.classList.toggle('open');
  sidebarOverlay.classList.toggle('open');
}
function closeSidebar() {
  sidebar.classList.remove('open');
  sidebarOverlay.classList.remove('open');
}

// ── Scroll ────────────────────────────────
function scrollToBottom(force = false) {
  const threshold = 120;
  const isNearBottom = chatArea.scrollHeight - chatArea.scrollTop - chatArea.clientHeight < threshold;
  if (isNearBottom || force) {
    chatArea.scrollTo({ top: chatArea.scrollHeight, behavior: 'smooth' });
  }
}

function onChatScroll() {
  const distFromBottom = chatArea.scrollHeight - chatArea.scrollTop - chatArea.clientHeight;
  btnScrollBottom.style.opacity = distFromBottom > 200 ? '1' : '0';
  btnScrollBottom.style.pointerEvents = distFromBottom > 200 ? 'auto' : 'none';
}

// ── Auto Resize Textarea ───────────────────
function autoResize() {
  messageInput.style.height = 'auto';
  messageInput.style.height = Math.min(messageInput.scrollHeight, 130) + 'px';
}

// ── Char Count ────────────────────────────
function updateCharCount() {
  const len = messageInput.value.length;
  charCountEl.textContent = `${len}/2000`;
  charCountEl.classList.remove('warn', 'danger');
  if (len > 1800) charCountEl.classList.add('danger');
  else if (len > 1400) charCountEl.classList.add('warn');
}

// ── Enter to send ─────────────────────────
function onKeyDown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
}

// ── Timestamp ─────────────────────────────
function now() {
  return new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}
