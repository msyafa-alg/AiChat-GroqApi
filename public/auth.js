// ============================================
// AsefAI — Firebase Auth + Firestore
// Support: Google, GitHub, Guest (3x free)
// ============================================
import { initializeApp }      from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getFirestore, collection, doc, getDocs, getDoc, setDoc, addDoc, updateDoc, deleteDoc, query, orderBy, serverTimestamp }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey:            "AIzaSyBywDv13f0_psOCQuubzpQx53lwwEYqt8s",
  authDomain:        "syafaproject1.firebaseapp.com",
  projectId:         "syafaproject1",
  storageBucket:     "syafaproject1.firebasestorage.app",
  messagingSenderId: "722247897392",
  appId:             "1:722247897392:web:29f4221a793fe864be38f5",
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

const GUEST_KEY     = 'asefai_guest_count';
const MAX_GUEST     = 3;

// ── Expose globally ────────────────────────
window.firebaseAuth = auth;
window.firebaseDb   = db;
window.fbUtils = { collection, doc, getDocs, getDoc, setDoc, addDoc, updateDoc, deleteDoc, query, orderBy, serverTimestamp };

// ── Cek apakah guest mode ─────────────────
const isGuestMode = sessionStorage.getItem('asefai_guest_mode') === 'true';

// ── Auth State ─────────────────────────────
onAuthStateChanged(auth, (user) => {
  if (user) {
    // User login — hapus guest mode
    sessionStorage.removeItem('asefai_guest_mode');
    window.currentUser = user;
    window.isGuest = false;
    renderUserInfo(user);
    updateGreeting(user);
    window.dispatchEvent(new CustomEvent('authReady', { detail: user }));
  } else if (isGuestMode) {
    // Guest mode — boleh masuk tapi terbatas
    window.currentUser = null;
    window.isGuest = true;
    renderGuestInfo();
    window.dispatchEvent(new CustomEvent('authReady', { detail: null }));
  } else {
    // Tidak login & bukan guest → ke login
    window.location.href = '/login.html';
  }
});

// ── Expose fungsi increment guest ─────────
window.incrementGuestCount = function() {
  const current = parseInt(localStorage.getItem(GUEST_KEY) || '0');
  const next = current + 1;
  localStorage.setItem(GUEST_KEY, next.toString());

  if (next >= MAX_GUEST) {
    // Batas habis — tampilkan modal login
    showLoginPrompt();
  }
  return next;
};

window.getGuestCount = function() {
  return parseInt(localStorage.getItem(GUEST_KEY) || '0');
};

window.isGuestLimitReached = function() {
  return parseInt(localStorage.getItem(GUEST_KEY) || '0') >= MAX_GUEST;
};

// ── Modal prompt login ─────────────────────
function showLoginPrompt() {
  // Hapus modal lama kalau ada
  document.getElementById('loginPromptModal')?.remove();

  const overlay = document.createElement('div');
  overlay.id = 'loginPromptModal';
  overlay.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,0.8);
    z-index:1000;display:flex;align-items:center;justify-content:center;
    padding:24px;backdrop-filter:blur(4px);animation:fadeIn .2s ease;
  `;

  overlay.innerHTML = `
    <div style="
      background:#111;border:1px solid rgba(255,255,255,0.1);
      border-radius:20px;padding:32px;max-width:340px;width:100%;
      text-align:center;display:flex;flex-direction:column;gap:16px;
      box-shadow:0 24px 64px rgba(0,0,0,0.7);
    ">
      <div style="font-size:32px">🔒</div>
      <div>
        <h2 style="font-size:18px;font-weight:700;margin-bottom:6px;color:#f0f0f0">Batas percakapan gratis</h2>
        <p style="font-size:13px;color:#666;line-height:1.6">
          Kamu sudah menggunakan <strong style="color:#e0e0e0">3 percakapan gratis</strong>.<br/>
          Login untuk melanjutkan tanpa batas.
        </p>
      </div>
      <a href="/login.html" style="
        display:block;background:#fff;color:#111;
        border-radius:10px;padding:11px;font-size:14px;
        font-weight:600;text-decoration:none;
        transition:background .15s;
      ">Login Sekarang</a>
      <p style="font-size:11px;color:#333">
        Gratis selamanya · Riwayat tersimpan · Tanpa iklan
      </p>
    </div>
  `;

  document.body.appendChild(overlay);
}

// ── Update greeting ────────────────────────
function updateGreeting(user) {
  const firstName = user?.displayName?.split(' ')[0] || '';
  const titleEl   = document.querySelector('.welcome-title');
  const descEl    = document.getElementById('welcomeDesc');

  if (titleEl && firstName) {
    titleEl.innerHTML = `Halo, <span class="gradient-text">${firstName}</span> 👋`;
  }
  if (descEl) {
    descEl.innerHTML = `Saya <strong>AsefAI</strong>, siap membantu <em>coding</em>, <em>debugging</em>, <em>belajar</em>, dan pertanyaan apapun.`;
  }
}

// ── Render user info (logged in) ───────────
function renderUserInfo(user) {
  document.getElementById('userInfo')?.remove();

  const footer = document.querySelector('.sidebar-footer');
  if (!footer) return;

  const userInfo = document.createElement('div');
  userInfo.id = 'userInfo';
  userInfo.style.cssText = `display:flex;align-items:center;gap:9px;padding:8px 6px;border-top:1px solid rgba(255,255,255,0.06);margin-top:4px;`;

  const avatar = document.createElement('img');
  avatar.src = user.photoURL || '';
  avatar.style.cssText = `width:28px;height:28px;border-radius:50%;border:1px solid rgba(255,255,255,0.1);flex-shrink:0;object-fit:cover;`;
  avatar.onerror = () => { avatar.style.display='none'; fallback.style.display='flex'; };

  const fallback = document.createElement('div');
  fallback.style.cssText = `width:28px;height:28px;border-radius:50%;background:#fff;color:#0a0a0a;display:none;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0;`;
  fallback.textContent = (user.displayName || user.email || 'U')[0].toUpperCase();

  const info = document.createElement('div');
  info.style.cssText = 'flex:1;min-width:0;';

  const name = document.createElement('div');
  name.style.cssText = 'font-size:12px;font-weight:600;color:#e0e0e0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
  name.textContent = user.displayName || 'User';

  const email = document.createElement('div');
  email.style.cssText = 'font-size:10.5px;color:#555;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
  email.textContent = user.email || '';

  const btnLogout = document.createElement('button');
  btnLogout.title = 'Logout';
  btnLogout.style.cssText = `background:none;border:none;color:#444;cursor:pointer;padding:4px;border-radius:4px;flex-shrink:0;transition:color .15s,background .15s;`;
  btnLogout.innerHTML = `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`;
  btnLogout.addEventListener('mouseenter', () => { btnLogout.style.color='#f87171'; btnLogout.style.background='rgba(248,113,113,0.1)'; });
  btnLogout.addEventListener('mouseleave', () => { btnLogout.style.color='#444'; btnLogout.style.background='none'; });
  btnLogout.addEventListener('click', async () => {
    await signOut(auth);
    sessionStorage.removeItem('asefai_guest_mode');
    window.location.href = '/login.html';
  });

  info.appendChild(name);
  info.appendChild(email);
  userInfo.appendChild(avatar);
  userInfo.appendChild(fallback);
  userInfo.appendChild(info);
  userInfo.appendChild(btnLogout);
  footer.appendChild(userInfo);
}

// ── Render guest info ──────────────────────
function renderGuestInfo() {
  document.getElementById('userInfo')?.remove();

  const footer = document.querySelector('.sidebar-footer');
  if (!footer) return;

  const used = parseInt(localStorage.getItem(GUEST_KEY) || '0');
  const sisa = Math.max(0, MAX_GUEST - used);

  const guestInfo = document.createElement('div');
  guestInfo.id = 'userInfo';
  guestInfo.style.cssText = `display:flex;flex-direction:column;gap:8px;padding:8px 6px;border-top:1px solid rgba(255,255,255,0.06);margin-top:4px;`;

  const counter = document.createElement('div');
  counter.style.cssText = 'font-size:11.5px;color:#666;text-align:center;';
  counter.innerHTML = `Tamu · <span style="color:#e0e0e0;font-weight:600">${sisa}</span> percakapan tersisa`;

  const btnLogin = document.createElement('a');
  btnLogin.href = '/login.html';
  btnLogin.style.cssText = `display:block;background:#1a1a1a;border:1px solid rgba(255,255,255,0.1);color:#e0e0e0;border-radius:7px;padding:7px;font-size:12px;font-weight:500;text-align:center;text-decoration:none;transition:all .15s;`;
  btnLogin.textContent = 'Login untuk akses penuh';
  btnLogin.addEventListener('mouseenter', () => { btnLogin.style.borderColor='rgba(255,255,255,0.25)'; });
  btnLogin.addEventListener('mouseleave', () => { btnLogin.style.borderColor='rgba(255,255,255,0.1)'; });

  guestInfo.appendChild(counter);
  guestInfo.appendChild(btnLogin);
  footer.appendChild(guestInfo);
}
