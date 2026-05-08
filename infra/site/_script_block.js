<script>
// ──────────────────────────────────────────────────────────────────────────────
// API_BASE_URL AUTO-WIRING INSTRUCTIONS
// After running `cdk deploy`, copy the ApiUrl output value and paste it below.
//
//   1. Run:  cd infra && npx cdk deploy
//   2. Copy: ShiftStormStack.ApiUrl = https://<id>.execute-api.<region>.amazonaws.com
//   3. Paste that URL as API_BASE_URL below (no trailing slash).
//
//   Also copy UserPoolId and UserPoolClientId from the deploy outputs:
//   ShiftStormStack.UserPoolId        = us-east-1_XXXXXXXXX
//   ShiftStormStack.UserPoolClientId  = xxxxxxxxxxxxxxxxxxxx
//
// To redeploy site after editing this file:
//   npx cdk deploy   (re-deploys S3 + invalidates CloudFront)
// ──────────────────────────────────────────────────────────────────────────────
const API_BASE_URL        = ''; // e.g. 'https://abc123.execute-api.us-east-1.amazonaws.com'
const USER_POOL_ID        = ''; // e.g. 'us-east-1_XXXXXXXXX'
const USER_POOL_CLIENT_ID = ''; // e.g. 'xxxxxxxxxxxxxxxxxxxx'
const ORG_ID              = 'default';

// Runtime auth state — populated after Cognito sign-in
let authToken   = null; // Cognito IdToken (Bearer)
let currentUser = null; // { email }

// ══════════════════════════════════════════
//  DEFAULT TASK DEFINITIONS
// ══════════════════════════════════════════
const DEFAULTS = {
  '1st': {
    start: [
      { id: 'lights',   text: 'Turn on triage lights',   wednesday: false },
      { id: 'binder',   text: 'Binder check',             wednesday: false },
      { id: 'vocera',   text: 'Login to Vocera',          wednesday: false },
      { id: 'email',    text: 'Check emails',             wednesday: false },
    ],
    clean: [
      { id: 'tri-san',  text: 'Sanitize triage rooms',   wednesday: false },
      { id: 'fish-wipe',text: 'Wipe fishbowl counters',  wednesday: false },
    ],
  },
  '2nd': {
    start: [
      { id: 'vocera',    text: 'Login to Vocera',        wednesday: false },
      { id: 'carelogic', text: 'Check Carelogic alerts', wednesday: false },
      { id: 'email',     text: 'Check emails',           wednesday: false },
    ],
    clean: [
      { id: 'tri-san',   text: 'Sanitize triage rooms',             wednesday: false },
      { id: 'vacuum',    text: 'Vacuum lobby, fishbowl & hallway',  wednesday: false },
      { id: 'swiffer',   text: 'Swiffer for salt',                  wednesday: false },
      { id: 'fish-wipe', text: 'Wipe fishbowl counters',            wednesday: false },
    ],
    restock: [
      { id: 'tissues', text: 'Restock triage tissues',         wednesday: false },
      { id: 'fidget',  text: 'Restock triage fidget toys',     wednesday: false },
      { id: 'reswall', text: 'Check resource wall & copies',   wednesday: false },
      { id: 'vending', text: 'Restock vending machine',        wednesday: false },
    ],
  },
  '3rd': {
    start: [
      { id: 'vocera',    text: 'Login to Vocera',        wednesday: false },
      { id: 'email',     text: 'Check emails',           wednesday: false },
      { id: 'carelogic', text: 'Check Carelogic alerts', wednesday: false },
    ],
    clean: [
      { id: 'fish-wipe', text: 'Wipe fishbowl counters',                 wednesday: false },
      { id: 'tri-furn',  text: 'Wipe triage furniture — Lysol + Pledge', wednesday: false },
      { id: 'wait-furn', text: 'Wipe waiting room furniture',            wednesday: false },
      { id: 'switches',  text: 'Wipe light switches & door handles',     wednesday: false },
      { id: 'coffee',    text: 'Wipe coffee machine & fill water',       wednesday: false },
      { id: 'closet',    text: 'Wipe closet shelves',                    wednesday: false },
    ],
    org: [
      { id: 'lockers', text: 'Reset lockers — note if not empty', wednesday: false },
      { id: 'sweep',   text: 'Sweep/vacuum triage rooms',         wednesday: false },
      { id: 'storage', text: 'Clean storage room',                wednesday: false },
    ],
    lockbox: [
      { id: 'fill',  text: 'Fill lockbox & update inventory sheet',  wednesday: false },
      { id: 'bus',   text: 'Check bus tickets — note if under 5',   wednesday: false },
      { id: 'hacap', text: 'Check HACAP boxes — note if 2 or less', wednesday: false },
    ],
    tech: [
      { id: 'charge',  text: 'Charge all laptops, iPads & phones', wednesday: false },
      { id: 'updates', text: 'Check laptops for updates',           wednesday: true  },
    ],
    end: [
      { id: 'trash',   text: 'Empty trash & bring to dumpster',  wednesday: false },
      { id: 'vacuum',  text: 'Vacuum lobby, fishbowl & hallway', wednesday: false },
      { id: 'swiffer', text: 'Swiffer for salt',                 wednesday: false },
      { id: 'vocout',  text: 'Logout of Vocera',                 wednesday: false },
    ],
  },
};

const SECS = {
  '1st': [
    { key: 'start', label: 'Start of Shift', domId: 'tasks-1st-start', progId: 'prog-1st-start' },
    { key: 'clean', label: 'Clean & Reset',  domId: 'tasks-1st-clean', progId: 'prog-1st-clean' },
  ],
  '2nd': [
    { key: 'start',   label: 'Start of Shift', domId: 'tasks-2nd-start',   progId: 'prog-2nd-start' },
    { key: 'clean',   label: 'Clean & Reset',  domId: 'tasks-2nd-clean',   progId: 'prog-2nd-clean' },
    { key: 'restock', label: 'Restocking',     domId: 'tasks-2nd-restock', progId: 'prog-2nd-restock' },
  ],
  '3rd': [
    { key: 'start',   label: 'Start of Shift',        domId: 'tasks-3rd-start',   progId: 'prog-3rd-start' },
    { key: 'clean',   label: 'Cleaning & Sanitizing', domId: 'tasks-3rd-clean',   progId: 'prog-3rd-clean' },
    { key: 'org',     label: 'Organization & Reset',  domId: 'tasks-3rd-org',     progId: 'prog-3rd-org' },
    { key: 'lockbox', label: 'Lockbox & Resources',   domId: 'tasks-3rd-lockbox', progId: 'prog-3rd-lockbox' },
    { key: 'tech',    label: 'Technology',            domId: 'tasks-3rd-tech',    progId: 'prog-3rd-tech' },
    { key: 'end',     label: 'End of Shift',          domId: 'tasks-3rd-end',     progId: 'prog-3rd-end' },
  ],
};

// ══════════════════════════════════════════
//  STATE
// ══════════════════════════════════════════
const DEFAULT_STATE = () => ({
  staffInitials: '',
  shiftDate: '',
  activeShift: '1st',
  checks: {},
  followUps: [],
  additionals: {
    '1st': [{ text:'', checked:false }, { text:'', checked:false }],
    '2nd': [{ text:'', checked:false }, { text:'', checked:false }],
    '3rd': [{ text:'', checked:false }, { text:'', checked:false }],
  },
  notes: { '1st':'', '2nd':'', '3rd':'' },
  restockItems: '',
  submitted: false,
  customTasks: {},
});

let state = DEFAULT_STATE();
let isWed = false;
let curAdminShift = '1st';

// ══════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════
function escHtml(s) {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function tasks(shift, sec) {
  const k = `${shift}-${sec}`;
  const c = state.customTasks[k];
  return (c && c.length > 0) ? c : (DEFAULTS[shift]?.[sec] || []).map(t => ({...t}));
}
function taskKey(shift, sec, id) { return `${shift}-${sec}-${id}`; }

// ══════════════════════════════════════════
//  RENDER SECTIONS
// ══════════════════════════════════════════
function renderAll() {
  Object.keys(SECS).forEach(shift => {
    SECS[shift].forEach(sec => {
      if (sec.key === 'restock' && shift === '2nd') renderRestock();
      else renderSec(shift, sec.key, sec.domId, sec.progId);
    });
  });
}

function renderSec(shift, sec, domId, progId) {
  const el = document.getElementById(domId);
  if (!el) return;
  el.innerHTML = '';
  tasks(shift, sec).forEach(t => {
    const k    = taskKey(shift, sec, t.id);
    const hide = t.wednesday && !isWed;
    const chk  = !!state.checks[k];
    const div  = document.createElement('div');
    div.className = 'task-item' + (hide ? ' hidden' : '');
    div.dataset.k = k;
    div.innerHTML = `
      <div class="cb${chk?' on':''}" onclick="toggle('${k}',this)"></div>
      <span class="task-lbl${chk?' done':''}" onclick="toggle('${k}',this.previousElementSibling)">
        ${escHtml(t.text)}${t.wednesday ? ' <span class="wed-pill">WED</span>' : ''}
      </span>`;
    el.appendChild(div);
  });
  updateProg(shift, sec, progId);
}

function renderRestock() {
  const el = document.getElementById('tasks-2nd-restock');
  if (!el) return;
  const notesWrap = document.getElementById('restock-notes-wrap');
  Array.from(el.children).forEach(c => { if (c !== notesWrap) c.remove(); });
  tasks('2nd','restock').forEach(t => {
    const k   = taskKey('2nd','restock',t.id);
    const chk = !!state.checks[k];
    const div = document.createElement('div');
    div.className = 'task-item';
    div.dataset.k = k;
    div.innerHTML = `
      <div class="cb${chk?' on':''}" onclick="toggle('${k}',this)"></div>
      <span class="task-lbl${chk?' done':''}" onclick="toggle('${k}',this.previousElementSibling)">
        ${escHtml(t.text)}
      </span>`;
    el.insertBefore(div, notesWrap);
  });
  updateProg('2nd','restock','prog-2nd-restock');
}

// ══════════════════════════════════════════
//  TOGGLE TASK
// ══════════════════════════════════════════
function toggle(k, cbEl) {
  if (state.submitted) return;
  const on = !cbEl.classList.contains('on');
  state.checks[k] = on;
  cbEl.classList.toggle('on', on);
  const lbl = cbEl.nextElementSibling;
  if (lbl) lbl.classList.toggle('done', on);
  refreshAllProg(); save();
}

function toggleAdd(cbEl) {
  if (state.submitted) return;
  const shift = cbEl.dataset.shift, idx = +cbEl.dataset.idx;
  const on    = !cbEl.classList.contains('on');
  cbEl.classList.toggle('on', on);
  state.additionals[shift][idx].checked = on;
  save();
}

function saveAdd(shift, idx, val) {
  state.additionals[shift][idx].text = val;
  save();
}

// ══════════════════════════════════════════
//  FOLLOW-UP TABLE
// ══════════════════════════════════════════
function renderFu() {
  const tbody = document.getElementById('fu-tbody');
  tbody.innerHTML = '';
  if (!state.followUps.length) { addFuRow(false); return; }
  state.followUps.forEach((r, i) => appendFuRow(tbody, r, i));
  updateFuProg();
}

function addFuRow(doSave = true) {
  state.followUps.push({ c:'', s:'', notes:'', a1:false, a2:false });
  const tbody = document.getElementById('fu-tbody');
  appendFuRow(tbody, state.followUps[state.followUps.length-1], state.followUps.length-1);
  if (doSave) save();
  updateFuProg();
}

function appendFuRow(tbody, r, i) {
  const tr  = document.createElement('tr');
  tr.dataset.i = i;
  tr.innerHTML = `
    <td><input class="fu-input" type="text" placeholder="Initials" value="${escHtml(r.c||'')}" maxlength="8"
         oninput="fuUpd(${i},'c',this.value)"></td>
    <td><input class="fu-input" type="text" placeholder="Initials" value="${escHtml(r.s||'')}" maxlength="8"
         oninput="fuUpd(${i},'s',this.value)"></td>
    <td><input class="fu-input" type="text" placeholder="Notes..." value="${escHtml(r.notes||'')}"
         oninput="fuUpd(${i},'notes',this.value)"></td>
    <td><div class="att-cell"><button class="att-btn${r.a1?' on':''}" onclick="fuAtt(${i},1,this)">1</button></div></td>
    <td><div class="att-cell"><button class="att-btn${r.a2?' on':''}" onclick="fuAtt(${i},2,this)">2</button></div></td>
    <td><button class="del-fu-btn" onclick="delFu(${i})">&#x2715;</button></td>`;
  tbody.appendChild(tr);
}

function fuUpd(i, f, v) { state.followUps[i][f]=v; save(); updateFuProg(); }
function fuAtt(i, n, btn) {
  if (state.submitted) return;
  const f = n===1 ? 'a1' : 'a2';
  state.followUps[i][f] = !state.followUps[i][f];
  btn.classList.toggle('on', state.followUps[i][f]);
  save(); updateFuProg();
}
function delFu(i) { state.followUps.splice(i,1); renderFu(); save(); }
function updateFuProg() {
  const el = document.getElementById('prog-1st-followups');
  if (el) el.textContent = `${state.followUps.length} client${state.followUps.length!==1?'s':''}`;
}

// ══════════════════════════════════════════
//  PROGRESS
// ══════════════════════════════════════════
function refreshAllProg() {
  Object.keys(SECS).forEach(shift => {
    SECS[shift].forEach(sec => updateProg(shift, sec.key, sec.progId));
  });
  updateFuProg();
}

function updateProg(shift, sec, progId) {
  const el  = document.getElementById(progId);
  if (!el) return;
  const all  = tasks(shift, sec).filter(t => !t.wednesday || isWed);
  const done = all.filter(t => state.checks[taskKey(shift,sec,t.id)]).length;
  el.textContent = `${done}/${all.length}`;
  el.className   = 'sec-prog' + (done === all.length && all.length ? ' done' : '');
}

// ══════════════════════════════════════════
//  SECTION COLLAPSE
// ══════════════════════════════════════════
function toggleSec(hdr) {
  if (hdr.classList.contains('no-toggle')) return;
  const card = hdr.closest('.sec-card');
  const body = card?.querySelector('.sec-body');
  if (!body) return;
  const isNowCollapsed = body.classList.toggle('collapsed');
  hdr.classList.toggle('collapsed-hdr', isNowCollapsed);
}

// ══════════════════════════════════════════
//  SHIFT SELECTION
// ══════════════════════════════════════════
function selectShift(s) {
  state.activeShift = s;
  document.querySelectorAll('.shift-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.shift-panel').forEach(p => p.classList.remove('active'));
  document.getElementById(`tab-${s}`).classList.add('active');
  document.getElementById(`panel-${s}`).classList.add('active');
  save();
}

// ══════════════════════════════════════════
//  SAVE / LOAD
// ══════════════════════════════════════════
let _saveBubbleTimer = null;
function showSaved() {
  const el = document.getElementById('saveBubble');
  el.classList.add('show');
  clearTimeout(_saveBubbleTimer);
  _saveBubbleTimer = setTimeout(() => el.classList.remove('show'), 1400);
}

function save() {
  state.staffInitials = document.getElementById('staffInitials').value;
  state.shiftDate     = document.getElementById('shiftDate').value;
  localStorage.setItem('ss_state', JSON.stringify(state));
  showSaved();
}

function load() {
  try {
    const raw = localStorage.getItem('ss_state');
    if (raw) {
      const p = JSON.parse(raw);
      state = { ...DEFAULT_STATE(), ...p,
        checks:      p.checks      || {},
        notes:       { ...DEFAULT_STATE().notes,       ...p.notes },
        additionals: { ...DEFAULT_STATE().additionals, ...p.additionals },
        customTasks: p.customTasks || {},
        followUps:   p.followUps   || [],
      };
    }
  } catch(e) { console.warn('Load error', e); }
}

// ══════════════════════════════════════════
//  SUBMIT
// ══════════════════════════════════════════
function submitShift() {
  if (!document.getElementById('staffInitials').value.trim()) {
    toast('&#x26A0; Enter your initials before submitting.'); return;
  }
  save();
  state.submitted = true; save();
  lockUI();
  toast('&#x2713; Shift submitted and locked!');
  setTimeout(showSummary, 700);

  // POST to API if configured (no auth required — /submit is open)
  if (API_BASE_URL) {
    apiFetch('/submit', {
      method: 'POST',
      jsonBody: {
        orgId:        ORG_ID,
        date:         state.shiftDate,
        shift:        state.activeShift,
        staffInitials:state.staffInitials,
        checks:       state.checks,
        notes:        state.notes,
        additionals:  state.additionals,
        followUps:    state.followUps,
        restockItems: state.restockItems,
      }
    }).catch(e => console.warn('Submit POST failed:', e));
  }
}

function lockUI() {
  document.getElementById('mainContent').classList.add('locked');
  document.getElementById('lockedBanner').classList.add('show');
  document.getElementById('submitBtn').disabled = true;
}

function resetForm() {
  if (!confirm('Reset the form and start a new shift? All current data will be cleared.')) return;
  localStorage.removeItem('ss_state');
  location.reload();
}

// ══════════════════════════════════════════
//  SUMMARY
// ══════════════════════════════════════════
function showSummary() {
  document.getElementById('summaryOverlay').classList.add('open');
  buildSummary();
}
function closeSummary() { document.getElementById('summaryOverlay').classList.remove('open'); }

function buildSummary() {
  const s        = state.activeShift;
  const initials = state.staffInitials || '&mdash;';
  const dateStr  = state.shiftDate
    ? new Date(state.shiftDate+'T12:00:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})
    : '&mdash;';

  let html = `<div class="sum-meta">
    <div class="sum-meta-item"><div class="sum-meta-lbl">Staff</div><div class="sum-meta-val">${escHtml(initials)}</div></div>
    <div class="sum-meta-item"><div class="sum-meta-lbl">Shift</div><div class="sum-meta-val">${s}</div></div>
    <div class="sum-meta-item"><div class="sum-meta-lbl">Date</div><div class="sum-meta-val">${dateStr}</div></div>
  </div>`;

  SECS[s].forEach(sec => {
    const list = tasks(s, sec.key).filter(t => !t.wednesday || isWed);
    html += `<div class="sum-sec"><h4>${escHtml(sec.label)}</h4><ul class="sum-list">`;
    list.forEach(t => {
      const done = !!state.checks[taskKey(s, sec.key, t.id)];
      html += `<li><span class="${done?'chk-ok':'chk-no'}">${done?'&#x2713;':'&#x2717;'}</span> ${escHtml(t.text)}</li>`;
    });
    html += '</ul>';
    if (sec.key === 'restock' && s === '2nd' && state.restockItems) {
      html += `<p style="font-size:.82rem;color:var(--muted);margin-top:.5rem;">Items needed: <strong>${escHtml(state.restockItems)}</strong></p>`;
    }
    html += '</div>';
  });

  if (s === '1st' && state.followUps.length) {
    html += `<div class="sum-sec"><h4>Client Follow-Ups</h4>`;
    state.followUps.forEach(f => {
      if (!f.c) return;
      html += `<div style="font-size:.85rem;padding:.28rem 0;border-bottom:1px solid var(--border);">
        <strong>${escHtml(f.c)}</strong> (staff: ${escHtml(f.s||'&mdash;')}) &mdash; Att 1: ${f.a1?'&#x2713;':'&#x2717;'} | Att 2: ${f.a2?'&#x2713;':'&#x2717;'}
        ${f.notes ? `<br><span style="color:var(--muted);font-size:.8rem;">${escHtml(f.notes)}</span>` : ''}
      </div>`;
    });
    html += '</div>';
  }

  const adds = (state.additionals[s]||[]).filter(a => a.text.trim());
  if (adds.length) {
    html += `<div class="sum-sec"><h4>Additional Tasks</h4><ul class="sum-list">`;
    adds.forEach(a => {
      html += `<li><span class="${a.checked?'chk-ok':'chk-no'}">${a.checked?'&#x2713;':'&#x2717;'}</span> ${escHtml(a.text)}</li>`;
    });
    html += '</ul></div>';
  }

  const n = state.notes[s] || '';
  if (n) html += `<div class="sum-sec"><h4>Notes for Leadership</h4><div class="sum-notes">${escHtml(n)}</div></div>`;

  document.getElementById('summaryContent').innerHTML = html;
}

// ══════════════════════════════════════════
//  AUTH HELPERS
// ══════════════════════════════════════════

/**
 * Authenticate via Cognito USER_PASSWORD_AUTH (public endpoint, no SDK needed).
 * Returns the IdToken string on success; throws a descriptive Error on failure.
 */
async function cognitoSignIn(email, password) {
  if (!USER_POOL_CLIENT_ID) throw new Error('USER_POOL_CLIENT_ID not configured in index.html');
  if (!USER_POOL_ID)        throw new Error('USER_POOL_ID not configured in index.html');
  const region   = USER_POOL_ID.split('_')[0];
  const endpoint = `https://cognito-idp.${region}.amazonaws.com/`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Target': 'AWSCognitoIdentityProviderService.InitiateAuth'
    },
    body: JSON.stringify({
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: USER_POOL_CLIENT_ID,
      AuthParameters: { USERNAME: email, PASSWORD: password }
    })
  });
  const data = await res.json();
  if (!res.ok) {
    const msg = data.message || data.__type || 'Authentication failed';
    throw new Error(msg.replace('UserNotConfirmedException', 'Account not confirmed. Check your email.'));
  }
  return data.AuthenticationResult.IdToken;
}

/** Returns auth header object for protected apiFetch calls. */
function authHeaders() {
  return authToken ? { 'authorization': `Bearer ${authToken}` } : {};
}

// ══════════════════════════════════════════
//  ADMIN PANEL
// ══════════════════════════════════════════
function openAdmin() {
  // Skip login if already authenticated
  if (authToken) {
    document.getElementById('adminOverlay').classList.add('open');
    selAdminShift('1st', document.querySelector('.admin-tab'));
    return;
  }
  document.getElementById('loginOverlay').classList.add('open');
  document.getElementById('adminEmail').value = '';
  document.getElementById('adminPw').value    = '';
  document.getElementById('loginErr').style.display = 'none';
  const btn = document.getElementById('loginBtn');
  if (btn) { btn.textContent = 'Sign In'; btn.classList.remove('btn-loading'); }
  setTimeout(() => document.getElementById('adminEmail').focus(), 80);
}
function closeLogin() { document.getElementById('loginOverlay').classList.remove('open'); }

async function doLogin() {
  const email = document.getElementById('adminEmail').value.trim();
  const pw    = document.getElementById('adminPw').value;
  const btn   = document.getElementById('loginBtn');
  const errEl = document.getElementById('loginErr');

  if (!email || !pw) {
    errEl.textContent   = 'Enter your email and password.';
    errEl.style.display = 'block';
    return;
  }
  errEl.style.display = 'none';
  btn.textContent = 'Signing in...';
  btn.classList.add('btn-loading');

  try {
    if (!USER_POOL_CLIENT_ID || !USER_POOL_ID) {
      // Dev fallback — no Cognito configured yet
      if (pw === 'admin') {
        authToken   = 'dev-token';
        currentUser = { email: email || 'admin' };
      } else {
        throw new Error('Incorrect password (dev mode — Cognito not yet configured)');
      }
    } else {
      authToken   = await cognitoSignIn(email, pw);
      currentUser = { email };
    }
    closeLogin();
    document.getElementById('adminOverlay').classList.add('open');
    selAdminShift('1st', document.querySelector('.admin-tab'));
  } catch(e) {
    errEl.textContent   = e.message || 'Sign-in failed.';
    errEl.style.display = 'block';
  } finally {
    btn.textContent = 'Sign In';
    btn.classList.remove('btn-loading');
  }
}

function closeAdmin() { document.getElementById('adminOverlay').classList.remove('open'); }

function selAdminShift(s, btn) {
  curAdminShift = s;
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderAdmin();
}

function renderAdmin() {
  const s = curAdminShift;
  if (s === 'reports') { renderReports(); return; }
  const secs = SECS[s] || [];
  let html   = '';
  secs.forEach(sec => {
    const ts = tasks(s, sec.key);
    html += `<div class="admin-sec">
      <div class="admin-sec-hdr">${escHtml(sec.label)}</div>
      <div class="admin-task-list">`;
    ts.forEach((t, i) => {
      html += `<div class="admin-task-row">
        <input type="text" class="admin-task-inp" value="${escHtml(t.text)}"
               oninput="editTask('${s}','${sec.key}',${i},this.value)">
        <label class="wed-toggle"><input type="checkbox" ${t.wednesday?'checked':''}
               onchange="editTaskWed('${s}','${sec.key}',${i},this.checked)"> Wed</label>
        <button class="del-task-btn" onclick="delTask('${s}','${sec.key}',${i})">&#x2715;</button>
      </div>`;
    });
    html += `</div>
      <button class="add-task-btn" onclick="addTask('${s}','${sec.key}')">+ Add Task</button>
    </div>`;
  });
  document.getElementById('adminContent').innerHTML = html;
}

// ── Reports panel ─────────────────────────────────────────────────────────────

function renderReports() {
  const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
  document.getElementById('adminContent').innerHTML = `
    <div class="admin-sec">
      <div class="admin-sec-hdr">View Shift Submissions</div>
      <div style="display:flex;gap:.65rem;flex-wrap:wrap;align-items:flex-end;margin-bottom:.9rem;">
        <div class="fld" style="min-width:130px;">
          <label>Date</label>
          <input type="date" id="reportDate" value="${today}"
                 style="border:1.5px solid var(--border);border-radius:8px;padding:.5rem .65rem;
                        font-size:.88rem;min-height:40px;background:var(--surface2);color:var(--text);">
        </div>
        <div class="fld" style="min-width:110px;">
          <label>Shift</label>
          <select id="reportShift"
                  style="border:1.5px solid var(--border);border-radius:8px;padding:.5rem .65rem;
                         font-size:.88rem;min-height:40px;background:var(--surface2);color:var(--text);">
            <option value="1st">1st Shift</option>
            <option value="2nd">2nd Shift</option>
            <option value="3rd">3rd Shift</option>
          </select>
        </div>
        <button id="fetchBtn" onclick="fetchSubmissions()"
                style="background:var(--teal);color:#fff;border:none;border-radius:8px;
                       padding:.5rem 1.1rem;font-size:.88rem;font-weight:600;
                       cursor:pointer;min-height:40px;display:flex;align-items:center;gap:.4rem;">
          <span id="fetchBtnLabel">Fetch</span>
        </button>
      </div>
      <div id="reportsContent"></div>
    </div>
  `;
}

let _fetchInProgress = false;
async function fetchSubmissions() {
  if (_fetchInProgress) return;
  const date  = document.getElementById('reportDate')?.value;
  const shift = document.getElementById('reportShift')?.value;
  const btn   = document.getElementById('fetchBtn');
  const label = document.getElementById('fetchBtnLabel');
  const out   = document.getElementById('reportsContent');
  if (!date || !shift) { toast('&#x26A0; Select a date and shift first'); return; }

  if (!API_BASE_URL) {
    out.innerHTML = '<div class="rpt-error">API_BASE_URL is not set. Set it in index.html after running <code>cdk deploy</code>.</div>';
    return;
  }

  _fetchInProgress = true;
  if (btn)   btn.classList.add('btn-loading');
  if (label) label.innerHTML = '<span class="spinner"></span>';
  out.innerHTML = '<div style="padding:1.2rem 0;text-align:center;"><span class="spinner"></span></div>';

  try {
    const data = await apiFetch(
      `/submissions?orgId=${encodeURIComponent(ORG_ID)}&date=${encodeURIComponent(date)}&shift=${encodeURIComponent(shift)}`,
      { extraHeaders: authHeaders() }
    );
    renderSubmissions(data.submissions, shift);
  } catch(e) {
    out.innerHTML = `<div class="rpt-error">${escHtml(e.message || 'Failed to fetch submissions')}</div>`;
  } finally {
    _fetchInProgress = false;
    if (btn)   btn.classList.remove('btn-loading');
    if (label) label.textContent = 'Fetch';
  }
}

function renderSubmissions(submissions, shift) {
  const el = document.getElementById('reportsContent');
  if (!submissions || !submissions.length) {
    el.innerHTML = '<div class="rpt-empty">No submissions found for this date and shift.</div>';
    return;
  }

  const secs = SECS[shift] || [];
  let html   = '<div style="max-height:58vh;overflow-y:auto;padding-right:.15rem;">';

  submissions.forEach(sub => {
    const ts      = new Date(sub.createdAt).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});
    const dateStr = new Date(sub.createdAt).toLocaleDateString('en-US',{month:'short',day:'numeric'});
    const p       = sub.payload || {};
    const checks  = p.checks   || {};

    // Overall completion %
    let totalTasks = 0, doneTasks = 0;
    secs.forEach(sec => {
      (DEFAULTS[shift]?.[sec.key] || []).forEach(t => {
        if (t.wednesday && !isWed) return;
        totalTasks++;
        if (checks[`${shift}-${sec.key}-${t.id}`]) doneTasks++;
      });
    });
    const pct      = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : null;
    const pctCls   = pct === null ? '' : pct === 100 ? ' full' : pct < 50 ? ' low' : '';
    const pctLabel = pct !== null ? `${pct}% complete` : 'No task data';

    // Per-section badges
    let secRows = '';
    secs.forEach(sec => {
      const all  = (DEFAULTS[shift]?.[sec.key] || []).filter(t => !t.wednesday || isWed);
      const done = all.filter(t => checks[`${shift}-${sec.key}-${t.id}`]).length;
      if (!all.length) return;
      secRows += `<span class="rpt-badge">${escHtml(sec.label)}: ${done}/${all.length}</span>`;
    });

    const notes = p.notes?.[shift] || '';

    html += `<div class="rpt-card">
      <div class="rpt-card-hdr">
        <span class="rpt-staff">${escHtml(sub.staffInitials || '&mdash;')}</span>
        <span class="rpt-ts">${dateStr} &middot; ${ts}</span>
      </div>`;

    if (pct !== null) {
      html += `<div class="pct-wrap">
        <div class="pct-label"><span>Overall completion</span><span>${pctLabel}</span></div>
        <div class="pct-bar"><div class="pct-fill${pctCls}" style="width:${pct}%"></div></div>
      </div>`;
    }

    if (secRows) html += `<div class="rpt-meta">${secRows}</div>`;
    if (notes)   html += `<div class="rpt-notes">${escHtml(notes)}</div>`;

    html += '</div>';
  });

  html += '</div>';
  el.innerHTML = html;
}

// ══════════════════════════════════════════
//  TASK EDITING (admin)
// ══════════════════════════════════════════
function editTask(shift, sec, i, val) {
  const k = `${shift}-${sec}`;
  if (!state.customTasks[k]) state.customTasks[k] = tasks(shift, sec).map(t => ({...t}));
  state.customTasks[k][i].text = val;
  save();
}
function editTaskWed(shift, sec, i, val) {
  const k = `${shift}-${sec}`;
  if (!state.customTasks[k]) state.customTasks[k] = tasks(shift, sec).map(t => ({...t}));
  state.customTasks[k][i].wednesday = val;
  save(); renderSec(shift, sec, `tasks-${shift}-${sec}`, `prog-${shift}-${sec}`);
}
function delTask(shift, sec, i) {
  const k = `${shift}-${sec}`;
  if (!state.customTasks[k]) state.customTasks[k] = tasks(shift, sec).map(t => ({...t}));
  state.customTasks[k].splice(i, 1);
  save(); renderAdmin();
}
function addTask(shift, sec) {
  const k = `${shift}-${sec}`;
  if (!state.customTasks[k]) state.customTasks[k] = tasks(shift, sec).map(t => ({...t}));
  const newId = `custom-${Date.now()}`;
  state.customTasks[k].push({ id: newId, text: '', wednesday: false });
  save(); renderAdmin();
}

// ══════════════════════════════════════════
//  API FETCH
// ══════════════════════════════════════════
async function apiFetch(path, { method = 'GET', jsonBody, extraHeaders = {} } = {}) {
  if (!API_BASE_URL) throw new Error('API not configured — set API_BASE_URL in index.html');
  const url = API_BASE_URL.replace(/\/+$/, '') + path;
  const res = await fetch(url, {
    method,
    headers: { 'content-type': 'application/json', ...extraHeaders },
    body: jsonBody ? JSON.stringify(jsonBody) : undefined,
  });
  const text = await res.text();
  let data   = null;
  try { data = JSON.parse(text); } catch {}
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) throw new Error('Not authorised — please sign in again');
    throw new Error((data && data.error) ? data.error : `HTTP ${res.status}`);
  }
  return data;
}

// ══════════════════════════════════════════
//  TOAST
// ══════════════════════════════════════════
let _toastTimer = null;
function toast(msg) {
  const el = document.getElementById('toast');
  el.innerHTML = msg;
  el.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
}

// ══════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════
(function init() {
  load();

  document.getElementById('staffInitials').value = state.staffInitials || '';
  document.getElementById('shiftDate').value     = state.shiftDate ||
    new Date().toLocaleDateString('en-CA');

  // Wednesday detection
  const d = new Date(document.getElementById('shiftDate').value + 'T12:00:00');
  isWed = d.getDay() === 3;

  renderAll();
  renderFu();
  refreshAllProg();
  selectShift(state.activeShift || '1st');
  if (state.submitted) lockUI();

  // Restore additional tasks
  ['1st','2nd','3rd'].forEach(shift => {
    (state.additionals[shift] || []).forEach((a, i) => {
      const inp = document.getElementById(`add-${shift}-${i}`);
      const cb  = inp?.previousElementSibling;
      if (inp) inp.value = a.text || '';
      if (cb && a.checked) cb.classList.add('on');
    });
  });

  // Restore notes
  ['1st','2nd','3rd'].forEach(shift => {
    const el = document.getElementById(`notes-${shift}`);
    if (el) el.value = state.notes[shift] || '';
  });

  // Restore restock items
  const ri = document.getElementById('restock-items');
  if (ri) ri.value = state.restockItems || '';
})();
</script>
