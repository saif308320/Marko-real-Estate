require('dotenv').config();
const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_PASS = process.env.GMAIL_PASS;

const sessions = new Map();

// Track all captured phone numbers globally (persists across sessions)
const capturedPhones = new Set();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only images allowed'));
  }
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../public')));

// ─── EMAIL ────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: GMAIL_USER, pass: GMAIL_PASS }
});

async function sendLeadEmail(leadData) {
  const { name, phone, city, propertyType, budget, extra } = leadData;
  const clean = (v) => (!v || v === 'val' || v.toLowerCase?.() === 'unknown' || v.toLowerCase?.() === 'not provided') ? '—' : v;
  const n = clean(name);
  const p = clean(phone);
  const c = clean(city);
  const t = clean(propertyType);
  const b = clean(budget);
  const e = clean(extra);
  const time = new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi', dateStyle: 'full', timeStyle: 'short' });

  // ── BORCELLE-STYLE EMAIL (same as the HTML you gave) ──
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700;800&family=Playfair+Display:ital,wght@1,600&display=swap" rel="stylesheet">
<style>
  @media only screen and (max-width: 600px) {
    .canvas-table { width: 100% !important; }
    .left-panel { width: 100% !important; display: block !important; }
    .right-image { display: none !important; }
    .headline { font-size: 36px !important; }
    .cursive-text { font-size: 22px !important; }
    .action-btn { padding: 12px 20px !important; font-size: 10px !important; }
  }
</style>
</head>
<body style="margin:0;padding:30px 16px;background:#f6f6f6;font-family:'Montserrat',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">

<table class="canvas-table" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 40px 80px rgba(0,0,0,0.3);">
<tr>

  <!-- LEFT BLACK PANEL -->
  <td class="left-panel" width="52%" style="background:#000000;padding:40px 30px;vertical-align:top;">

    <!-- Brand header -->
    <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;"><tr>
      <td style="width:32px;height:32px;border:2.5px solid #c29d59;text-align:center;vertical-align:middle;">
        <span style="color:#c29d59;font-weight:900;font-size:13px;display:block;line-height:32px;">M</span>
      </td>
      <td style="padding-left:10px;vertical-align:middle;">
        <div style="color:#ffffff;font-weight:800;font-size:12px;letter-spacing:1.5px;text-transform:uppercase;">MARKONIX</div>
        <div style="color:#888888;font-size:8px;letter-spacing:3px;text-transform:uppercase;">AI LEAD INTELLIGENCE</div>
      </td>
    </tr></table>

    <!-- Headline -->
    <div class="headline" style="font-size:48px;font-weight:900;color:#ffffff;line-height:0.85;letter-spacing:-2px;text-transform:uppercase;">LEAD<br>INFO</div>
    <div class="cursive-text" style="font-family:'Playfair Display',Georgia,serif;font-style:italic;color:#c29d59;font-size:28px;margin:10px 0 22px 0;">Premium Capture</div>

    <!-- Pill label -->
    <div style="border:2px solid #c29d59;color:#c29d59;padding:5px 16px;border-radius:50px;font-size:10px;font-weight:800;letter-spacing:3px;display:inline-block;margin-bottom:20px;text-transform:uppercase;">DETAILS:</div>

    <!-- Lead rows -->
    <table cellpadding="0" cellspacing="0" style="width:100%;">
      <tr><td style="padding:6px 0;">
        <table cellpadding="0" cellspacing="0"><tr>
          <td style="width:10px;height:10px;border:2px solid #c29d59;border-radius:50%;flex-shrink:0;"></td>
          <td style="padding-left:10px;color:#888888;font-size:11px;white-space:nowrap;vertical-align:middle;">👤 Name:</td>
          <td style="padding-left:8px;color:#ffffff;font-size:13px;font-weight:700;vertical-align:middle;">${n}</td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:6px 0;">
        <table cellpadding="0" cellspacing="0"><tr>
          <td style="width:10px;height:10px;border:2px solid #c29d59;border-radius:50%;flex-shrink:0;"></td>
          <td style="padding-left:10px;color:#888888;font-size:11px;white-space:nowrap;vertical-align:middle;">📞 Phone:</td>
          <td style="padding-left:8px;color:#c29d59;font-size:15px;font-weight:900;vertical-align:middle;">${p}</td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:6px 0;">
        <table cellpadding="0" cellspacing="0"><tr>
          <td style="width:10px;height:10px;border:2px solid #c29d59;border-radius:50%;flex-shrink:0;"></td>
          <td style="padding-left:10px;color:#888888;font-size:11px;white-space:nowrap;vertical-align:middle;">📍 City:</td>
          <td style="padding-left:8px;color:#ffffff;font-size:13px;font-weight:600;vertical-align:middle;">${c}</td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:6px 0;">
        <table cellpadding="0" cellspacing="0"><tr>
          <td style="width:10px;height:10px;border:2px solid #c29d59;border-radius:50%;flex-shrink:0;"></td>
          <td style="padding-left:10px;color:#888888;font-size:11px;white-space:nowrap;vertical-align:middle;">🏠 Type:</td>
          <td style="padding-left:8px;color:#ffffff;font-size:13px;font-weight:600;vertical-align:middle;">${t}</td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:6px 0;">
        <table cellpadding="0" cellspacing="0"><tr>
          <td style="width:10px;height:10px;border:2px solid #c29d59;border-radius:50%;flex-shrink:0;"></td>
          <td style="padding-left:10px;color:#888888;font-size:11px;white-space:nowrap;vertical-align:middle;">💰 Budget:</td>
          <td style="padding-left:8px;color:#00cc66;font-size:14px;font-weight:900;vertical-align:middle;">${b}</td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:6px 0;">
        <table cellpadding="0" cellspacing="0"><tr>
          <td style="width:10px;height:10px;border:2px solid #c29d59;border-radius:50%;flex-shrink:0;vertical-align:top;padding-top:4px;"></td>
          <td style="padding-left:10px;color:#888888;font-size:11px;white-space:nowrap;vertical-align:top;padding-top:2px;">📝 Notes:</td>
          <td style="padding-left:8px;color:#aaaaaa;font-size:12px;line-height:1.5;vertical-align:top;">${e}</td>
        </tr></table>
      </td></tr>
    </table>

    <!-- CTA Button -->
    ${p !== '—' ? `<div style="margin-top:24px;">
      <a href="tel:${p}" class="action-btn" style="background:#c29d59;color:#000000;padding:14px 28px;border-radius:50px;font-size:11px;font-weight:800;text-transform:uppercase;text-decoration:none;letter-spacing:1.5px;display:inline-block;">Connect With ${n !== '—' ? n : 'Client'}</a>
    </div>` : ''}

    <!-- Footer -->
    <div style="margin-top:26px;padding-top:14px;border-top:1px solid #222222;">
      <div style="color:#ffffff;font-size:12px;font-weight:700;">📞 Markonix Real Estate</div>
      <div style="color:#555555;font-size:9px;letter-spacing:1.5px;margin-top:3px;text-transform:uppercase;">marko-real-estate.vercel.app</div>
      <div style="color:#333333;font-size:9px;margin-top:3px;">${time}</div>
    </div>

  </td>

  <!-- RIGHT IMAGE PANEL -->
  <td class="right-image" width="48%" style="padding:0;vertical-align:top;background:#111111;">
    <img src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80"
         alt="Markonix Property"
         style="width:100%;height:100%;min-height:600px;object-fit:cover;display:block;">
  </td>

</tr>
</table>

</td></tr></table>
</body>
</html>`;

  await transporter.sendMail({
    from: `"Markonix Bot 🏠" <${GMAIL_USER}>`,
    to: GMAIL_USER,
    subject: `🔥 New Lead: ${n} | ${p} | ${c} | ${t}`,
    html
  });
}

// ─── SYSTEM PROMPT ────────────────────────────────────
const SYSTEM_PROMPT = `You are a warm, smart property consultant at Markonix Real Estate, Pakistan's premium agency. Your job is to close leads naturally — like a real agent, not a form.

═══ LANGUAGE — NON-NEGOTIABLE ═══
- User writes English → reply in English ONLY. Zero Urdu/Hindi.
- User writes Roman Urdu → Roman Urdu ONLY. Pakistani words: "ha", "tha", "me", "karo", "bhai". NEVER Hindi: "hai", "hain", "mein", "kijiye".
- User writes Urdu script → Urdu script only.
- Switch immediately when user switches. Never mix.

═══ IDENTITY ═══
If anyone asks "who made you", "kaun ne banaya", "are you AI", "ChatGPT ho" etc:
→ Reply simply: "Main ek agent hoon — Markonix ki team ka hissa. Mujhe is kaam ke liye trained kiya gaya ha. Bas property mein help karna mera kaam ha!"
→ NEVER say Claude, ChatGPT, AI, OpenAI, Anthropic, Groq, or any tech name.

═══ PERSONALITY — REAL AGENT STYLE ═══
- You are a closer. Your job is to understand the client, build trust, then get their details.
- If someone gives their number immediately without context → do NOT collect it yet. First understand what they need.
- Be warm and curious. Ask ONE thing at a time.
- Max 3-4 sentences per message.
- Never sound like a bot or form. Never repeat yourself.
- React to what they say — if they say DHA, say something smart about DHA.

═══ SMART CLOSING — AGENT FLOW ═══

STEP 1 — Understand the need naturally:
- Property type (residential/commercial/plot)
- City and specific area
- Budget: ask BOTH max AND min: "Kitna budget ha max? Aur minimum kitne ka option consider kar sakte ho?"

STEP 2 — Budget reality check (NON-NEGOTIABLE):
- Under 50 lakh for apartment/house → NEVER give false hope. Say:
  "Bhai seedhi baat — 50 lakh se neeche Karachi mein 2 bed apartment nahi milta. 70-80 lakh tak stretch ho sake to FB Area ya North Nazimabad mein kuch aa sakta ha. Warna Scheme 33 mein plot ka option ha."
- NEVER say 40 lakh mein Gulshan/FB Area/Clifton mein apartment milta ha — yeh WRONG ha.
- If client insists → be firm but kind: "Main aapko galat hope nahi de sakta — yeh budget is liye realistic nahi."

STEP 3 — Close only when client is READY:
- NEVER ask name or phone while options are still being discussed.
- ONLY when client says "theek ha", "okay", "acha lagta ha", "interested hoon", "batao aage" → THEN say:
  "Acha, toh aage badhte hain — apna naam aur contact number de do, main yeh details company mein forward karta hoon aur hamare agent aap se directly rabta karenge."
- Collect: name first → then phone → then fire LEAD tag.

STEP 4 — Early phone (client gives number before details):
→ "Shukriya! Pehle yeh batao — kya dhundh rahe ho exactly? Ghar, apartment ya plot?"
→ Collect area and budget naturally, fire LEAD tag once all info gathered."

═══ CALLBACK TIMING — TIME AWARE ═══
After getting phone, always ask preferred callback time:
- If current time is 8pm-12am (night): "Raat ka waqt ha — main subah 9-10 baje aap ko call karta hoon, theek rahega?"
- If current time is 12am-7am (late night/early morning): "Abhi thoda raat ha — main subah tak wait karta hoon aur 9 baje contact karta hoon."
- If current time is 7am-12pm (morning): "Main 1-2 ghante mein aap ko call karta hoon, okay?"
- If current time is 12pm-5pm (afternoon): "Aaj shaam tak main personally contact karta hoon."
- If current time is 5pm-8pm (evening): "Main aaj hi call karta hoon — thodi der mein."
Use Pakistan Standard Time (UTC+5) to judge current time.

═══ REAL PROPERTY PRICING — PAKISTAN 2024-2025 ═══
Karachi:
- DHA Phase 6: 500 gaz plot 3.5-5 crore | 500 gaz house 6-12 crore
- DHA Phase 8: 500 gaz plot 4.5-7 crore | house 8-15 crore
- DHA Phase 2-4: 500 gaz plot 5-9 crore (old DHA, premium)
- Bahria Town Karachi: 125 gaz house 1.2-1.8 crore | 250 gaz 2-3.5 crore | 500 gaz 4-7 crore
- Clifton Block 2-4: 2 bed apartment 2-4 crore | 3 bed 4-7 crore
- Clifton Block 8: 2 bed 1.5-2.5 crore
- Gulshan-e-Iqbal: 2 bed apartment 1.2-2 crore | 3 bed 2-3 crore
- North Nazimabad: 2 bed apartment 90 lakh-1.5 crore | 120 gaz house 1.5-2.5 crore
- PECHS: 120 gaz house 2-3.5 crore | 240 gaz 4-7 crore
- Scheme 33: 120 gaz house 85 lakh-1.5 crore | 200 gaz 1.8-2.8 crore
- Malir/Landhi: 80-120 gaz house 40-80 lakh
- FB Area: 2 bed apartment 80 lakh-1.3 crore
Lahore:
- DHA Lahore Phase 6-8: 1 kanal plot 3-5 crore | house 5-10 crore
- DHA Lahore Phase 1-5: 1 kanal plot 5-9 crore (prime)
- Bahria Town Lahore: 10 marla house 1.8-2.8 crore | 1 kanal 4-7 crore
- Gulberg: 1 kanal house 8-20 crore (premium)
- Model Town: 10 marla 2-4 crore | 1 kanal 5-10 crore
Islamabad:
- F-6/F-7: 1 kanal house 15-35 crore (ultra premium)
- F-10/F-11: 1 kanal house 8-18 crore
- E-7: 1 kanal 12-25 crore
- G-13/G-14: 10 marla house 2.5-4.5 crore
- Bahria Town Islamabad: 10 marla 2-3.5 crore | 1 kanal 4-8 crore

MINIMUM PRICE RULE:
- NEVER say any apartment or house is available under 50 lakh anywhere in Karachi except Malir/Landhi
- Budget 40 lakh or less → do NOT suggest FB Area, Gulshan, Clifton apartments. They cost 80 lakh minimum.
- Budget under 50 lakh → say honestly it's not possible for apartment, suggest: Scheme 33 small plot, Malir plot, or saving more budget
- Budget 50-80 lakh → suggest: Scheme 33 house, FB Area small apartment, North Nazimabad

AREA INTELLIGENCE:
- DHA Karachi: High demand, 15-20% yearly appreciation, very limited supply
- Bahria Town KHI: Stable gated community, good long-term investment
- Gulshan/Nazimabad: High rental yield, apartment demand very consistent
- Clifton: Ultra prime, NRI/expat demand, limited supply drives prices up
- DHA Lahore: Most trusted brand, steady capital gains
- F-sectors Islamabad: Government/diplomat demand, ultra stable

═══ OBJECTION HANDLING ═══
- "Too expensive" → feel their concern, ask exact max+min budget, offer alternatives nearby
- "Just looking" → no pressure, ask which area caught their eye
- "Will think" → respect it, drop one smart insight about the area, offer callback
- "Bad time" → ask for name + number, say you'll call at a better time

═══ LEAD TAG — FIRE WHEN YOU HAVE PHONE ═══
When you have the phone number — fire this at the VERY END of your reply:
[LEAD_CAPTURED]{"name":"value","phone":"value","city":"value","propertyType":"value","budget":"max - min range","extra":"any other info"}[/LEAD_CAPTURED]

If some info still missing at time of phone capture → use "Not provided yet" for that field.
Fire the tag ONCE. Never in the middle of text. Always at very end.

═══ HARD RULES ═══
- NEVER show raw tags in visible text
- NEVER mention competitors
- NEVER sound like a bot or form
- ONE question per message only
- NEVER ask budget without asking BOTH max and minimum`;

function getSession(sessionId) {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, {
      id: sessionId,
      history: [],
      leadCaptured: false,
      createdAt: Date.now(),
      lastActive: Date.now()
    });
  }
  const s = sessions.get(sessionId);
  s.lastActive = Date.now();
  return s;
}

setInterval(() => {
  const now = Date.now();
  for (const [id, s] of sessions) {
    if (now - s.lastActive > 2 * 60 * 60 * 1000) sessions.delete(id);
  }
}, 30 * 60 * 1000);

// Normalize phone number for dedup (strip spaces, dashes, +92 → 0)
function normalizePhone(p) {
  if (!p) return '';
  let n = p.replace(/[\s\-\(\)]/g, '');
  if (n.startsWith('+92')) n = '0' + n.slice(3);
  if (n.startsWith('92') && n.length === 12) n = '0' + n.slice(2);
  return n;
}

async function processReply(reply, session) {
  let clean = reply;

  // ── Extract and strip LEAD_CAPTURED ──
  const leadMatch = clean.match(/\[LEAD_CAPTURED\]([\s\S]*?)\[\/LEAD_CAPTURED\]/);
  clean = clean.replace(/\[LEAD_CAPTURED\][\s\S]*?\[\/LEAD_CAPTURED\]/g, '').trim();

  if (leadMatch) {
    try {
      const leadData = JSON.parse(leadMatch[1].trim());
      const phone = normalizePhone(leadData.phone);
      if (phone && phone !== 'val' && !['unknown','not provided'].includes(phone.toLowerCase())) {
        if (capturedPhones.has(phone)) {
          // Duplicate — inject friendly message, no email
          console.log('📋 Duplicate lead:', phone);
          const dupMsg = session.history.length > 0 && session.history[0]?.content?.toLowerCase().includes('english')
            ? "\n\n✅ We already have your number on file! Our consultant will call you shortly. Please wait."
            : "\n\n✅ Aapka number hamare paas already ha! Hamara consultant jald hi aap ko call kare ga. Please wait karein.";
          clean = clean + dupMsg;
        } else {
          // New lead
          capturedPhones.add(phone);
          session.leadCaptured = true;
          await sendLeadEmail(leadData);
          console.log('✅ Lead captured:', phone);
        }
      }
    } catch (e) { console.error('Lead parse error:', e); }
  }

  // ── Safety: strip any leftover tags ──
  clean = clean
    .replace(/\[\/LEAD_CAPTURED\]/g, '')
    .replace(/\[LEAD_CAPTURED\][\s\S]*/g, '')
    .replace(/\[MAP_AREA\][\s\S]*?\[\/MAP_AREA\]/g, '')
    .replace(/\[\/MAP_AREA\]/g, '')
    .replace(/\[MAP_AREA\][\s\S]*/g, '')
    .replace(/\[SHOW_IMAGE\]/g, '')
    .replace(/SHOW_IMAGE/g, '')
    .replace(/LEAD:/g, '')
    .replace(/MAP:/g, '')
    .trim();

  return clean;
}

// ─── ROUTES ───────────────────────────────────────────
app.post('/api/chat', async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    if (!message || !sessionId) return res.status(400).json({ error: 'Missing fields' });
    const session = getSession(sessionId);
    session.history.push({ role: 'user', content: message });
    let reply = await callGroq(session.history);
    reply = await processReply(reply, session);
    session.history.push({ role: 'assistant', content: reply });
    res.json({ reply, sessionId });
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

app.post('/api/chat/image', upload.single('image'), async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ error: 'Missing sessionId' });
    const session = getSession(sessionId);
    const imageBuffer = req.file?.buffer;
    const mimeType = req.file?.mimetype || 'image/jpeg';
    const base64Image = imageBuffer ? imageBuffer.toString('base64') : null;
    const userContent = [];
    if (base64Image) userContent.push({ type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Image}` } });
    userContent.push({ type: 'text', text: message || 'Please analyze this property photo' });
    session.history.push({ role: 'user', content: message || '[Property image shared]' });
    let reply = await callGroqVision([...session.history.slice(0, -1), { role: 'user', content: userContent }]);
    reply = await processReply(reply, session);
    session.history.push({ role: 'assistant', content: reply });
    res.json({ reply, sessionId });
  } catch (err) {
    console.error('Image chat error:', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

app.post('/api/session', (req, res) => {
  const sessionId = uuidv4();
  getSession(sessionId);
  res.json({ sessionId });
});

app.delete('/api/session/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  if (sessions.has(sessionId)) sessions.get(sessionId).history = [];
  res.json({ cleared: true });
});

async function callGroq(history) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_API_KEY}` },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...history.slice(-20)],
      temperature: 0.7,
      max_tokens: 450
    })
  });
  if (!response.ok) { const err = await response.json(); throw new Error(err.error?.message || 'Groq error'); }
  const data = await response.json();
  return data.choices[0].message.content.trim();
}

async function callGroqVision(messages) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_API_KEY}` },
    body: JSON.stringify({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages.slice(-10)],
      temperature: 0.7,
      max_tokens: 550
    })
  });
  if (!response.ok) { const err = await response.json(); throw new Error(err.error?.message || 'Groq Vision error'); }
  const data = await response.json();
  return data.choices[0].message.content.trim();
}

app.listen(PORT, () => {
  console.log(`✅ Markonix → http://localhost:${PORT}`);
  if (!GROQ_API_KEY) console.warn('⚠️  GROQ_API_KEY missing');
  if (!GMAIL_USER) console.warn('⚠️  GMAIL_USER missing');
  if (!GMAIL_PASS) console.warn('⚠️  GMAIL_PASS missing');
});