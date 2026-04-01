// ─── STATE ───────────────────────────────────────────
let sessionId = null;
let isTyping = false;
let selectedImageFile = null;
let quickRepliesHidden = false;

// ─── INIT ─────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', async () => {
  setTimeout(() => {
    const loader = document.getElementById('markonix-preloader');
    if (loader) {
      loader.classList.add('exit');
      setTimeout(() => loader.style.display = 'none', 800);
    }
  }, 3000);

  await initSession();
  setupTextarea();
  addDateDivider('Today');
  await sendWelcome();
});

async function initSession() {
  const stored = sessionStorage.getItem('markonix_session');
  if (stored) { sessionId = stored; return; }
  try {
    const res = await fetch('/api/session', { method: 'POST' });
    const data = await res.json();
    sessionId = data.sessionId;
    sessionStorage.setItem('markonix_session', sessionId);
  } catch (e) {
    console.error('Session init failed', e);
    sessionId = 'fallback-' + Date.now();
  }
}

async function sendWelcome() {
  showTyping();
  await delay(800);
  hideTyping();
  addBotMessage("Welcome to Markonix Real Estate! 🏠\n\nI'm your AI property consultant. How can I help you today?\n\nAre you looking for Residential, Commercial, or a Plot?");
}

// ─── SEND MESSAGE ──────────────────────────────────────
async function sendMessage() {
  const input = document.getElementById('user-input');
  const text = input.value.trim();
  if ((!text && !selectedImageFile) || isTyping) return;

  input.value = '';
  input.style.height = 'auto';
  isTyping = true;
  hideQuickReplies();

  if (selectedImageFile) {
    addUserMessage(text, selectedImageFile);
  } else {
    addUserMessage(text);
  }

  showTyping();
  disableSend(true);

  try {
    let reply;
    if (selectedImageFile) {
      reply = await sendImageMessage(text, selectedImageFile);
    } else {
      reply = await sendTextMessage(text);
    }
    clearImage();
    hideTyping();
    addBotMessage(reply);
  } catch (err) {
    hideTyping();
    addBotMessage("Sorry, something went wrong. Please try again in a moment. 🙏");
    console.error(err);
  } finally {
    isTyping = false;
    disableSend(false);
  }
}

async function sendTextMessage(text) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: text, sessionId })
  });
  if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Server error'); }
  const data = await res.json();
  return data.reply;
}

async function sendImageMessage(text, file) {
  const formData = new FormData();
  formData.append('image', file);
  formData.append('message', text || 'Please analyze this property photo');
  formData.append('sessionId', sessionId);
  const res = await fetch('/api/chat/image', { method: 'POST', body: formData });
  if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Server error'); }
  const data = await res.json();
  return data.reply;
}

function sendQuick(text) {
  if (isTyping) return;
  document.getElementById('user-input').value = text;
  sendMessage();
}

// ─── CLEAR CHAT ───────────────────────────────────────
async function clearChat() {
  if (sessionId) fetch(`/api/session/${sessionId}`, { method: 'DELETE' }).catch(() => {});
  sessionStorage.removeItem('markonix_session');
  sessionId = null;
  selectedImageFile = null;

  const msgs = document.getElementById('messages');
  msgs.innerHTML = `
    <div class="welcome-block">
      <div class="welcome-icon">
        <img src="./logoheader.png" alt="Markonix" class="welcome-logo">
      </div>
      <h2>Welcome to Markonix Real Estate</h2>
      <p>Pakistan's premium property consultancy — Karachi to Islamabad</p>
    </div>`;

  const qr = document.getElementById('quick-replies');
  qr.style.display = 'flex';
  qr.style.opacity = '1';
  quickRepliesHidden = false;

  await initSession();
  addDateDivider('Today');
  await sendWelcome();
}

// ─── IMAGE HANDLING ────────────────────────────────────
function handleImageSelect(input) {
  const file = input.files[0];
  if (!file) return;
  selectedImageFile = file;
  const reader = new FileReader();
  reader.onload = (e) => {
    document.getElementById('preview-img').src = e.target.result;
    document.getElementById('image-preview').classList.remove('hidden');
  };
  reader.readAsDataURL(file);
  input.value = '';
}

function clearImage() {
  selectedImageFile = null;
  document.getElementById('image-preview').classList.add('hidden');
  document.getElementById('preview-img').src = '';
}

// ─── DOM HELPERS ──────────────────────────────────────
function addUserMessage(text, imageFile) {
  const msgs = document.getElementById('messages');
  const row = document.createElement('div');
  row.className = 'msg-row user';

  let imgHtml = '';
  if (imageFile) {
    const url = URL.createObjectURL(imageFile);
    imgHtml = `<img src="${url}" alt="property photo" style="max-width:100%;border-radius:8px;margin-bottom:${text ? '8px' : '0'};display:block;">`;
  }

  row.innerHTML = `
    <div>
      <div class="bubble user">${imgHtml}${text ? escHtml(text) : ''}</div>
      <span class="bubble-meta">${getTime()}</span>
    </div>`;
  msgs.appendChild(row);
  scrollBottom();
}

function addBotMessage(text) {
  const msgs = document.getElementById('messages');
  const wb = msgs.querySelector('.welcome-block');
  if (wb) wb.remove();

  const row = document.createElement('div');
  row.className = 'msg-row bot';
  row.innerHTML = `
    <div class="agent-avatar">
      <img src="./logoheader.png" alt="M" class="avatar-logo" onerror="this.style.display='none';this.parentNode.textContent='M'">
    </div>
    <div>
      <div class="bubble bot">${fmt(text)}</div>
      <span class="bubble-meta">Markonix · ${getTime()}</span>
    </div>`;
  msgs.appendChild(row);
  scrollBottom();
}

function addDateDivider(label) {
  const msgs = document.getElementById('messages');
  const div = document.createElement('div');
  div.className = 'date-divider';
  div.textContent = label;
  msgs.appendChild(div);
}

function showTyping() {
  document.getElementById('typing-indicator').classList.add('visible');
  scrollBottom();
}

function hideTyping() {
  document.getElementById('typing-indicator').classList.remove('visible');
}

function hideQuickReplies() {
  if (quickRepliesHidden) return;
  quickRepliesHidden = true;
  const qr = document.getElementById('quick-replies');
  qr.style.transition = 'opacity 0.3s';
  qr.style.opacity = '0';
  setTimeout(() => qr.style.display = 'none', 300);
}

function disableSend(disabled) {
  document.getElementById('send-btn').disabled = disabled;
}

function scrollBottom() {
  const msgs = document.getElementById('messages');
  setTimeout(() => { msgs.scrollTop = msgs.scrollHeight; }, 60);
}

function getTime() {
  return new Date().toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' });
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

// Escape HTML for user messages (plain text)
function escHtml(t) {
  return t
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');
}

// Format bot messages: markdown + links + images
function fmt(t) {
  // 1. Escape HTML
  let out = t
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // 2. Bold **text**
  out = out.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  // 3. Italic *text*
  out = out.replace(/\*(.*?)\*/g, '<em>$1</em>');

  // 4. Property image [PROPERTY_IMAGE:url]
  out = out.replace(/\[PROPERTY_IMAGE:(.*?)\]/g, (_, url) =>
    `<img src="${url.trim()}" alt="Property" style="max-width:100%;border-radius:12px;margin-top:10px;display:block;border:1px solid var(--border);">`
  );

  // 5. Markdown links [text](url) → clickable <a>
  out = out.replace(
    /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" style="color:var(--gold);text-decoration:underline;font-weight:600;">$1 ↗</a>'
  );

  // 6. Newlines → <br>
  out = out.replace(/\n/g, '<br>');

  return out;
}

// ─── TEXTAREA AUTO-RESIZE ──────────────────────────────
function setupTextarea() {
  const ta = document.getElementById('user-input');
  ta.addEventListener('input', () => {
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
  });
  ta.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
}