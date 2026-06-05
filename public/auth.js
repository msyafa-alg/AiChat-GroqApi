// ============================================
// AsefAI — Firebase Auth + Firestore
// ============================================
import { initializeApp }      from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getFirestore, collection, doc, getDocs, getDoc, setDoc, addDoc, updateDoc, deleteDoc, query, orderBy, limit, serverTimestamp }
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

// ── Expose globally ────────────────────────
window.firebaseAuth = auth;
window.firebaseDb   = db;
window.fbUtils = {
  collection, doc, getDocs, getDoc, setDoc,
  addDoc, updateDoc, deleteDoc, query, orderBy,
  limit, serverTimestamp,
};

// ── Auth State ─────────────────────────────
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = '/login.html';
    return;
  }

  window.currentUser = user;
  renderUserInfo(user);

  // Update greeting di welcome screen dengan nama user
  window.addEventListener('DOMContentLoaded', () => updateGreeting(user), { once: true });
  updateGreeting(user);

  window.dispatchEvent(new CustomEvent('authReady', { detail: user }));
});

// ── Update greeting ────────────────────────
function updateGreeting(user) {
  const firstName = user.displayName?.split(' ')[0] || '';
  const titleEl   = document.querySelector('.welcome-title');
  const descEl    = document.getElementById('welcomeDesc');

  if (titleEl && firstName) {
    titleEl.innerHTML = `Halo, <span class="gradient-text">${firstName}</span> 👋`;
  }
  if (descEl && firstName) {
    descEl.innerHTML = `Saya <strong>AsefAI</strong>, siap membantu <em>coding</em>, <em>debugging</em>, <em>belajar</em>, dan pertanyaan apapun.`;
  }
}

// ── Render user info di sidebar ────────────
function renderUserInfo(user) {
  document.getElementById('userInfo')?.remove();

  const footer = document.querySelector('.sidebar-footer');
  if (!footer) return;

  const userInfo = document.createElement('div');
  userInfo.id = 'userInfo';
  userInfo.style.cssText = `
    display:flex; align-items:center; gap:9px;
    padding:8px 6px; border-top:1px solid rgba(255,255,255,0.06); margin-top:4px;
  `;

  const avatar = document.createElement('img');
  avatar.src = user.photoURL || '';
  avatar.alt = user.displayName || 'User';
  avatar.style.cssText = `width:28px;height:28px;border-radius:50%;border:1px solid rgba(255,255,255,0.1);flex-shrink:0;object-fit:cover;`;
  avatar.onerror = () => { avatar.style.display = 'none'; fallback.style.display = 'flex'; };

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
