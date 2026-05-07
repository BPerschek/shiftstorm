
    // Best-effort: if the site is reachable over HTTPS, push users off HTTP to avoid "Not secure"
    // and to ensure service-worker/PWA capabilities work. (No effect on file:// or localhost.)
    (() => {
      const host = location.hostname;
      const isLocal = host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
      if (!isLocal && location.protocol === 'http:') {
        location.replace(`https://${location.host}${location.pathname}${location.search}${location.hash}`);
      }
    })();
  


// ══════════════════════════════════════════
//  CONFIG
//  (intentionally near top for easy change without hunting)
// ══════════════════════════════════════════
const ADMIN_PASSWORD = 'admin'; // TODO: change for your environment
const LEAD_PASSWORD = 'leader'; // TODO: change for your environment

// Optional: wire to the AWS API once deployed (see infra/ outputs).
// Example: const API_BASE_URL = 'https://abc123.execute-api.us-east-1.amazonaws.com';
const API_BASE_URL = '';
const ORG_ID = 'default';

const EMAILS_KEY = 'ss_admin_emails_v1';
const SUBMISSIONS_KEY = 'ss_submissions_v1';
const LEAD_NOTES_KEY = 'ss_lead_notes_v1';

// localStorage schema/versioning
const STORAGE_KEY_V2 = 'ss_state_v2';
const STORAGE_KEY_V1 = 'ss_state';
const STORAGE_VERSION = 2;
const SAVE_DEBOUNCE_MS = 300;

// ══════════════════════════════════════════
//  DEFAULT TASK DEFINITIONS
// ══════════════════════════════════════════
const DEFAULTS = {
  '1st': {
    start: [
      { id: 'lights',  text: 'Turn on triage lights',   wednesday: false },
      { id: 'binder',  text: 'Binder check',             wednesday: false },
      { id: 'vocera',  text: 'Login to Vocera',          wednesday: false },
      { id: 'email',   text: 'Check emails',             wednesday: false },
    ],
    clean: [
      { id: 'tri-san', text: 'Sanitize triage rooms',   wednesday: false },
      { id: 'fish-wipe',text:'Wipe fishbowl counters',  wednesday: false },
    ],
  },
  '2nd': {
    start: [
      { id: 'vocera',    text: 'Login to Vocera',        wednesday: false },
      { id: 'carelogic', text: 'Check Carelogic alerts', wednesday: false },
      { id: 'email',     text: 'Check emails',           wednesday: false },
    ],
    clean: [
      { id: 'tri-san',   text: 'Sanitize triage rooms',              wednesday: false },
      { id: 'vacuum',    text: 'Vacuum lobby, fishbowl & hallway',   wednesday: false },
      { id: 'swiffer',   text: 'Swiffer for salt',                   wednesday: false },
      { id: 'fish-wipe', text: 'Wipe fishbowl counters',             wednesday: false },
    ],
    restock: [
      { id: 'tissues', text: 'Restock triage tissues',              wednesday: false },
      { id: 'fidget',  text: 'Restock triage fidget toys',          wednesday: false },
      { id: 'reswall', text: 'Check resource wall & copies',        wednesday: false },
      { id: 'vending', text: 'Restock vending machine',             wednesday: false },
    ],
  },
  '3rd': {
    start: [
      { id: 'vocera',    text: 'Login to Vocera',        wednesday: false },
      { id: 'email',     text: 'Check emails',           wednesday: false },
      { id: 'carelogic', text: 'Check Carelogic alerts', wednesday: false },
    ],
    clean: [
      { id: 'fish-wipe', text: 'Wipe fishbowl counters',                    wednesday: false },
      { id: 'tri-furn',  text: 'Wipe triage furniture — Lysol + Pledge',    wednesday: false },
      { id: 'wait-furn', text: 'Wipe waiting room furniture',               wednesday: false },
      { id: 'switches',  text: 'Wipe light switches & door handles',        wednesday: false },
      { id: 'coffee',    text: 'Wipe coffee machine & fill water',          wednesday: false },
      { id: 'closet',    text: 'Wipe closet shelves',                       wednesday: false },
    ],
    org: [
      { id: 'lockers',  text: 'Reset lockers — note if not empty',  wednesday: false },
      { id: 'sweep',    text: 'Sweep/vacuum triage rooms',           wednesday: false },
      { id: 'storage',  text: 'Clean storage room',                  wednesday: false },
    ],
    lockbox: [
      { id: 'fill',    text: 'Fill lockbox & update inventory sheet',       wednesday: false },
      { id: 'bus',     text: 'Check bus tickets — note if under 5',        wednesday: false },
      { id: 'hacap',   text: 'Check HACAP boxes — note if 2 or less',     wednesday: false },
    ],
    tech: [
      { id: 'charge',   text: 'Charge all laptops, iPads & phones', wednesday: false },
      { id: 'updates',  text: 'Check laptops for updates',           wednesday: true  },
    ],
    end: [
      { id: 'trash',    text: 'Empty trash & bring to dumpster',       wednesday: false },
      { id: 'vacuum',   text: 'Vacuum lobby, fishbowl & hallway',      wednesday: false },
      { id: 'swiffer',  text: 'Swiffer for salt',                      wednesday: false },
      { id: 'vocout',   text: 'Logout of Vocera',                      wednesday: false },
    ],
  },
};

// Section metadata per shift
const SECS = {
  '1st': [
    { key: 'start', label: 'Start of Shift',   domId: 'tasks-1st-start', progId: 'prog-1st-start' },
    { key: 'clean', label: 'Clean & Reset',    domId: 'tasks-1st-clean', progId: 'prog-1st-clean' },
  ],
  '2nd': [
    { key: 'start',   label: 'Start of Shift', domId: 'tasks-2nd-start',   progId: 'prog-2nd-start' },
    { key: 'clean',   label: 'Clean & Reset',  domId: 'tasks-2nd-clean',   progId: 'prog-2nd-clean' },
    { key: 'restock', label: 'Restocking',     domId: 'tasks-2nd-restock', progId: 'prog-2nd-restock' },
  ],
  '3rd': [
    { key: 'start',   label: 'Start of Shift',         domId: 'tasks-3rd-start',   progId: 'prog-3rd-start' },
    { key: 'clean',   label: 'Cleaning & Sanitizing',  domId: 'tasks-3rd-clean',   progId: 'prog-3rd-clean' },
    { key: 'org',     label: 'Organization & Reset',   domId: 'tasks-3rd-org',     progId: 'prog-3rd-org' },
    { key: 'lockbox', label: 'Lockbox & Resources',    domId: 'tasks-3rd-lockbox', progId: 'prog-3rd-lockbox' },
    { key: 'tech',    label: 'Technology',             domId: 'tasks-3rd-tech',    progId: 'prog-3rd-tech' },
    { key: 'end',     label: 'End of Shift',           domId: 'tasks-3rd-end',     progId: 'prog-3rd-end' },
  ],
};

// ══════════════════════════════════════════
//  STATE
// ══════════════════════════════════════════
const DEFAULT_STATE = () => ({
  staffInitials: '',
  shiftDate: '',
  activeShift: '1st',
  shiftOverride: null,       // '1st' | '2nd' | '3rd' | null
  shiftOverrideDate: '',     // YYYY-MM-DD (Central time) the override applies to
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
//  SAVE / LOAD RELIABILITY
// ══════════════════════════════════════════
let _saveTimer = null;
let _dirty = false;

function setSaveIndicator(mode) {
  const el = document.getElementById('saveIndicator');
  if (!el) return;
  el.classList.remove('saved','saving','unsaved');

  if (mode === 'unsaved') {
    el.classList.add('unsaved');
    el.title = 'Unsaved changes';
    el.setAttribute('aria-label', 'Unsaved changes');
    el.innerHTML = '<span>●</span>';
    return;
  }
  if (mode === 'saving')  {
    el.classList.add('saving');
    el.title = 'Saving';
    el.setAttribute('aria-label', 'Saving');
    el.innerHTML = '<span>⟳</span>';
    return;
  }
  if (mode === 'saved')   {
    el.classList.add('saved');
    el.title = 'Saved';
    el.setAttribute('aria-label', 'Saved');
    el.innerHTML = '<span>✓</span>';
    return;
  }
}

function safeJsonParse(raw) {
  if (!raw || typeof raw !== 'string') return null;
  try { return JSON.parse(raw); } catch { return null; }
}

function loadJsonKey(key, fallback) {
  try {
    const p = safeJsonParse(localStorage.getItem(key));
    return (p && typeof p === 'object') ? p : fallback;
  } catch { return fallback; }
}
function saveJsonKey(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

function normalizeState(p) {
  // Defensive merge: keeps app from crashing if storage is partial/old/corrupt.
  const d = DEFAULT_STATE();
  const safe = (p && typeof p === 'object') ? p : {};
  return {
    ...d,
    ...safe,
    activeShift: ['1st','2nd','3rd'].includes(safe.activeShift) ? safe.activeShift : d.activeShift,
    shiftOverride: ['1st','2nd','3rd'].includes(safe.shiftOverride) ? safe.shiftOverride : null,
    shiftOverrideDate: (typeof safe.shiftOverrideDate === 'string') ? safe.shiftOverrideDate : '',
    checks: (safe.checks && typeof safe.checks === 'object') ? safe.checks : {},
    notes: { ...d.notes, ...(safe.notes && typeof safe.notes === 'object' ? safe.notes : {}) },
    additionals: { ...d.additionals, ...(safe.additionals && typeof safe.additionals === 'object' ? safe.additionals : {}) },
    customTasks: (safe.customTasks && typeof safe.customTasks === 'object') ? safe.customTasks : {},
    followUps: Array.isArray(safe.followUps) ? safe.followUps : [],
    submitted: !!safe.submitted,
  };
}

function requestSave({ immediate = false } = {}) {
  _dirty = true;
  setSaveIndicator('unsaved');
  if (immediate) return flushSave();
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(flushSave, SAVE_DEBOUNCE_MS);
}

function flushSave() {
  if (_saveTimer) { clearTimeout(_saveTimer); _saveTimer = null; }
  setSaveIndicator('saving');
  try {
    state.staffInitials = document.getElementById('staffInitials')?.value ?? '';
    state.shiftDate = document.getElementById('shiftDate')?.value ?? '';
    const payload = { v: STORAGE_VERSION, savedAt: Date.now(), state };
    localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(payload));
    _dirty = false;
    setSaveIndicator('saved');
  } catch (e) {
    console.warn('Save error', e);
    setSaveIndicator('unsaved');
  }
}

// Back-compat: existing code calls save() in many places.
function save() { requestSave(); }

// ══════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════
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
    const k = taskKey(shift, sec, t.id);
    const hide = t.wednesday && !isWed;
    const chk = !!state.checks[k];
    const div = document.createElement('div');
    div.className = 'task-item' + (chk ? ' checked' : '') + (hide ? ' hidden' : '');
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
    const k = taskKey('2nd','restock',t.id);
    const chk = !!state.checks[k];
    const div = document.createElement('div');
    div.className = 'task-item' + (chk ? ' checked' : '');
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
  if (state.submitted) { toast('🔒 Shift is locked. Tap Reset to start a new shift.'); return; }
  const on = !cbEl.classList.contains('on');
  state.checks[k] = on;
  cbEl.classList.toggle('on', on);
  const lbl = cbEl.nextElementSibling;
  if (lbl) lbl.classList.toggle('done', on);
  const row = cbEl.closest('.task-item');
  if (row) row.classList.toggle('checked', on);
  refreshAllProg(); save();
}

function toggleAdd(cbEl) {
  if (state.submitted) { toast('🔒 Shift is locked. Tap Reset to start a new shift.'); return; }
  const shift = cbEl.dataset.shift, idx = +cbEl.dataset.idx;
  const on = !cbEl.classList.contains('on');
  cbEl.classList.toggle('on', on);
  state.additionals[shift][idx].checked = on;
  const row = cbEl.closest('.task-item');
  if (row) row.classList.toggle('checked', on);
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
  const tr = document.createElement('tr');
  tr.dataset.i = i;
  tr.innerHTML = `
    <td><input class="fu-input" type="text" placeholder="Initials" value="${escHtml(r.c||'')}" maxlength="8"
         oninput="fuUpd(${i},'c',this.value)"></td>
    <td><input class="fu-input" type="text" placeholder="Initials" value="${escHtml(r.s||'')}" maxlength="8"
         oninput="fuUpd(${i},'s',this.value)"></td>
    <td><input class="fu-input" type="text" placeholder="Notes…" value="${escHtml(r.notes||'')}"
         oninput="fuUpd(${i},'notes',this.value)"></td>
    <td><div class="att-cell"><button class="att-btn${r.a1?' on':''}" onclick="fuAtt(${i},1,this)">1</button></div></td>
    <td><div class="att-cell"><button class="att-btn${r.a2?' on':''}" onclick="fuAtt(${i},2,this)">2</button></div></td>
    <td><button class="del-fu-btn" onclick="delFu(${i})">✕</button></td>`;
  tbody.appendChild(tr);
}

function fuUpd(i, f, v) { state.followUps[i][f]=v; save(); updateFuProg(); }
function fuAtt(i, n, btn) {
  if (state.submitted) { toast('🔒 Shift is locked. Tap Reset to start a new shift.'); return; }
  const f = n===1?'a1':'a2';
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
  const el = document.getElementById(progId);
  if (!el) return;
  const all = tasks(shift, sec).filter(t => !t.wednesday || isWed);
  const done = all.filter(t => state.checks[taskKey(shift,sec,t.id)]).length;
  el.textContent = `${done}/${all.length}`;
  el.className = 'sec-prog' + (done === all.length && all.length ? ' done' : '');
}

// ══════════════════════════════════════════
//  SECTION COLLAPSE
// ══════════════════════════════════════════
function toggleSec(hdr) {
  if (hdr.classList.contains('no-toggle')) return;
  const body = hdr.nextElementSibling;
  if (!body) return;
  body.classList.toggle('collapsed');
}

// ══════════════════════════════════════════
//  SHIFT SELECTION
// ══════════════════════════════════════════
function selectShift(s) {
  state.activeShift = s;
  document.querySelectorAll('.shift-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.shift-panel').forEach(p => p.classList.remove('active'));
  document.getElementById(`tab-${s}`)?.classList.add('active');
  document.getElementById(`panel-${s}`)?.classList.add('active');
  requestSave();
}

function onShiftTabClick(s) {
  // Users can switch shifts if they are running early/late.
  // Persist for the current Central date so a refresh doesn't snap back.
  const centralToday = centralNow().dateStr;
  state.shiftOverride = s;
  state.shiftOverrideDate = centralToday;
  selectShift(s);
}

// ══════════════════════════════════════════
//  SAVE / LOAD
// ══════════════════════════════════════════
function load() {
  try {
    // v2 format: { v, savedAt, state }
    const raw2 = localStorage.getItem(STORAGE_KEY_V2);
    const p2 = safeJsonParse(raw2);
    if (p2 && p2.v === STORAGE_VERSION) {
      state = normalizeState(p2.state);
      setSaveIndicator('saved');
      return;
    }

    // v1 fallback (legacy): state object directly
    const raw1 = localStorage.getItem(STORAGE_KEY_V1);
    const p1 = safeJsonParse(raw1);
    if (p1 && typeof p1 === 'object') {
      state = normalizeState(p1);
      // migrate forward now
      requestSave({ immediate: true });
      try { localStorage.removeItem(STORAGE_KEY_V1); } catch {}
      return;
    }

    state = DEFAULT_STATE();
    setSaveIndicator('saved');
  } catch (e) {
    console.warn('Load error', e);
    state = DEFAULT_STATE();
    setSaveIndicator('saved');
  }
}

// ══════════════════════════════════════════
//  SUBMIT
// ══════════════════════════════════════════
function submitShift() {
  if (!document.getElementById('staffInitials').value.trim()) {
    toast('⚠ Enter your initials before submitting.'); return;
  }
  if (!confirm('Submit and lock this shift? You will not be able to edit until you reset.')) return;
  flushSave();
  // Persist a submission snapshot for leadership review (local-first),
  // and best-effort send to the cloud API if configured.
  try { persistSubmission(getSummaryData()); } catch {}
  try { submitToApi(getSummaryData()); } catch {}
  state.submitted = true;
  flushSave();
  lockUI();
  toast('✓ Shift submitted and locked!');
  setTimeout(showSummary, 700);
}

function lockUI() {
  document.getElementById('mainContent').classList.add('locked');
  document.getElementById('lockedBanner').classList.add('show');
  document.getElementById('submitBtn').disabled = true;
}

function resetForm() {
  if (!confirm('Reset the form and start a new shift? All current data will be cleared.')) return;
  try { localStorage.removeItem(STORAGE_KEY_V2); } catch {}
  try { localStorage.removeItem(STORAGE_KEY_V1); } catch {}
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

// ══════════════════════════════════════════
//  INSTALL (PWA helper)
// ══════════════════════════════════════════
let _deferredInstallPrompt = null; // beforeinstallprompt event (Android/Chrome)
const IOS_HINT_DISMISS_KEY = 'ss_ios_install_hint_dismissed';

function isStandalone() {
  // iOS Safari uses navigator.standalone; modern browsers support display-mode.
  return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
}

function isiOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function isSafari() {
  // Safari on iOS (exclude Chrome/Firefox/Edge iOS shells)
  const ua = navigator.userAgent;
  const isAppleWebKit = /AppleWebKit/i.test(ua);
  const isCriOS = /CriOS/i.test(ua);
  const isFxiOS = /FxiOS/i.test(ua);
  const isEdgiOS = /EdgiOS/i.test(ua);
  return isAppleWebKit && !isCriOS && !isFxiOS && !isEdgiOS;
}

function isAndroid() {
  return /Android/i.test(navigator.userAgent);
}

function openInstall(messageHtml) {
  const c = document.getElementById('installContent');
  if (c) c.innerHTML = messageHtml;
  document.getElementById('installOverlay')?.classList.add('open');
}

function closeInstall() {
  document.getElementById('installOverlay')?.classList.remove('open');
}

function dismissInstallHint() {
  try { localStorage.setItem(IOS_HINT_DISMISS_KEY, '1'); } catch {}
  document.getElementById('installHint')?.classList.remove('show');
}

async function onInstallClick() {
  // If the user dismissed the hint, and then taps Install, hide it.
  document.getElementById('installHint')?.classList.remove('show');

  // Already installed
  if (isStandalone()) {
    openInstall(`<div class="sum-sec"><h4>Status</h4><div class="sum-notes">App is already installed.</div></div>`);
    return;
  }

  // Android/Chrome: show native prompt if available
  if (_deferredInstallPrompt) {
    try {
      _deferredInstallPrompt.prompt();
      const choice = await _deferredInstallPrompt.userChoice;
      _deferredInstallPrompt = null;
      if (choice && choice.outcome === 'accepted') {
        toast('✓ Installing...');
        openInstall(`<div class="sum-sec"><h4>Installing</h4><div class="sum-notes">Follow the on-screen prompts to finish installation.</div></div>`);
      } else {
        openInstall(getManualInstallHtml());
      }
      return;
    } catch (e) {
      console.warn('Install prompt failed', e);
      _deferredInstallPrompt = null;
      openInstall(getManualInstallHtml());
      return;
    }
  }

  // Fallback to manual instructions
  openInstall(getManualInstallHtml());
}

function getManualInstallHtml() {
  if (isStandalone()) {
    return `<div class="sum-sec"><h4>Status</h4><div class="sum-notes">App is already installed.</div></div>`;
  }
  if (isiOS() && isSafari()) {
    return `<div class="sum-sec"><h4>iPhone/iPad (Safari)</h4>
      <div class="sum-notes">Tap the Share button (square with arrow), then tap <strong>Add to Home Screen</strong>.</div>
    </div>`;
  }
  if (isAndroid()) {
    return `<div class="sum-sec"><h4>Android (Chrome)</h4>
      <div class="sum-notes">Tap the menu (...) and select <strong>Install App</strong>.</div>
    </div>`;
  }
  return `<div class="sum-sec"><h4>Install</h4>
    <div class="sum-notes">Use your browser menu and choose <strong>Install App</strong> or <strong>Add to Home Screen</strong>.</div>
  </div>`;
}

function buildSummary() {
  // Render HTML from a structured summary so we can export/copy/print reliably.
  const data = getSummaryData();
  const s = data.shift;
  const initials = data.staffInitials || '—';
  const dateStr = data.dateLabel || '—';

  let html = `<div class="sum-meta">
    <div class="sum-meta-item"><div class="sum-meta-lbl">Staff</div><div class="sum-meta-val">${escHtml(initials)}</div></div>
    <div class="sum-meta-item"><div class="sum-meta-lbl">Shift</div><div class="sum-meta-val">${s} Shift</div></div>
    <div class="sum-meta-item"><div class="sum-meta-lbl">Date</div><div class="sum-meta-val">${dateStr}</div></div>
  </div>`;

  data.sections.forEach(sec => {
    html += `<div class="sum-sec"><h4>${escHtml(sec.label)}</h4><ul class="sum-list">`;
    sec.tasks.forEach(t => {
      html += `<li><span class="${t.done?'chk-ok':'chk-no'}">${t.done?'✓':'✗'}</span> ${escHtml(t.text)}</li>`;
    });
    html += '</ul>';
    if (sec.key === 'restock' && s === '2nd' && data.restockItems) {
      html += `<p style="font-size:.82rem;color:var(--muted);margin-top:.5rem;">Items needed: <strong>${escHtml(data.restockItems)}</strong></p>`;
    }
    html += '</div>';
  });

  // Follow-ups (1st shift)
  if (s === '1st' && data.followUps.length) {
    html += `<div class="sum-sec"><h4>Client Follow-Ups</h4>`;
    data.followUps.forEach(f => {
      if (!f.c) return;
      html += `<div style="font-size:.85rem;padding:.28rem 0;border-bottom:1px solid var(--border);">
        <strong>${escHtml(f.c)}</strong> (staff: ${escHtml(f.s||'—')}) — Att 1: ${f.a1?'✓':'✗'} | Att 2: ${f.a2?'✓':'✗'}
        ${f.notes ? `<br><span style="color:var(--muted);font-size:.8rem;">${escHtml(f.notes)}</span>` : ''}
      </div>`;
    });
    html += '</div>';
  }

  // Additionals
  const adds = data.additionals;
  if (adds.length) {
    html += `<div class="sum-sec"><h4>Additional Tasks</h4><ul class="sum-list">`;
    adds.forEach(a => { html += `<li><span class="${a.checked?'chk-ok':'chk-no'}">${a.checked?'✓':'✗'}</span> ${escHtml(a.text)}</li>`; });
    html += '</ul></div>';
  }

  // Notes
  const n = data.notes || '';
  if (n) html += `<div class="sum-sec"><h4>Shift Notes for Leadership</h4><div class="sum-notes">${escHtml(n)}</div></div>`;

  document.getElementById('summaryContent').innerHTML = html;
}

function getSummaryData() {
  const s = state.activeShift || '1st';
  const dateLabel = state.shiftDate
    ? new Date(state.shiftDate + 'T12:00:00').toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' })
    : '';

  const sections = (SECS[s] || []).map(sec => {
    const list = tasks(s, sec.key).filter(t => !t.wednesday || isWed);
    return {
      key: sec.key,
      label: sec.label,
      tasks: list.map(t => ({
        id: t.id,
        text: t.text,
        wednesday: !!t.wednesday,
        done: !!state.checks[taskKey(s, sec.key, t.id)],
      })),
    };
  });

  return {
    app: 'ShiftStorm',
    version: STORAGE_VERSION,
    exportedAt: new Date().toISOString(),
    staffInitials: state.staffInitials || '',
    shiftDate: state.shiftDate || '',
    dateLabel,
    shift: s,
    submitted: !!state.submitted,
    restockItems: state.restockItems || '',
    sections,
    followUps: Array.isArray(state.followUps) ? state.followUps : [],
    additionals: (state.additionals?.[s] || []).filter(a => (a?.text || '').trim()).map(a => ({ text: a.text, checked: !!a.checked })),
    notes: state.notes?.[s] || '',
  };
}

function summaryToText(data) {
  const lines = [];
  lines.push('ShiftStorm Summary');
  lines.push(`Staff: ${data.staffInitials || '—'}`);
  lines.push(`Shift: ${data.shift} Shift`);
  lines.push(`Date: ${data.dateLabel || data.shiftDate || '—'}`);
  lines.push('');
  data.sections.forEach(sec => {
    lines.push(sec.label);
    sec.tasks.forEach(t => lines.push(`- [${t.done ? 'x' : ' '}] ${t.text}`));
    lines.push('');
  });
  if (data.shift === '2nd' && data.restockItems) {
    lines.push(`Items needed: ${data.restockItems}`);
    lines.push('');
  }
  if (data.shift === '1st' && data.followUps?.length) {
    lines.push('Client Follow-Ups');
    data.followUps.forEach(f => {
      if (!f?.c) return;
      lines.push(`- ${f.c} (staff: ${f.s || '—'}) Att1:${f.a1 ? 'Y' : 'N'} Att2:${f.a2 ? 'Y' : 'N'}${f.notes ? ` — ${f.notes}` : ''}`);
    });
    lines.push('');
  }
  if (data.additionals?.length) {
    lines.push('Additional Tasks');
    data.additionals.forEach(a => lines.push(`- [${a.checked ? 'x' : ' '}] ${a.text}`));
    lines.push('');
  }
  if (data.notes) {
    lines.push('Notes for Leadership');
    lines.push(data.notes);
    lines.push('');
  }
  return lines.join('\n').trim() + '\n';
}

async function copySummary() {
  const data = getSummaryData();
  const text = summaryToText(data);
  try {
    await navigator.clipboard.writeText(text);
    toast('✓ Copied summary');
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); toast('✓ Copied summary'); } catch { toast('⚠ Copy failed'); }
    document.body.removeChild(ta);
  }
}

function downloadSummaryJson() {
  const data = getSummaryData();
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const a = document.createElement('a');
  const safeDate = (data.shiftDate || '').replace(/[^0-9-]/g,'') || 'unknown-date';
  a.download = `shiftstorm-summary_${safeDate}_${data.shift}.json`;
  a.href = URL.createObjectURL(blob);
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); document.body.removeChild(a); }, 0);
  toast('✓ Downloaded JSON');
}

function persistSubmission(data) {
  const all = loadJsonKey(SUBMISSIONS_KEY, { byKey: {} });
  const byKey = (all && typeof all.byKey === 'object') ? all.byKey : {};
  const key = `${ORG_ID}#${data.shiftDate || ''}#${data.shift || ''}`;
  byKey[key] = { ...data, storedAt: Date.now() };
  saveJsonKey(SUBMISSIONS_KEY, { byKey });
}

async function submitToApi(data) {
  if (!API_BASE_URL) return;
  try {
    await apiFetch(`/submit?orgId=${encodeURIComponent(ORG_ID)}`, { method: 'POST', jsonBody: data });
  } catch (e) {
    // Silent best-effort; local snapshot is the primary UX.
    console.warn('API submit failed', e);
  }
}

function printSummary() {
  const data = getSummaryData();
  const html = `
<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>ShiftStorm Summary</title>
  <style>
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;line-height:1.35;padding:18px;color:#111}
    h1{font-size:18px;margin:0 0 10px}
    .meta{font-size:12px;margin:0 0 14px}
    h2{font-size:14px;margin:14px 0 6px}
    ul{margin:0 0 10px 16px;padding:0}
    li{margin:2px 0}
    .muted{color:#444;font-size:12px}
  </style>
</head>
<body>
  <h1>ShiftStorm Summary</h1>
  <div class="meta"><strong>Staff:</strong> ${escHtml(data.staffInitials||'—')}<br><strong>Shift:</strong> ${escHtml(data.shift)} Shift<br><strong>Date:</strong> ${escHtml(data.dateLabel||data.shiftDate||'—')}</div>
  ${data.sections.map(sec => `
    <h2>${escHtml(sec.label)}</h2>
    <ul>${sec.tasks.map(t => `<li>${t.done ? '✓' : '✗'} ${escHtml(t.text)}</li>`).join('')}</ul>
  `).join('')}
  ${(data.shift==='2nd' && data.restockItems) ? `<div class="muted"><strong>Items needed:</strong> ${escHtml(data.restockItems)}</div>` : ''}
  ${(data.shift==='1st' && data.followUps?.length) ? `
    <h2>Client Follow-Ups</h2>
    <ul>${data.followUps.filter(f=>f?.c).map(f => `<li><strong>${escHtml(f.c)}</strong> (staff: ${escHtml(f.s||'—')}) Att1:${f.a1?'✓':'✗'} Att2:${f.a2?'✓':'✗'}${f.notes?`<br><span class="muted">${escHtml(f.notes)}</span>`:''}</li>`).join('')}</ul>
  ` : ''}
  ${(data.additionals?.length) ? `
    <h2>Additional Tasks</h2>
    <ul>${data.additionals.map(a => `<li>${a.checked ? '✓' : '✗'} ${escHtml(a.text)}</li>`).join('')}</ul>
  ` : ''}
  ${(data.notes) ? `<h2>Notes for Leadership</h2><div>${escHtml(data.notes).replace(/\\n/g,'<br>')}</div>` : ''}
  <script>window.print();<\/script>
</body>
</html>`;
  const w = window.open('', '_blank', 'noopener,noreferrer,width=900,height=700');
  if (!w) { toast('⚠ Pop-up blocked'); return; }
  w.document.open();
  w.document.write(html);
  w.document.close();
}

// ══════════════════════════════════════════
//  ADMIN PANEL
// ══════════════════════════════════════════
function openAdmin() {
  document.getElementById('loginOverlay').classList.add('open');
  document.getElementById('adminPw').value = '';
  document.getElementById('loginErr').style.display = 'none';
  setTimeout(() => document.getElementById('adminPw').focus(), 80);
}
function closeLogin() { document.getElementById('loginOverlay').classList.remove('open'); }
function doLogin() {
  if (document.getElementById('adminPw').value === ADMIN_PASSWORD) {
    closeLogin();
    document.getElementById('adminOverlay').classList.add('open');
    adminLoadEmails();
    renderAdmin(curAdminShift);
  } else {
    document.getElementById('loginErr').style.display = 'block';
    document.getElementById('adminPw').value = '';
    document.getElementById('adminPw').focus();
  }
}
function closeAdmin() {
  document.getElementById('adminOverlay').classList.remove('open');
  renderAll(); refreshAllProg();
}

// ══════════════════════════════════════════
//  LEADERSHIP PANEL (Local-first + optional API)
// ══════════════════════════════════════════
function openLeadLogin() {
  document.getElementById('leadLoginOverlay').classList.add('open');
  document.getElementById('leadPw').value = '';
  document.getElementById('leadLoginErr').style.display = 'none';
  setTimeout(() => document.getElementById('leadPw').focus(), 80);
}
function closeLeadLogin() { document.getElementById('leadLoginOverlay').classList.remove('open'); }
function doLeadLogin() {
  if (document.getElementById('leadPw').value === LEAD_PASSWORD) {
    closeLeadLogin();
    document.getElementById('leadOverlay').classList.add('open');
    initLeadDefaults();
    renderLead();
  } else {
    document.getElementById('leadLoginErr').style.display = 'block';
    document.getElementById('leadPw').value = '';
    document.getElementById('leadPw').focus();
  }
}
function closeLead() {
  document.getElementById('leadOverlay').classList.remove('open');
}

function initLeadDefaults() {
  const ctx = currentShiftContextCentral();
  const d = document.getElementById('leadDate');
  const s = document.getElementById('leadShift');
  if (d && !d.value) d.value = ctx.shiftDate;
  if (s) s.value = ctx.shift;
}

function leadKey() {
  const date = document.getElementById('leadDate')?.value || '';
  const shift = document.getElementById('leadShift')?.value || '1st';
  return { date, shift, key: `${ORG_ID}#${date}#${shift}` };
}

function renderLead() {
  const { date, shift, key } = leadKey();
  const subs = loadJsonKey(SUBMISSIONS_KEY, { byKey: {} });
  const snap = subs?.byKey?.[key];
  const submittedNotes = (snap && snap.notes) ? snap.notes : '';
  const el = document.getElementById('leadSubmittedNotes');
  if (el) el.textContent = submittedNotes || 'No submission found for this date/shift on this device.';

  const notesStore = loadJsonKey(LEAD_NOTES_KEY, { byKey: {} });
  const leadNotes = notesStore?.byKey?.[key]?.notes || '';
  const ta = document.getElementById('leadNotes');
  if (ta && ta.value !== leadNotes) ta.value = leadNotes;

  const st = document.getElementById('leadCloudStatus');
  if (st) st.textContent = API_BASE_URL ? 'Cloud Ready' : 'Local';
}

function leadSaveLocal() {
  const { key } = leadKey();
  const ta = document.getElementById('leadNotes');
  const notes = ta?.value ?? '';
  const store = loadJsonKey(LEAD_NOTES_KEY, { byKey: {} });
  const byKey = (store && typeof store.byKey === 'object') ? store.byKey : {};
  byKey[key] = { notes, updatedAt: Date.now() };
  saveJsonKey(LEAD_NOTES_KEY, { byKey });
}

async function leadPushToApi() {
  const { date, shift, key } = leadKey();
  const notes = document.getElementById('leadNotes')?.value ?? '';
  try {
    await apiFetch(`/leadership-notes?orgId=${encodeURIComponent(ORG_ID)}&date=${encodeURIComponent(date)}&shift=${encodeURIComponent(shift)}`, { method: 'PUT', jsonBody: { notes } });
    leadSaveLocal();
    toast('✓ Saved to cloud');
    const st = document.getElementById('leadCloudStatus');
    if (st) st.textContent = 'Saved';
  } catch (e) {
    toast(`⚠ ${e.message || 'Cloud save failed'}`);
  }
}

async function leadPullFromApi() {
  const { date, shift } = leadKey();
  try {
    const data = await apiFetch(`/leadership-notes?orgId=${encodeURIComponent(ORG_ID)}&date=${encodeURIComponent(date)}&shift=${encodeURIComponent(shift)}`);
    const ta = document.getElementById('leadNotes');
    if (ta) ta.value = String(data?.notes || '');
    leadSaveLocal();
    toast('✓ Loaded from cloud');
  } catch (e) {
    toast(`⚠ ${e.message || 'Cloud load failed'}`);
  }
}

let _adminEmails = [];
function adminNormalizeEmail(e) {
  return String(e || '').trim().toLowerCase();
}
function adminRenderEmails() {
  const list = document.getElementById('adminEmailList');
  if (!list) return;
  list.innerHTML = '';
  if (!_adminEmails.length) {
    const d = document.createElement('div');
    d.className = 'admin-row-text';
    d.style.color = 'var(--muted)';
    d.style.fontSize = '.82rem';
    d.textContent = 'No recipients yet.';
    list.appendChild(d);
    return;
  }
  _adminEmails.forEach((email, idx) => {
    const row = document.createElement('div');
    row.className = 'admin-email-item';
    row.innerHTML = `<span>${escHtml(email)}</span><button class="admin-email-del" title="Remove" onclick="adminDelEmail(${idx})">✕</button>`;
    list.appendChild(row);
  });
}
function adminAddEmail() {
  const inp = document.getElementById('adminEmailInp');
  const raw = inp?.value || '';
  const email = adminNormalizeEmail(raw);
  if (!email) return;
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { toast('⚠ Invalid email'); return; }
  if (_adminEmails.includes(email)) { toast('Already added'); return; }
  _adminEmails.push(email);
  inp.value = '';
  adminRenderEmails();
}
function adminDelEmail(i) {
  _adminEmails.splice(i, 1);
  adminRenderEmails();
  adminSaveEmails();
}
function adminLoadEmails() {
  const data = loadJsonKey(EMAILS_KEY, { emails: [] });
  _adminEmails = Array.isArray(data?.emails) ? data.emails.map(adminNormalizeEmail).filter(Boolean) : [];
  _adminEmails = Array.from(new Set(_adminEmails));
  adminRenderEmails();
}
function adminSaveEmails() {
  saveJsonKey(EMAILS_KEY, { emails: _adminEmails, savedAt: Date.now() });
  toast('✓ Saved email list');
}
async function adminSyncEmailsToApi() {
  try {
    const data = await apiFetch(`/settings/emails?orgId=${encodeURIComponent(ORG_ID)}`, { method: 'PUT', jsonBody: { emails: _adminEmails } });
    _adminEmails = Array.isArray(data?.emails) ? data.emails : _adminEmails;
    adminSaveEmails();
    toast('✓ Synced to cloud');
  } catch (e) {
    toast(`⚠ ${e.message || 'Cloud sync failed'}`);
  }
}
async function adminPullEmailsFromApi() {
  try {
    const data = await apiFetch(`/settings/emails?orgId=${encodeURIComponent(ORG_ID)}`);
    _adminEmails = Array.isArray(data?.emails) ? data.emails.map(adminNormalizeEmail).filter(Boolean) : [];
    _adminEmails = Array.from(new Set(_adminEmails));
    adminSaveEmails();
    adminRenderEmails();
    toast('✓ Pulled from cloud');
  } catch (e) {
    toast(`⚠ ${e.message || 'Cloud pull failed'}`);
  }
}
function selAdminShift(s, btn) {
  curAdminShift = s;
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  renderAdmin(s);
}

function getCustom(k) {
  const [shift, sec] = splitKey(k);
  if (!state.customTasks[k]) {
    state.customTasks[k] = (DEFAULTS[shift]?.[sec]||[]).map(t=>({...t}));
  }
  return state.customTasks[k];
}

function splitKey(k) {
  // k = "1st-start" | "2nd-restock" | "3rd-lockbox" etc.
  const i = k.indexOf('-');
  return [k.slice(0,i), k.slice(i+1)];
}

function renderAdmin(shift) {
  let html = '';
  SECS[shift].forEach(sec => {
    const k = `${shift}-${sec.key}`;
    const list = getCustom(k);
    html += `<div class="admin-sec-group"><h4>${escHtml(sec.label)}</h4><div id="arows-${k}">`;
    list.forEach((t,i) => { html += adminRow(k,t,i); });
    html += `</div>
      <div class="admin-add-row">
        <input class="admin-add-inp" type="text" id="ainp-${k}" placeholder="New task…">
        <button class="admin-add-btn" onclick="adminAdd('${k}')">+ Add</button>
      </div></div>`;
  });
  document.getElementById('adminContent').innerHTML = html;
}

function adminRow(k, t, i) {
  const wedBtn = t.wednesday
    ? `<span class="wed-toggle" onclick="adminToggleWed('${k}',${i})">WED ✓</span>`
    : `<button class="ab ab-edit" onclick="adminToggleWed('${k}',${i})">+ WED</button>`;
  return `<div class="admin-row" id="arow-${k}-${i}">
    <span class="admin-row-text">${escHtml(t.text)}</span>
    <button class="ab ab-move" onclick="adminMove('${k}',${i},-1)" title="Move up">↑</button>
    <button class="ab ab-move" onclick="adminMove('${k}',${i},1)" title="Move down">↓</button>
    ${wedBtn}
    <button class="ab ab-edit" onclick="adminEdit('${k}',${i})">Edit</button>
    <button class="ab ab-del"  onclick="adminDel('${k}',${i})">Del</button>
  </div>`;
}

function adminEdit(k, i) {
  const t = getCustom(k)[i];
  const row = document.getElementById(`arow-${k}-${i}`);
  row.innerHTML = `
    <input class="admin-edit-inp" type="text" id="aedit-${k}-${i}" value="${escHtml(t.text)}">
    <button class="ab ab-save"   onclick="adminSave('${k}',${i})">Save</button>
    <button class="ab ab-cancel" onclick="renderAdmin(curAdminShift)">Cancel</button>`;
}
function adminSave(k, i) {
  const inp = document.getElementById(`aedit-${k}-${i}`);
  if (!inp?.value.trim()) return;
  getCustom(k)[i].text = inp.value.trim(); requestSave(); renderAdmin(curAdminShift);
}
function adminDel(k, i) {
  getCustom(k).splice(i,1); requestSave(); renderAdmin(curAdminShift);
}
function adminToggleWed(k, i) {
  getCustom(k)[i].wednesday = !getCustom(k)[i].wednesday; requestSave(); renderAdmin(curAdminShift);
}
function adminAdd(k) {
  const inp = document.getElementById(`ainp-${k}`);
  if (!inp?.value.trim()) { toast('⚠ Task text required'); return; }
  getCustom(k).push({ id:'c'+Date.now(), text:inp.value.trim(), wednesday:false });
  inp.value=''; requestSave(); renderAdmin(curAdminShift);
}

function adminMove(k, i, dir) {
  const list = getCustom(k);
  const j = i + dir;
  if (j < 0 || j >= list.length) return;
  const tmp = list[i];
  list[i] = list[j];
  list[j] = tmp;
  requestSave();
  renderAdmin(curAdminShift);
}

// ══════════════════════════════════════════
//  TOAST
// ══════════════════════════════════════════
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg; el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 3000);
}

async function apiFetch(path, { method = 'GET', jsonBody } = {}) {
  if (!API_BASE_URL) throw new Error('API not configured');
  const url = API_BASE_URL.replace(/\/+$/,'') + path;
  const res = await fetch(url, {
    method,
    headers: { 'content-type': 'application/json' },
    body: jsonBody ? JSON.stringify(jsonBody) : undefined,
  });
  const text = await res.text();
  let data = null;
  try { data = JSON.parse(text); } catch {}
  if (!res.ok) throw new Error((data && data.error) ? data.error : `HTTP ${res.status}`);
  return data;
}

// ══════════════════════════════════════════
//  UTILITY
// ══════════════════════════════════════════
function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ══════════════════════════════════════════
//  EVENTS
// ══════════════════════════════════════════
document.getElementById('summaryOverlay').addEventListener('click', e => { if(e.target===e.currentTarget) closeSummary(); });
document.getElementById('installOverlay').addEventListener('click', e => { if(e.target===e.currentTarget) closeInstall(); });
document.getElementById('staffInitials').addEventListener('input', requestSave);
document.getElementById('shiftDate').addEventListener('change', function() {
  const d = new Date(this.value+'T12:00:00');
  isWed = d.getDay() === 3;
  requestSave(); renderAll(); refreshAllProg();
});
document.addEventListener('keydown', e => {
  if (e.key==='Escape') {
    closeSummary();
    document.getElementById('loginOverlay').classList.remove('open');
    document.getElementById('leadLoginOverlay').classList.remove('open');
    document.getElementById('adminOverlay').classList.remove('open');
    document.getElementById('leadOverlay').classList.remove('open');
  }
});

// Best-effort persistence if the app is backgrounded/closed mid-edit.
window.addEventListener('beforeunload', () => { if (_dirty) flushSave(); });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && _dirty) flushSave(); });

// ══════════════════════════════════════════
//  CENTRAL TIME HELPERS (America/Chicago)
// ══════════════════════════════════════════
function centralNow() {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = dtf.formatToParts(new Date());
  const get = (t) => parts.find(p => p.type === t)?.value;
  const y = get('year');
  const m = get('month');
  const d = get('day');
  const hh = Number(get('hour') || 0);
  const mm = Number(get('minute') || 0);
  const wd = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', weekday: 'short' }).format(new Date());
  const wdMap = { Sun:0, Mon:1, Tue:2, Wed:3, Thu:4, Fri:5, Sat:6 };
  return { dateStr: `${y}-${m}-${d}`, hh, mm, dow: (wdMap[wd] ?? 0) };
}

function centralDateStrOffset(days) {
  // Shift the Central calendar date by N days and return YYYY-MM-DD.
  // Use noon UTC to avoid any local DST edge weirdness.
  const base = new Date();
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const partsToday = dtf.formatToParts(base);
  const get = (t) => partsToday.find(p => p.type === t)?.value;
  const y = Number(get('year'));
  const m = Number(get('month'));
  const d = Number(get('day'));
  const noonCentral = new Date(Date.UTC(y, m - 1, d, 18, 0, 0)); // ~noon CT, safe anchor
  const shifted = new Date(noonCentral.getTime() + days * 86400000);
  const parts = dtf.formatToParts(shifted);
  const get2 = (t) => parts.find(p => p.type === t)?.value;
  return `${get2('year')}-${get2('month')}-${get2('day')}`;
}

function autoShiftForCentralTime({ hh, mm }) {
  const mins = hh * 60 + mm;
  // Shift boundaries based on the due times shown in the UI:
  // 3rd due 7:00 AM -> 3rd is 23:00-06:59
  // 1st due 3:00 PM -> 1st is 07:00-14:59
  // 2nd due 11:00 PM -> 2nd is 15:00-22:59
  if (mins >= 7 * 60 && mins < 15 * 60) return '1st';
  if (mins >= 15 * 60 && mins < 23 * 60) return '2nd';
  return '3rd';
}

function currentShiftContextCentral() {
  const cnow = centralNow();
  const shift = autoShiftForCentralTime(cnow);
  // For 3rd shift after midnight, treat the shift as belonging to the prior day.
  const mins = cnow.hh * 60 + cnow.mm;
  const shiftDate = (shift === '3rd' && mins < 7 * 60) ? centralDateStrOffset(-1) : cnow.dateStr;
  return { ...cnow, shift, shiftDate };
}

// ══════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════
function init() {
  // Set today's date as default
  const ctx = currentShiftContextCentral();
  // If no shift date is picked yet, use Central time for Wednesday rules.
  isWed = ctx.dow === 3;
  const todayStr = ctx.shiftDate;

  load();

  // If last shift was submitted/locked, automatically roll to a new session when the
  // Central "shift context" changes (next day, or shift window change).
  // This prevents the app from feeling "stuck" in a locked state.
  if (state.submitted) {
    const prevDate = state.shiftDate || '';
    const prevShift = state.activeShift || '1st';
    const ctxShift = ctx.shift;
    const ctxDate = ctx.shiftDate;
    if (prevDate !== ctxDate || prevShift !== ctxShift) {
      try { localStorage.removeItem(STORAGE_KEY_V2); } catch {}
      try { localStorage.removeItem(STORAGE_KEY_V1); } catch {}
      state = DEFAULT_STATE();
      setSaveIndicator('saved');
    }
  }

  // Set date field
  const dateEl = document.getElementById('shiftDate');
  dateEl.value = state.shiftDate || todayStr;
  if (state.shiftDate) {
    const d = new Date(state.shiftDate+'T12:00:00');
    isWed = d.getDay() === 3;
  }

  document.getElementById('staffInitials').value = state.staffInitials || '';

  // Render tasks
  renderAll();
  renderFu();

  // Restore additionals
  ['1st','2nd','3rd'].forEach(shift => {
    [0,1].forEach(idx => {
      const item = state.additionals[shift]?.[idx];
      const inp = document.getElementById(`add-${shift}-${idx}`);
      if (inp && item) { inp.value = item.text || ''; }
      if (item?.checked) {
        const cb = document.querySelector(`.cb[data-shift="${shift}"][data-idx="${idx}"]`);
        if (cb) cb.classList.add('on');
      }
    });
    const notesEl = document.getElementById(`notes-${shift}`);
    if (notesEl) notesEl.value = state.notes[shift] || '';
  });

  const ri = document.getElementById('restock-items');
  if (ri) ri.value = state.restockItems || '';

  // Restore active shift
  const recommended = ctx.shift;
  const hasOverrideToday =
    state.shiftOverrideDate === todayStr &&
    ['1st','2nd','3rd'].includes(state.shiftOverride);
  const initialShift = hasOverrideToday ? state.shiftOverride : recommended;
  // Keep state consistent (and avoid persisting an old shift forever).
  state.activeShift = initialShift;
  if (!hasOverrideToday) {
    state.shiftOverride = null;
    state.shiftOverrideDate = '';
  }
  selectShift(initialShift);

  if (state.submitted) lockUI();
  refreshAllProg();

  // iOS Safari: show a subtle install hint (dismissible; not shown if already installed)
  try {
    const dismissed = localStorage.getItem(IOS_HINT_DISMISS_KEY) === '1';
    if (!dismissed && !isStandalone() && isiOS() && isSafari()) {
      document.getElementById('installHint')?.classList.add('show');
    }
  } catch {}
}

// ══════════════════════════════════════════
//  SERVICE WORKER
// ══════════════════════════════════════════
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js', { scope: './' })
      .then(r => console.log('SW:', r.scope))
      .catch(e => console.warn('SW failed:', e));
  });
}

// ══════════════════════════════════════════
//  INSTALL PROMPT HOOKS (Android/Chrome)
// ══════════════════════════════════════════
window.addEventListener('beforeinstallprompt', (e) => {
  // Allow custom install UX.
  e.preventDefault();
  _deferredInstallPrompt = e;
});

window.addEventListener('appinstalled', () => {
  _deferredInstallPrompt = null;
  toast('✓ App installed');
  // Update install UI if open
  const ov = document.getElementById('installOverlay');
  if (ov?.classList.contains('open')) {
    openInstall(`<div class="sum-sec"><h4>Status</h4><div class="sum-notes">App is already installed.</div></div>`);
  }
});

init();
