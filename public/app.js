// ============================================
// AsefAI — Frontend Logic
// Features: Streaming, Auth, Firestore,
//           localStorage backup, Regenerate,
//           Personal Greeting, Model Selector,
//           System Prompt, Token Counter
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
const btnModelSelector   = document.getElementById('btnModelSelector');
const modelSelectorLabel = document.getElementById('modelSelectorLabel');
const modelDropdown      = document.getElementById('modelDropdown');
const btnSystemPrompt    = document.getElementById('btnSystemPrompt');
const systemPromptBar    = document.getElementById('systemPromptBar');
const systemPromptInput  = document.getElementById('systemPromptInput');
const btnCloseSystemPrompt = document.getElementById('btnCloseSystemPrompt');
const btnApplySystemPrompt = document.getElementById('btnApplySystemPrompt');
const spCharCount        = document.getElementById('spCharCount');

// ── State ─────────────────────────────────
let isLoading        = false;
let abortController  = null;
let currentModel     = 'llama-3.3-70b-versatile';
let systemPrompt     = '';
let totalTokens      = 0;
let sessions         = [];
let activeSession    = null;
let currentUser      = null;
const LS_KEY         = 'asefai_sessions';

// ── Boot — tunggu auth siap ───────────────
window.addEventListener('authReady', (e) => {
  currentUser = e.detail;
  init();
});

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
    opt.addEventListener('click', () => selectModel(opt.dataset.model, opt.dataset.label));
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

  // Load sessions dari localStorage dulu (instant)
  loadFromLocalStorage();

  // Lalu sync dari Firestore (background)
  loadFromFirestore();
}

// ══════════════════════════════════════════
// PERSISTENCE — localStorage + Firestore
// ══════════════════════════════════════════

function saveToLocalStorage() {
  try {
    const data = sessions.map(s => ({
      id: s.id,
      title: s.title,
      history: s.history,
      tokens: s.tokens,
    }));
    localStorage.setItem(LS_KEY + '_' + currentUser.uid, JSON.stringify(data));
  } catch (e) { /* storage full, skip */ }
}

function loadFromLocalStorage() {
  try {
    const raw = localStorage.getItem(LS_KEY + '_' + currentUser.uid);
    if (raw) {
      const data = JSON.parse(raw);
      sessions = data.map(s => ({ ...s, firestoreId: null }));
      if (sessions.length > 0) {
        activeSession = sessions[sessions.length - 1].id;
        switchSession(activeSession);
      } else {
        createNewSession();
      }
    } else {
      createNewSession();
    }
  } catch {
    createNewSession();
  }
}

async function loadFromFirestore() {
  if (!window.firebaseDb || !currentUser) return;
  const { collection, getDocs, query, orderBy } = window.fbUtils;
  const db = window.firebaseDb;

  try {
    const q = query(
      collection(db, 'users', currentUser.uid, 'sessions'),
      orderBy('updatedAt', 'desc')
    );
    const snap = await getDocs(q);
    if (snap.empty) return;

    const fsessions = [];
    for (const docSnap of snap.docs) {
      const data = docSnap.data();
      // Load messages subcollection
      const msgsSnap = await getDocs(
        query(collection(db, 'users', currentUser.uid, 'sessions', docSnap.id, 'messages'), orderBy('createdAt'))
      );
      const history = msgsSnap.docs.map(m => ({
        role: m.data().role,
        content: m.data().content,
      }));
      fsessions.push({
        id: docSnap.id,
        firestoreId: docSnap.id,
        title: data.title || 'Chat',
        history,
        tokens: data.tokens || 0,
      });
    }

    if (fsessions.length > 0) {
      sessions = fsessions;
      const last = sessions[0]; // paling baru
      activeSession = last.id;
      switchSession(activeSession);
      saveToLocalStorage();
    }
  } catch (e) {
    console.warn('Firestore load error:', e.message);
  }
}

async function saveSessionToFirestore(session) {
  if (!window.firebaseDb || !currentUser) return;
  const { collection, doc, setDoc, addDoc, serverTimestamp } = window.fbUtils;
  const db = window.firebaseDb;

  try {
    const sessionRef = session.firestoreId
      ? doc(db, 'users', currentUser.uid, 'sessions', session.firestoreId)
      : doc(collection(db, 'users', currentUser.uid, 'sessions'));

    await setDoc(sessionRef, {
      title: session.title,
      tokens: session.tokens,
      updatedAt: serverTimestamp(),
    }, { merge: true });

    if (!session.firestoreId) {
      session.firestoreId = sessionRef.id;
      session.id = sessionRef.id;
    }

    // Simpan pesan terakhir
    const lastMsg = session.history[session.history.length - 1];
    if (lastMsg) {
      await addDoc(
        collection(db, 'users', currentUser.uid, 'sessions', session.firestoreId, 'messages'),
        { role: lastMsg.role, content: lastMsg.content, createdAt: serverTimestamp() }
      );
    }
  } catch (e) {
    console.warn('Firestore save error:', e.message);
  }
}

async function deleteSessionFromFirestore(firestoreId) {
  if (!window.firebaseDb || !currentUser || !firestoreId) return;
  const { doc, deleteDoc } = window.fbUtils;
  const db = window.firebaseDb;
  try {
    await deleteDoc(doc(db, 'users', currentUser.uid, 'sessions', firestoreId));
  } catch (e) { /* skip */ }
}

// ══════════════════════════════════════════
// SESSION MANAGEMENT
// ══════════════════════════════════════════

function createNewSession(autoSwitch = true) {
  const id = Date.now().toString();
  const session = { id, firestoreId: null, title: 'New Chat', history: [], tokens: 0 };
  sessions.push(session);
  if (autoSwitch) switchSession(id);
  return session;
}

function switchSession(id) {
  activeSession = id;
  const session = getSession(id);
  if (!session) return;

  messagesEl.innerHTML = '';
  totalTokens = session.tokens;
  updateTokenCounter();
  headerTitle.textContent = session.title;

  if (session.history.length === 0) {
    showWelcome();
  } else {
    hideWelcome();
    session.history.forEach(msg => {
      if (msg.role === 'user') renderUserBubble(msg.content, false);
      else if (msg.role === 'assistant') renderAiBubble(msg.content, false);
    });
    scrollToBottom(true);
  }
  renderSidebar();
}

function getSession(id) { return sessions.find(s => s.id === id); }
function getActiveSession() { return getSession(activeSession); }

function deleteSession(id) {
  const s = getSession(id);
  if (s?.firestoreId) deleteSessionFromFirestore(s.firestoreId);
  sessions = sessions.filter(s => s.id !== id);
  saveToLocalStorage();
  if (activeSession === id) {
    if (sessions.length === 0) createNewSession();
    else switchSession(sessions[sessions.length - 1].id);
  } else {
    renderSidebar();
  }
}

function renderSidebar() {
  chatHistoryEl.innerHTML = '';
  const withHistory = sessions.filter(s => s.history.length > 0).reverse();

  if (withHistory.length === 0) {
    chatHistoryEl.innerHTML = `
      <div class="history-empty">
        <svg width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.2" viewBox="0 0 24 24" opacity="0.3">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
        </svg>
        <span>Belum ada sesi</span>
      </div>`;
    return;
  }

  withHistory.forEach(session => {
    const item = document.createElement('div');
    item.classList.add('session-item');
    if (session.id === activeSession) item.classList.add('active');

    const text = document.createElement('span');
    text.classList.add('session-item-text');
    text.textContent = session.title;

    const del = document.createElement('button');
    del.classList.add('session-item-del');
    del.innerHTML = '×';
    del.addEventListener('click', (e) => { e.stopPropagation(); deleteSession(session.id); });

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

  if (session.history.length === 1) {
    session.title = message.length > 36 ? message.slice(0, 36) + '…' : message;
    headerTitle.textContent = session.title;
    renderSidebar();
  }

  messageInput.value = '';
  updateCharCount();
  autoResize();

  await streamAIResponse(session, session.history);
}

async function streamAIResponse(session, historySnapshot) {
  setLoading(true);
  const { row, bubble, footer } = createAiBubbleEl();
  messagesEl.appendChild(row);
  scrollToBottom();

  let fullText = '';

  // Greeting personal — inject nama user ke system prompt
  const userName = currentUser?.displayName?.split(' ')[0] || '';
  const extraContext = userName
    ? `\nNama pengguna saat ini adalah ${userName}. Sapa dengan namanya jika ini adalah pesan pertama.`
    : '';

  try {
    abortController = new AbortController();

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: historySnapshot[historySnapshot.length - 1].content,
        history: historySnapshot.slice(0, -1),
        model: currentModel,
        systemPrompt: (systemPrompt || '') + extraContext,
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

    const reader  = res.body.getReader();
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

          if (parsed.done) {
            finalizeBubble(bubble, footer, fullText, session, row);
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
        finalizeBubble(bubble, footer, fullText, session, row);
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

function finalizeBubble(bubble, footer, fullText, session, row) {
  bubble.innerHTML = parseMarkdown(fullText);
  bubble.querySelectorAll('pre').forEach(pre => wrapCodeBlock(pre));
  footer.appendChild(makeCopyBtn(fullText));

  // Tombol regenerate
  footer.appendChild(makeRegenBtn(session));

  session.history.push({ role: 'assistant', content: fullText });

  // Token estimasi
  const lastUserMsg = session.history[session.history.length - 2]?.content || '';
  session.tokens += Math.ceil((lastUserMsg.length + fullText.length) / 4);
  totalTokens = sessions.reduce((a, s) => a + s.tokens, 0);
  updateTokenCounter();

  renderSidebar();
  saveToLocalStorage();
  saveSessionToFirestore(session);
}

// ── Regenerate ─────────────────────────────
function makeRegenBtn(session) {
  const btn = document.createElement('button');
  btn.classList.add('btn-copy-msg');
  btn.innerHTML = `<svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg> Regenerate`;
  btn.addEventListener('click', async () => {
    // Hapus respons AI terakhir dari history dan UI
    if (session.history[session.history.length - 1]?.role === 'assistant') {
      session.history.pop();
    }
    // Hapus bubble terakhir (AI)
    const allRows = messagesEl.querySelectorAll('.msg-row.ai');
    allRows[allRows.length - 1]?.remove();

    // Kirim ulang
    await streamAIResponse(session, [...session.history]);
  });
  return btn;
}

function stopStream() { abortController?.abort(); }

// ══════════════════════════════════════════
// RENDER HELPERS
// ══════════════════════════════════════════

function renderUserBubble(content, append = true) {
  const row = document.createElement('div');
  row.classList.add('msg-row', 'user');

  const inner = document.createElement('div');
  inner.classList.add('msg-inner');

  const header = document.createElement('div');
  header.classList.add('msg-header');
  header.style.flexDirection = 'row-reverse';

  const avatar = document.createElement('div');
  avatar.classList.add('msg-avatar');

  // Pakai foto user kalau ada
  if (currentUser?.photoURL) {
    const img = document.createElement('img');
    img.src = currentUser.photoURL;
    img.style.cssText = 'width:100%;height:100%;border-radius:7px;object-fit:cover;';
    img.onerror = () => { img.remove(); avatar.textContent = (currentUser.displayName || 'K')[0].toUpperCase(); };
    avatar.appendChild(img);
  } else {
    avatar.textContent = (currentUser?.displayName || 'K')[0].toUpperCase();
  }

  const sender = document.createElement('div');
  sender.classList.add('msg-sender');
  sender.textContent = currentUser?.displayName?.split(' ')[0] || 'Kamu';

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
  if (append) { messagesEl.appendChild(row); scrollToBottom(); }
  else messagesEl.appendChild(row);
}

function renderAiBubble(content, append = true) {
  const { row, bubble, footer } = createAiBubbleEl();
  bubble.innerHTML = parseMarkdown(content);
  bubble.querySelectorAll('pre').forEach(pre => wrapCodeBlock(pre));
  footer.appendChild(makeCopyBtn(content));
  if (append) { messagesEl.appendChild(row); scrollToBottom(); }
  else messagesEl.appendChild(row);
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
  document.querySelectorAll('.model-option').forEach(o => o.classList.remove('active'));
  document.querySelector(`[data-model="${model}"]`)?.classList.add('active');
  modelSelectorLabel.textContent = label;
  currentModelLabel.textContent = label;
  if (welcomeModelEl) welcomeModelEl.textContent = label;
  modelDropdown.classList.remove('open');
  btnModelSelector.classList.remove('open');
}

// ══════════════════════════════════════════
// SYSTEM PROMPT
// ══════════════════════════════════════════

function toggleSystemPromptBar() {
  systemPromptBar.classList.toggle('hidden');
  if (!systemPromptBar.classList.contains('hidden')) systemPromptInput.focus();
}

function applySystemPrompt() {
  systemPrompt = systemPromptInput.value.trim();
  systemPromptBar.classList.add('hidden');
  renderSystemPromptBadge();
}

function renderSystemPromptBadge() {
  document.querySelector('.sp-active-badge')?.remove();
  if (!systemPrompt) return;

  const badge = document.createElement('div');
  badge.classList.add('sp-active-badge');
  badge.innerHTML = `<svg width="10" height="10" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14"/></svg> System prompt aktif`;
  badge.addEventListener('click', toggleSystemPromptBar);
  document.getElementById('inputBox').parentElement.insertBefore(badge, document.getElementById('inputBox'));
}

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

function updateTokenCounter() {
  if (tokenCountEl) tokenCountEl.textContent = totalTokens.toLocaleString('id-ID');
}

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

function newChat() {
  stopStream();
  createNewSession();
  messageInput.focus();
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
  totalTokens = sessions.reduce((a, s) => a + s.tokens, 0);
  updateTokenCounter();
  headerTitle.textContent = 'New Chat';
  showWelcome();
  renderSidebar();
  saveToLocalStorage();
}

function showWelcome() { welcomeScreen.style.display = 'flex'; }
function hideWelcome()  { welcomeScreen.style.display = 'none'; }

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
