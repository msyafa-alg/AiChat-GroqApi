// ============================================
// AsefAI — Frontend Logic
// Features: Streaming, Multiple Sessions,
//           Model Selector, System Prompt,
//           Token Counter
// ============================================

marked.setOptions({ breaks: true, gfm: true });

// ── DOM ───────────────────────────────────
const chatArea           = document.getElementById('chatArea');
const messagesEl         = document.getElementById('messages');
const welcomeScreen      = document.getElementById('welcomeScreen');
const messageInput       = document.getElementById('messageInput');
const btnSend            = document.getElementById('btnSend');
const btnNewChat         = document.getElementById('btnNewChat');
const btnClear           = document.getElementById('btnClear');
const btnHamburger       = document.getElementById('btnHamburger');
const btnScrollBottom    = document.getElementById('btnScrollBottom');
const sidebar            = document.getElementById('sidebar');
const sidebarOverlay     = document.getElementById('sidebarOverlay');
const charCountEl        = document.getElementById('charCount');
const iconSend           = btnSend.querySelector('.icon-send');
const iconLoading        = btnSend.querySelector('.icon-loading');
const tokenCountEl       = document.getElementById('tokenCount');
const currentModelLabel  = document.getElementById('currentModelLabel');
const welcomeModelEl     = document.getElementById('welcomeModel');
const headerTitle        = document.getElementById('headerTitle');
const chatHistoryEl      = document.getElementById('chatHistory');

// Model selector
const btnModelSelector   = document.getElementById('btnModelSelector');
const modelSelectorLabel = document.getElementById('modelSelectorLabel');
const modelDropdown      = document.getElementById('modelDropdown');

// System prompt
const btnSystemPrompt    = document.getElementById('btnSystemPrompt');
const systemPromptBar    = document.getElementById('systemPromptBar');
const systemPromptInput  = document.getElementById('systemPromptInput');
const btnCloseSystemPrompt = document.getElementById('btnCloseSystemPrompt');
const btnApplySystemPrompt = document.getElementById('btnApplySystemPrompt');
const spCharCount        = document.getElementById('spCharCount');

// ── App State ─────────────────────────────
let isLoading      = false;
let abortController = null;
let currentModel   = 'llama-3.3-70b-versatile';
let systemPrompt   = '';
let totalTokens    = 0;

// Multiple sessions state
let sessions       = [];   // array of { id, title, history, tokens }
let activeSession  = null; // id of active session

// ── Init ──────────────────────────────────
init();

function init() {
  // Chips
  document.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      messageInput.value = chip.dataset.text;
      updateCharCount(); autoResize(); messageInput.focus();
      sendMessage();
    });
  });

  messageInput.addEventListener('keydown', onKeyDown);
  messageInput.addEventListener('input', () => { updateCharCount(); autoResize(); });

  btnSend.addEventListener('click', () => isLoading ? stopStream() : sendMessage());
  btnNewChat.addEventListener('click', newChat);
  btnClear.addEventListener('click', clearCurrentSession);
  btnHamburger.addEventListener('click', toggleSidebar);
  sidebarOverlay.addEventListener('click', closeSidebar);
  btnScrollBottom.addEventListener('click', () => scrollToBottom(true));
  chatArea.addEventListener('scroll', onChatScroll);

  // Model selector
  btnModelSelector.addEventListener('click', (e) => {
    e.stopPropagation();
    modelDropdown.classList.toggle('open');
    btnModelSelector.classList.toggle('open');
  });

  document.querySelectorAll('.model-option').forEach(opt => {
    opt.addEventListener('click', () => {
      selectModel(opt.dataset.model, opt.dataset.label);
    });
  });

  document.addEventListener('click', (e) => {
    if (!btnModelSelector.contains(e.target) && !modelDropdown.contains(e.target)) {
      modelDropdown.classList.remove('open');
      btnModelSelector.classList.remove('open');
    }
  });

  // System prompt
  btnSystemPrompt.addEventListener('click', toggleSystemPromptBar);
  btnCloseSystemPrompt.addEventListener('click', () => systemPromptBar.classList.add('hidden'));
  btnApplySystemPrompt.addEventListener('click', applySystemPrompt);
  systemPromptInput.addEventListener('input', () => {
    spCharCount.textContent = `${systemPromptInput.value.length}/500`;
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'k') { e.preventDefault(); newChat(); }
  });

  // Start dengan sesi pertama
  createNewSession();
}

// ══════════════════════════════════════════
// SESSION MANAGEMENT
// ══════════════════════════════════════════

function createNewSession(autoSwitch = true) {
  const id = Date.now().toString();
  const session = {
    id,
    title: 'New Chat',
    history: [],
    tokens: 0,
    messages: [], // snapshot DOM tidak disimpan, rebuild dari history
  };
  sessions.push(session);
  if (autoSwitch) switchSession(id);
  return session;
}

function switchSession(id) {
  activeSession = id;
  const session = getSession(id);

  // Rebuild UI
  messagesEl.innerHTML = '';
  totalTokens = session.tokens;
  updateTokenCounter();
  headerTitle.textContent = session.title;

  if (session.history.length === 0) {
    showWelcome();
  } else {
    hideWelcome();
    // Re-render semua pesan dari history
    session.history.forEach(msg => {
      if (msg.role === 'user') {
        renderUserBubble(msg.content);
      } else if (msg.role === 'assistant') {
        renderAiBubble(msg.content);
      }
    });
    scrollToBottom(true);
  }

  renderSidebar();
}

function getSession(id) {
  return sessions.find(s => s.id === id);
}

function getActiveSession() {
  return getSession(activeSession);
}

function deleteSession(id) {
  sessions = sessions.filter(s => s.id !== id);
  if (activeSession === id) {
    if (sessions.length === 0) createNewSession();
    else switchSession(sessions[sessions.length - 1].id);
  } else {
    renderSidebar();
  }
}

function renderSidebar() {
  chatHistoryEl.innerHTML = '';

  if (sessions.every(s => s.history.length === 0)) {
    chatHistoryEl.innerHTML = `
      <div class="history-empty">
        <svg width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.2" viewBox="0 0 24 24" opacity="0.3">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
        </svg>
        <span>Belum ada sesi</span>
      </div>`;
    return;
  }

  // Tampilkan sesi yang sudah punya pesan
  sessions.filter(s => s.history.length > 0).reverse().forEach(session => {
    const item = document.createElement('div');
    item.classList.add('session-item');
    if (session.id === activeSession) item.classList.add('active');

    const text = document.createElement('span');
    text.classList.add('session-item-text');
    text.textContent = session.title;

    const del = document.createElement('button');
    del.classList.add('session-item-del');
    del.innerHTML = '×';
    del.title = 'Hapus sesi';
    del.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteSession(session.id);
    });

    item.appendChild(text);
    item.appendChild(del);
    item.addEventListener('click', () => {
      switchSession(session.id);
      if (window.innerWidth <= 768) closeSidebar();
    });

    chatHistoryEl.appendChild(item);
  });
}

// ══════════════════════════════════════════
// SEND MESSAGE
// ══════════════════════════════════════════

async function sendMessage() {
  const message = messageInput.value.trim();
  if (!message || isLoading) return;

  const session = getActiveSession();

  hideWelcome();
  renderUserBubble(message);
  session.history.push({ role: 'user', content: message });

  // Update judul sesi dari pesan pertama
  if (session.history.length === 1) {
    session.title = message.length > 36 ? message.slice(0, 36) + '…' : message;
    headerTitle.textContent = session.title;
    renderSidebar();
  }

  messageInput.value = '';
  updateCharCount();
  autoResize();

  setLoading(true);

  // Buat bubble AI kosong
  const { row, bubble, footer } = createAiBubbleEl();
  messagesEl.appendChild(row);
  scrollToBottom();

  let fullText = '';

  try {
    abortController = new AbortController();

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        history: session.history,
        model: currentModel,
        systemPrompt: systemPrompt || undefined,
      }),
      signal: abortController.signal,
    });

    if (!res.ok) {
      const data = await res.json();
      bubble.textContent = data.error || 'Terjadi kesalahan.';
      row.classList.add('error');
      session.history.pop();
      setLoading(false);
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const jsonStr = line.slice(6).trim();
        if (!jsonStr) continue;

        try {
          const parsed = JSON.parse(jsonStr);

          if (parsed.error) {
            bubble.innerHTML = `<span style="color:var(--error)">${parsed.error}</span>`;
            row.classList.add('error');
            session.history.pop();
            break;
          }

          if (parsed.tokens) {
            // Update token count dari server
            session.tokens += parsed.tokens;
            totalTokens = sessions.reduce((acc, s) => acc + s.tokens, 0);
            updateTokenCounter();
          }

          if (parsed.done) {
            bubble.innerHTML = parseMarkdown(fullText);
            bubble.querySelectorAll('pre').forEach(pre => wrapCodeBlock(pre));
            if (parsed.fallback && parsed.provider) {
              footer.insertBefore(makeProviderBadge(parsed.provider), footer.firstChild);
            }
            footer.appendChild(makeCopyBtn(fullText));

            session.history.push({ role: 'assistant', content: fullText });

            // Estimasi token sederhana (≈ 4 karakter per token)
            const estTokens = Math.ceil((message.length + fullText.length) / 4);
            session.tokens += estTokens;
            totalTokens = sessions.reduce((acc, s) => acc + s.tokens, 0);
            updateTokenCounter();
            renderSidebar();
            break;
          }

          if (parsed.token) {
            fullText += parsed.token;
            await sleep(18);
            bubble.innerHTML = parseMarkdown(fullText) + '<span class="cursor-blink">▍</span>';
            scrollToBottom();
          }

        } catch { /* skip */ }
      }
    }

  } catch (err) {
    if (err.name === 'AbortError') {
      if (fullText) {
        bubble.innerHTML = parseMarkdown(fullText);
        bubble.querySelectorAll('pre').forEach(pre => wrapCodeBlock(pre));
        footer.appendChild(makeCopyBtn(fullText));
        session.history.push({ role: 'assistant', content: fullText });
        renderSidebar();
      } else {
        row.remove();
        session.history.pop();
      }
    } else {
      bubble.innerHTML = `<span style="color:var(--error)">Gagal terhubung ke server.</span>`;
      row.classList.add('error');
      session.history.pop();
    }
  }

  abortController = null;
  setLoading(false);
  messageInput.focus();
}

function stopStream() {
  abortController?.abort();
}

// ══════════════════════════════════════════
// RENDER HELPERS
// ══════════════════════════════════════════

function renderUserBubble(content) {
  const row = document.createElement('div');
  row.classList.add('msg-row', 'user');

  const inner = document.createElement('div');
  inner.classList.add('msg-inner');

  const header = document.createElement('div');
  header.classList.add('msg-header');
  header.style.flexDirection = 'row-reverse';

  const avatar = document.createElement('div');
  avatar.classList.add('msg-avatar');
  avatar.textContent = 'K';

  const sender = document.createElement('div');
  sender.classList.add('msg-sender');
  sender.textContent = 'Kamu';

  header.appendChild(sender);
  header.appendChild(avatar);

  const bubble = document.createElement('div');
  bubble.classList.add('msg-bubble');
  bubble.textContent = content;

  const footer = document.createElement('div');
  footer.classList.add('msg-footer');
  const time = document.createElement('span');
  time.classList.add('msg-time');
  time.textContent = now();
  footer.appendChild(time);

  inner.appendChild(header);
  inner.appendChild(bubble);
  inner.appendChild(footer);
  row.appendChild(inner);
  messagesEl.appendChild(row);
  scrollToBottom();
}

function renderAiBubble(content) {
  const { row, bubble, footer } = createAiBubbleEl();
  bubble.innerHTML = parseMarkdown(content);
  bubble.querySelectorAll('pre').forEach(pre => wrapCodeBlock(pre));
  footer.appendChild(makeCopyBtn(content));
  messagesEl.appendChild(row);
}

function createAiBubbleEl() {
  const row = document.createElement('div');
  row.classList.add('msg-row', 'ai');

  const inner = document.createElement('div');
  inner.classList.add('msg-inner');

  const header = document.createElement('div');
  header.classList.add('msg-header');

  const avatar = document.createElement('div');
  avatar.classList.add('msg-avatar');
  avatar.textContent = 'A';
  avatar.style.cssText = 'background:#ffffff;color:#0a0a0a';

  const sender = document.createElement('div');
  sender.classList.add('msg-sender');
  sender.textContent = 'AsefAI';

  header.appendChild(avatar);
  header.appendChild(sender);

  const bubble = document.createElement('div');
  bubble.classList.add('msg-bubble');

  const footer = document.createElement('div');
  footer.classList.add('msg-footer');
  const time = document.createElement('span');
  time.classList.add('msg-time');
  time.textContent = now();
  footer.appendChild(time);

  inner.appendChild(header);
  inner.appendChild(bubble);
  inner.appendChild(footer);
  row.appendChild(inner);

  return { row, bubble, footer };
}

// ══════════════════════════════════════════
// MODEL SELECTOR
// ══════════════════════════════════════════

function selectModel(model, label) {
  currentModel = model;

  // Update UI
  document.querySelectorAll('.model-option').forEach(o => o.classList.remove('active'));
  document.querySelector(`[data-model="${model}"]`).classList.add('active');

  modelSelectorLabel.textContent = label;
  currentModelLabel.textContent = label;
  welcomeModelEl.textContent = label;

  modelDropdown.classList.remove('open');
  btnModelSelector.classList.remove('open');
}

// ══════════════════════════════════════════
// SYSTEM PROMPT
// ══════════════════════════════════════════

function toggleSystemPromptBar() {
  systemPromptBar.classList.toggle('hidden');
  if (!systemPromptBar.classList.contains('hidden')) {
    systemPromptInput.focus();
  }
}

function applySystemPrompt() {
  const val = systemPromptInput.value.trim();
  systemPrompt = val;
  systemPromptBar.classList.add('hidden');

  // Tampilkan badge jika ada system prompt
  renderSystemPromptBadge();
}

function renderSystemPromptBadge() {
  // Hapus badge lama
  document.querySelector('.sp-active-badge')?.remove();

  if (!systemPrompt) return;

  const badge = document.createElement('div');
  badge.classList.add('sp-active-badge');
  badge.innerHTML = `
    <svg width="10" height="10" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14"/>
    </svg>
    System prompt aktif · <em>${systemPrompt.slice(0, 40)}${systemPrompt.length > 40 ? '…' : ''}</em>
  `;
  badge.title = 'Klik untuk edit system prompt';
  badge.addEventListener('click', toggleSystemPromptBar);

  // Sisipkan sebelum input-box
  const inputBox = document.getElementById('inputBox');
  inputBox.parentElement.insertBefore(badge, inputBox);
}

// ══════════════════════════════════════════
// TOKEN COUNTER
// ══════════════════════════════════════════

function updateTokenCounter() {
  tokenCountEl.textContent = totalTokens.toLocaleString('id-ID');
}

// ══════════════════════════════════════════
// CHAT CONTROLS
// ══════════════════════════════════════════

function newChat() {
  stopStream();
  createNewSession();
  messageInput.focus();
  // Tutup sidebar hanya di mobile setelah pilih new chat
  if (window.innerWidth <= 768) closeSidebar();
}

function clearCurrentSession() {
  const session = getActiveSession();
  if (!session || session.history.length === 0) return;

  stopStream();
  session.history = [];
  session.title = 'New Chat';
  session.tokens = 0;
  messagesEl.innerHTML = '';
  totalTokens = sessions.reduce((acc, s) => acc + s.tokens, 0);
  updateTokenCounter();
  headerTitle.textContent = 'New Chat';
  showWelcome();
  renderSidebar();
}

function showWelcome() { welcomeScreen.style.display = 'flex'; }
function hideWelcome()  { welcomeScreen.style.display = 'none'; }

// ══════════════════════════════════════════
// CODE BLOCK & COPY
// ══════════════════════════════════════════

function parseMarkdown(text) { return marked.parse(text); }

function wrapCodeBlock(pre) {
  if (pre.parentElement?.classList.contains('code-wrapper')) return;
  const code = pre.querySelector('code');
  if (!code) return;

  hljs.highlightElement(code);

  let lang = '';
  code.classList.forEach(c => { if (c.startsWith('language-')) lang = c.replace('language-', ''); });

  const wrapper = document.createElement('div');
  wrapper.classList.add('code-wrapper');

  const header = document.createElement('div');
  header.classList.add('code-header');

  const label = document.createElement('span');
  label.classList.add('code-lang-label');
  label.textContent = lang || 'code';

  const copyBtn = document.createElement('button');
  copyBtn.classList.add('btn-copy-code');
  copyBtn.innerHTML = `<svg width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> Copy`;
  copyBtn.addEventListener('click', () => copyText(code.innerText, copyBtn, 'Copied!'));

  header.appendChild(label);
  header.appendChild(copyBtn);
  pre.parentNode.insertBefore(wrapper, pre);
  wrapper.appendChild(header);
  wrapper.appendChild(pre);
}

function makeProviderBadge(provider) {
  const labels = { deepseek: 'DeepSeek', gemini: 'Gemini' };
  const badge = document.createElement('span');
  badge.classList.add('provider-badge');
  badge.textContent = `via ${labels[provider] || provider} (Groq limit)`;
  return badge;
}

function makeCopyBtn(content) {
  const btn = document.createElement('button');
  btn.classList.add('btn-copy-msg');
  btn.innerHTML = `<svg width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> Copy`;
  btn.addEventListener('click', () => copyText(content, btn, 'Copied'));
  return btn;
}

async function copyText(text, btn, label) {
  try { await navigator.clipboard.writeText(text); }
  catch {
    const ta = Object.assign(document.createElement('textarea'), { value: text, style: 'position:fixed;opacity:0' });
    document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
  }
  const original = btn.innerHTML;
  btn.innerHTML = `<svg width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg> ${label}`;
  btn.classList.add('copied');
  setTimeout(() => { btn.innerHTML = original; btn.classList.remove('copied'); }, 2000);
}

// ══════════════════════════════════════════
// UI HELPERS
// ══════════════════════════════════════════

function setLoading(val) {
  isLoading = val;
  if (val) {
    iconSend.classList.add('hidden');
    iconLoading.classList.remove('hidden');
    btnSend.style.background = 'var(--error)';
    btnSend.title = 'Stop';
  } else {
    iconSend.classList.remove('hidden');
    iconLoading.classList.add('hidden');
    btnSend.style.background = '';
    btnSend.title = 'Kirim';
  }
}

function toggleSidebar() {
  sidebar.classList.toggle('open');
  sidebarOverlay.classList.toggle('open');
}

function closeSidebar() {
  sidebar.classList.remove('open');
  sidebarOverlay.classList.remove('open');
}

function scrollToBottom(force = false) {
  const threshold = 200;
  const nearBottom = chatArea.scrollHeight - chatArea.scrollTop - chatArea.clientHeight < threshold;
  if (nearBottom || force) chatArea.scrollTo({ top: chatArea.scrollHeight, behavior: 'smooth' });
}

function onChatScroll() {
  const dist = chatArea.scrollHeight - chatArea.scrollTop - chatArea.clientHeight;
  btnScrollBottom.style.opacity = dist > 200 ? '1' : '0';
  btnScrollBottom.style.pointerEvents = dist > 200 ? 'auto' : 'none';
}

function autoResize() {
  messageInput.style.height = 'auto';
  messageInput.style.height = Math.min(messageInput.scrollHeight, 130) + 'px';
}

function updateCharCount() {
  const len = messageInput.value.length;
  charCountEl.textContent = `${len}/2000`;
  charCountEl.classList.remove('warn', 'danger');
  if (len > 1800) charCountEl.classList.add('danger');
  else if (len > 1400) charCountEl.classList.add('warn');
}

function onKeyDown(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
}

function now() {
  return new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
