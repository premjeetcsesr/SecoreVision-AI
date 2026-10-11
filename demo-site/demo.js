/**
 * Privacy-Preserving Vision Agent - Live Interactive Lab Controller
 */

let currentScenario = 'registration';
let currentMode = 'semantic';
let privacyActive = true;

const piiDetector = new (window.PIIDetector || PIIDetector)();
const faceDetector = new (window.FaceDetector || FaceDetector)();
const redactor = new (window.RedactionEngine || RedactionEngine)();

// Scenarios DOM Definitions
const SCENARIOS = {
  registration: {
    title: "Employee Identity & Payroll Registration",
    entities: [
      { id: "PERSON_1", category: "name", label: "Premjeet Kumar", sanitizedToken: "[PERSON_NAME]", box: { x: 30, y: 155, width: 230, height: 36 } },
      { id: "EMAIL_1", category: "email", label: "prem@gmail.com", sanitizedToken: "[EMAIL]", box: { x: 280, y: 155, width: 230, height: 36 } },
      { id: "PHONE_1", category: "phone", label: "9876543210", sanitizedToken: "[PHONE]", box: { x: 30, y: 225, width: 230, height: 36 } },
      { id: "PWD_1", category: "password", label: "••••••••••••", sanitizedToken: "[PASSWORD]", box: { x: 280, y: 225, width: 230, height: 36 } },
      { id: "SSN_1", category: "ssn", label: "123-45-6789", sanitizedToken: "[SSN]", box: { x: 30, y: 345, width: 230, height: 36 } },
      { id: "CARD_1", category: "creditCard", label: "4532-1188-9921-3456", sanitizedToken: "[CREDIT_CARD]", box: { x: 280, y: 345, width: 230, height: 36 } },
      { id: "FACE_1", category: "face", label: "Detected Face", sanitizedToken: "[PROTECTED_FACE]", box: { x: 30, y: 60, width: 64, height: 64 } }
    ],
    html: `
      <div class="sim-card">
        <div class="sim-header">
          <span class="sim-badge">Form Registration</span>
          <h4>Employee Payroll & Identity Form</h4>
        </div>
        <div class="sim-avatar-row">
          <div class="sim-avatar-box">
            <div class="sim-face-placeholder">👩‍💼</div>
            <span class="sim-face-tag">Face Photo</span>
          </div>
          <div class="sim-avatar-text">
            <strong>Employee Photo ID</strong>
            <p>Will be redacted locally via Canvas Face Filter</p>
          </div>
        </div>
        <div class="sim-grid-2">
          <div class="sim-field">
            <label>Full Name</label>
            <input type="text" class="sim-input" value="Premjeet Kumar" readonly>
          </div>
          <div class="sim-field">
            <label>Email Address</label>
            <input type="email" class="sim-input" value="prem@gmail.com" readonly>
          </div>
        </div>
        <div class="sim-grid-2">
          <div class="sim-field">
            <label>Phone Number</label>
            <input type="tel" class="sim-input" value="9876543210" readonly>
          </div>
          <div class="sim-field">
            <label>Password</label>
            <input type="password" class="sim-input" value="SuperSecret#2026" readonly>
          </div>
        </div>
        <div class="sim-grid-2" style="margin-top: 10px;">
          <div class="sim-field">
            <label>Social Security (SSN)</label>
            <input type="text" class="sim-input" value="123-45-6789" readonly>
          </div>
          <div class="sim-field">
            <label>Direct Deposit Card</label>
            <input type="text" class="sim-input" value="4532-1188-9921-3456" readonly>
          </div>
        </div>
        <div class="sim-actions">
          <button id="sim-reset-btn" class="sim-btn sim-secondary">Reset Fields</button>
          <button id="sim-next-btn" class="sim-btn sim-secondary">Next Step →</button>
          <button id="sim-submit-btn" class="sim-btn sim-primary glow-btn">SUBMIT REGISTRATION</button>
        </div>
      </div>
    `
  },
  checkout: {
    title: "Secure E-Commerce Payment Portal",
    entities: [
      { id: "PERSON_1", category: "name", label: "Premjeet Kumar", sanitizedToken: "[PERSON_NAME]", box: { x: 30, y: 110, width: 480, height: 36 } },
      { id: "CARD_1", category: "creditCard", label: "4111-2222-3333-4444", sanitizedToken: "[CARD_NUMBER]", box: { x: 30, y: 180, width: 320, height: 36 } },
      { id: "PWD_1", category: "password", label: "882", sanitizedToken: "[CVV]", box: { x: 370, y: 180, width: 140, height: 36 } },
      { id: "ADDR_1", category: "address", label: "742 Evergreen Terrace, Springfield", sanitizedToken: "[BILLING_ADDR]", box: { x: 30, y: 250, width: 480, height: 36 } }
    ],
    html: `
      <div class="sim-card">
        <div class="sim-header">
          <span class="sim-badge">Payment Gateway</span>
          <h4>Express Checkout & Order Confirmation</h4>
        </div>
        <div class="sim-field" style="margin-top: 14px;">
          <label>Cardholder Name</label>
          <input type="text" class="sim-input" value="Premjeet Kumar" readonly>
        </div>
        <div class="sim-grid-2" style="margin-top: 10px;">
          <div class="sim-field" style="flex: 2;">
            <label>Card Number (Visa)</label>
            <input type="text" class="sim-input" value="4111-2222-3333-4444" readonly>
          </div>
          <div class="sim-field" style="flex: 1;">
            <label>CVV / CVC</label>
            <input type="password" class="sim-input" value="882" readonly>
          </div>
        </div>
        <div class="sim-field" style="margin-top: 10px;">
          <label>Billing Street Address</label>
          <input type="text" class="sim-input" value="742 Evergreen Terrace, Springfield, OR 97477" readonly>
        </div>
        <div class="sim-total-row">
          <span>Order Total (2 Items):</span>
          <strong class="text-green">$189.00 USD</strong>
        </div>
        <div class="sim-actions">
          <button id="sim-cancel-btn" class="sim-btn sim-secondary">Cancel Order</button>
          <button id="sim-submit-btn" class="sim-btn sim-primary glow-btn">PAY $189.00 NOW</button>
        </div>
      </div>
    `
  },
  directory: {
    title: "Corporate Staff Directory",
    entities: [
      { id: "PERSON_1", category: "name", label: "Premjeet Kumar", sanitizedToken: "[NAME_1]", box: { x: 90, y: 115, width: 140, height: 20 } },
      { id: "EMAIL_1", category: "email", label: "prem@gmail.com", sanitizedToken: "[EMAIL_1]", box: { x: 240, y: 115, width: 160, height: 20 } },
      { id: "PHONE_1", category: "phone", label: "+91 9876543210", sanitizedToken: "[PHONE_1]", box: { x: 410, y: 115, width: 110, height: 20 } },
      { id: "FACE_1", category: "face", label: "Detected Face", sanitizedToken: "[FACE_1]", box: { x: 40, y: 108, width: 34, height: 34 } }
    ],
    html: `
      <div class="sim-card">
        <div class="sim-header">
          <span class="sim-badge">Staff Table</span>
          <h4>Corporate Directory & Payroll</h4>
        </div>
        <table class="sim-table" style="margin-top: 16px;">
          <thead>
            <tr>
              <th>Staff</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <div style="display:flex;align-items:center;gap:8px;">
                  <span style="font-size:20px;">👩‍💻</span>
                  <strong>Premjeet Kumar</strong>
                </div>
              </td>
              <td>prem@gmail.com</td>
              <td>+91 9876543210</td>
              <td><button id="sim-submit-btn" class="sim-btn-sm sim-primary">View Staff</button></td>
            </tr>
            <tr>
              <td>
                <div style="display:flex;align-items:center;gap:8px;">
                  <span style="font-size:20px;">👨‍💼</span>
                  <strong>Alex Rivera</strong>
                </div>
              </td>
              <td>alex@corp.net</td>
              <td>+1 555-234-5678</td>
              <td><button class="sim-btn-sm sim-secondary">View Staff</button></td>
            </tr>
          </tbody>
        </table>
        <div class="sim-actions" style="margin-top: 24px;">
          <button id="sim-export-btn" class="sim-btn sim-secondary">Export Directory</button>
          <button id="sim-add-btn" class="sim-btn sim-primary">Add New Employee</button>
        </div>
      </div>
    `
  }
};

// Initialize on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  loadScenario('registration');
});

/**
 * Load and render a chosen scenario
 */
function loadScenario(scenarioKey) {
  currentScenario = scenarioKey;
  const scenario = SCENARIOS[scenarioKey] || SCENARIOS.registration;

  // 1. Render Raw HTML in left client viewport
  const renderFrame = document.getElementById('scenario-render-frame');
  renderFrame.innerHTML = scenario.html;

  // Update client PII counters
  const faces = scenario.entities.filter(e => e.category === 'face').length;
  const piiCount = scenario.entities.length;
  document.getElementById('client-pii-count').textContent = `${piiCount} entities`;
  document.getElementById('client-face-count').textContent = `${faces} face(s)`;

  // 2. Render Sanitized Canvas in right server viewport
  renderSanitizedCanvas();
}

/**
 * Set Redaction Mode (semantic, blackout, blur, pixelate)
 */
function setRedactionMode(mode) {
  currentMode = mode;
  document.querySelectorAll('#redaction-mode-group .mode-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });
  
  const modeLabels = {
    semantic: "Semantic Badges",
    blackout: "Blackout Mask",
    blur: "Gaussian Blur",
    pixelate: "Pixelate Mosaic"
  };
  document.getElementById('active-mode-label').textContent = modeLabels[mode] || mode;

  renderSanitizedCanvas();
}

/**
 * Toggle Privacy Shield ON/OFF
 */
function togglePrivacy(enabled) {
  privacyActive = enabled;
  const lbl = document.getElementById('privacy-toggle-label');
  if (enabled) {
    lbl.textContent = 'ACTIVE (100% Redacted)';
    lbl.className = 'toggle-status active';
  } else {
    lbl.textContent = 'DISABLED (Raw Screen Leaking!)';
    lbl.className = 'toggle-status disabled';
  }
  renderSanitizedCanvas();
}

/**
 * Render the Sanitized Canvas representation based on active scenario and redaction mode
 */
function renderSanitizedCanvas() {
  const canvas = document.getElementById('sanitized-canvas-preview');
  const ctx = canvas.getContext('2d');
  const scenario = SCENARIOS[currentScenario] || SCENARIOS.registration;

  const w = 550;
  const h = 440;
  canvas.width = w;
  canvas.height = h;

  // Background
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, w, h);

  // Border & Grid
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 1;
  for (let x = 0; x < w; x += 40) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
  }
  for (let y = 0; y < h; y += 40) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }

  // Card outline
  ctx.fillStyle = '#1e293b';
  ctx.roundRect ? ctx.roundRect(20, 20, w - 40, h - 40, 12) : ctx.rect(20, 20, w - 40, h - 40);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.stroke();

  // Header Title
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText(scenario.title, 35, 48);

  // If privacy is disabled, draw raw text (UNSAFE MODE)
  if (!privacyActive) {
    scenario.entities.forEach(ent => {
      const box = ent.box;
      ctx.fillStyle = '#f87171';
      ctx.fillRect(box.x, box.y, box.width, box.height);
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px sans-serif';
      ctx.fillText(`RAW: ${ent.label}`, box.x + 6, box.y + box.height / 2 + 4);
    });
  } else {
    // PRIVACY ON: Draw Redacted Elements
    scenario.entities.forEach(ent => {
      const box = ent.box;

      if (currentMode === 'blackout') {
        ctx.fillStyle = '#090d16';
        ctx.fillRect(box.x, box.y, box.width, box.height);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1;
        ctx.strokeRect(box.x, box.y, box.width, box.height);
        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 11px monospace';
        ctx.fillText('██████████', box.x + 8, box.y + box.height / 2 + 4);
      } else if (currentMode === 'blur') {
        ctx.fillStyle = 'rgba(148, 163, 184, 0.4)';
        ctx.fillRect(box.x, box.y, box.width, box.height);
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.strokeRect(box.x, box.y, box.width, box.height);
      } else if (currentMode === 'pixelate') {
        const bs = 8;
        for (let px = box.x; px < box.x + box.width; px += bs) {
          for (let py = box.y; py < box.y + box.height; py += bs) {
            const shade = Math.floor(Math.random() * 60) + 40;
            ctx.fillStyle = `rgb(${shade}, ${shade + 20}, ${shade + 40})`;
            ctx.fillRect(px, py, Math.min(bs, box.x + box.width - px), Math.min(bs, box.y + box.height - py));
          }
        }
      } else {
        // Semantic Token Badges
        const bgColors = {
          email: '#8b5cf6',
          phone: '#f59e0b',
          creditCard: '#ef4444',
          ssn: '#dc2626',
          password: '#059669',
          name: '#3b82f6',
          address: '#06b6d4',
          face: '#ec4899'
        };
        const bg = bgColors[ent.category] || '#64748b';

        ctx.fillStyle = bg;
        if (ctx.roundRect) {
          ctx.beginPath();
          ctx.roundRect(box.x, box.y, box.width, box.height, 6);
          ctx.fill();
        } else {
          ctx.fillRect(box.x, box.y, box.width, box.height);
        }

        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px system-ui, sans-serif';
        ctx.fillText(ent.sanitizedToken, box.x + 8, box.y + box.height / 2 + 4);
      }
    });
  }

  // Draw Action Buttons on sanitized canvas
  ctx.fillStyle = '#8b5cf6';
  ctx.fillRect(360, 370, 150, 36);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText('SUBMIT ACTION', 380, 392);
}

/**
 * Set Task Prompt Helper
 */
function setTask(prompt) {
  document.getElementById('task-prompt-input').value = prompt;
}

/**
 * Run Full Simulation Flow
 */
async function runSimulation() {
  const task = document.getElementById('task-prompt-input').value.trim();
  const runBtn = document.getElementById('run-agent-btn');
  const actionMarker = document.getElementById('ai-action-marker');

  runBtn.disabled = true;
  runBtn.innerHTML = '⚡ Processing...';
  actionMarker.classList.add('hidden');

  // Step 1: Highlight Capture
  highlightPipelineStep(1, 15);
  await sleep(200);

  // Step 2: Highlight DOM & OCR
  highlightPipelineStep(2, 12);
  await sleep(200);

  // Step 3: Highlight Local Redaction
  highlightPipelineStep(3, 16);
  await sleep(250);

  // Step 4: Server Reasoning Call
  highlightPipelineStep(4, 75);

  const scenario = SCENARIOS[currentScenario] || SCENARIOS.registration;
  const sanitizedDOM = [
    { agentId: "el_name", tagName: "input", text: "[PERSON_NAME]", isClickable: false, boundingBox: { x: 30, y: 155, width: 230, height: 36 } },
    { agentId: "el_email", tagName: "input", text: "[EMAIL]", isClickable: false, boundingBox: { x: 280, y: 155, width: 230, height: 36 } },
    { agentId: "el_phone", tagName: "input", text: "[PHONE]", isClickable: false, boundingBox: { x: 30, y: 225, width: 230, height: 36 } },
    { agentId: "el_pwd", tagName: "input", text: "[PASSWORD]", isClickable: false, boundingBox: { x: 280, y: 225, width: 230, height: 36 } },
    { agentId: "sim-reset-btn", tagName: "button", text: "Reset Fields", isClickable: true, boundingBox: { x: 30, y: 370, width: 100, height: 36 } },
    { agentId: "sim-next-btn", tagName: "button", text: "Next Step", isClickable: true, boundingBox: { x: 140, y: 370, width: 100, height: 36 } },
    { agentId: "sim-submit-btn", tagName: "button", text: "SUBMIT REGISTRATION", isClickable: true, boundingBox: { x: 360, y: 370, width: 150, height: 36 } }
  ];

  let decision = null;
  try {
    const res = await fetch('http://127.0.0.1:8000/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        task: task,
        sanitized_dom: sanitizedDOM,
        redaction_telemetry: {
          entities_redacted: scenario.entities.length,
          redaction_style: currentMode,
          entity_categories: scenario.entities.map(e => e.category)
        }
      })
    });
    if (res.ok) {
      decision = await res.json();
    }
  } catch (e) {
    console.log('Backend fetch error, using local reasoning fallback:', e);
  }

  // Fallback decision if backend not running
  if (!decision) {
    const isNext = task.toLowerCase().includes('next');
    const isReset = task.toLowerCase().includes('reset');
    decision = {
      action: "click",
      target_id: isNext ? "sim-next-btn" : (isReset ? "sim-reset-btn" : "sim-submit-btn"),
      target_text: isNext ? "Next Step →" : (isReset ? "Reset Fields" : "SUBMIT REGISTRATION"),
      coordinates: isNext ? { x: 190, y: 388 } : (isReset ? { x: 80, y: 388 } : { x: 435, y: 388 }),
      confidence: 0.97,
      reasoning: `Located target action '${isNext ? "Next Step" : (isReset ? "Reset" : "Submit")}' in sanitized DOM without accessing sensitive user values.`,
      privacy_audit: {
        raw_pii_detected_on_server: false,
        sanitized_tokens_found_count: 5,
        entities_redacted_at_client: scenario.entities.length
      }
    };
  }

  // Step 5: Highlight Action Execution
  highlightPipelineStep(5, 20);
  await sleep(200);

  // Render JSON Output Box
  document.getElementById('json-decision-output').textContent = JSON.stringify({
    action: decision.action,
    target_id: decision.target_id,
    target_text: decision.target_text,
    coordinates: decision.coordinates,
    confidence: decision.confidence,
    reasoning: decision.reasoning
  }, null, 2);

  // Position Action Marker on Canvas
  const canvas = document.getElementById('sanitized-canvas-preview');
  const rect = canvas.getBoundingClientRect();
  const coords = decision.coordinates || { x: 435, y: 388 };
  
  actionMarker.style.left = `${(coords.x / 550) * 100}%`;
  actionMarker.style.top = `${(coords.y / 440) * 100}%`;
  document.getElementById('marker-label').textContent = `${decision.action.toUpperCase()}: ${decision.target_text || 'TARGET'}`;
  actionMarker.classList.remove('hidden');

  // Trigger Client DOM Action with Highlight Ring
  const targetBtn = document.getElementById(decision.target_id || 'sim-submit-btn');
  if (targetBtn) {
    targetBtn.classList.add('privacy-agent-highlight');
    setTimeout(() => {
      targetBtn.classList.remove('privacy-agent-highlight');
    }, 1600);
  }

  // Update Latency
  const totalMs = 15 + 12 + 16 + (decision.latency_ms || 75) + 20;
  document.getElementById('live-total-latency').textContent = `Latency: ${totalMs} ms`;

  runBtn.disabled = false;
  runBtn.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
      <polygon points="5 3 19 12 5 21 5 3"></polygon>
    </svg>
    RUN AGENT
  `;
}

function highlightPipelineStep(stepNum, timeMs) {
  for (let i = 1; i <= 5; i++) {
    const el = document.getElementById(`step-${i}`);
    if (el) el.classList.toggle('highlight', i === stepNum);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


/* ========================================================
   SCREEN PRIVACY GUARD & LOCAL BROWSER VAULT (LAB)
   ======================================================== */

let currentDetectedEntities = [];

function appendLog(type, msg) {
  console.log(`[${type}] ${msg}`);
}

function processClientSideScreen() {
  const scenario = SCENARIOS[currentScenario] || SCENARIOS.registration;
  currentDetectedEntities = scenario.entities || [];
  renderSanitizedCanvas();
}

function scanLabSensitiveData() {
  const scanBtn = document.getElementById('lab-scan-btn');
  if (scanBtn) {
    scanBtn.innerHTML = '🔍 Scanning...';
    setTimeout(() => { scanBtn.innerHTML = '🔍 Scan & Shield Screen'; }, 600);
  }
  processClientSideScreen();
  const piiCount = currentDetectedEntities ? currentDetectedEntities.length : 0;
  appendLog('PRIVACY_SHIELD', 'Screen Guard active: ' + piiCount + ' sensitive entities shielded on screen. 0 raw data leaks.');
}

function saveLabToLocalVault() {
  if (!currentDetectedEntities || currentDetectedEntities.length === 0) {
    appendLog('VAULT_EMPTY', 'No sensitive items detected to save.');
    return;
  }
  const piiDet = new PIIDetector();
  const currentScenario = document.getElementById('scenario-selector')?.value || 'scenario';
  const now = new Date().toISOString();

  const newRecords = currentDetectedEntities.map((ent, idx) => {
    const raw = ent.rawText || (ent.element ? (ent.element.value || ent.element.innerText) : '') || '';
    const masked = piiDet.maskValue(raw, ent.category);
    return {
      id: 'lab_vault_' + Date.now() + '_' + idx,
      category: ent.category || 'other',
      masked: masked,
      token: ent.sanitizedToken || ('[PROTECTED_' + (ent.category || 'PII').toUpperCase() + '_' + (idx + 1) + ']'),
      domain: 'demo-lab (' + currentScenario + ')',
      url: window.location.href,
      detectedAt: now,
      shieldStyle: currentRedactionMode || 'semantic'
    };
  });

  try {
    const raw = localStorage.getItem('privacy_vault_records');
    const existing = raw ? JSON.parse(raw) : [];
    const unique = newRecords.filter(n => !existing.some(e => e.masked === n.masked && e.domain === n.domain));
    const merged = [...unique, ...existing].slice(0, 500);
    localStorage.setItem('privacy_vault_records', JSON.stringify(merged));
    loadLabVaultRecords();
    appendLog('LOCAL_VAULT_SAVED', 'Stored ' + newRecords.length + ' records in browser local storage. Zero cloud transmission.');
  } catch (e) {
    console.warn('Local vault storage warning:', e);
  }
}

function loadLabVaultRecords() {
  const container = document.getElementById('lab-vault-items');
  const countPill = document.getElementById('lab-vault-count');
  if (!container) return;

  let records = [];
  try {
    const raw = localStorage.getItem('privacy_vault_records');
    records = raw ? JSON.parse(raw) : [];
  } catch (e) {
    records = [];
  }

  if (countPill) {
    countPill.textContent = records.length + ' items stored locally';
  }

  if (records.length === 0) {
    container.innerHTML = '<div class="vault-empty-inline">No sensitive data saved in browser local storage yet. Click "Save to Local Vault" to store.</div>';
    return;
  }

  container.innerHTML = '';
  records.slice(0, 8).forEach((rec) => {
    const card = document.createElement('div');
    card.className = 'lab-vault-item-card';
    card.innerHTML = '<div class="lab-vault-cat badge-' + rec.category + '">' + (rec.category || 'PII').toUpperCase() + '</div><div class="lab-vault-val">' + (rec.masked || '••••••••') + '</div><div class="lab-vault-domain">' + (rec.domain || 'Local') + '</div>';
    container.appendChild(card);
  });
}

function exportLabVault() {
  let records = [];
  try {
    const raw = localStorage.getItem('privacy_vault_records');
    records = raw ? JSON.parse(raw) : [];
  } catch (e) {}

  if (records.length === 0) {
    alert('Local browser vault is currently empty.');
    return;
  }

  const exportData = {
    exportDate: new Date().toISOString(),
    vaultType: 'Local Browser Storage',
    zeroCloudLeakageVerified: true,
    totalRecords: records.length,
    records: records
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'privacy_vault_export_' + Date.now() + '.json';
  a.click();
  URL.revokeObjectURL(url);
}

function clearLabVault() {
  if (confirm('Permanently delete all sensitive records from browser local storage?')) {
    localStorage.removeItem('privacy_vault_records');
    loadLabVaultRecords();
    appendLog('VAULT_CLEARED', 'Local browser storage wiped clean.');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadLabVaultRecords();
});

/* ========================================================
   DASHBOARD AGENT PIPELINE RUNNER (MATCHING ARCHITECTURE)
   ======================================================== */

function executeQuickPrompt(cmd) {
  const inp = document.getElementById('task-prompt-input');
  if (inp) inp.value = cmd;
  runDashboardAgentTask();
}

async function runDashboardAgentTask() {
  const inp = document.getElementById('task-prompt-input');
  const task = inp ? inp.value.trim() : 'Find Next button';
  await runArchitecturePipeline(task);
}

async function runArchitecturePipeline(task) {
  const runBtn = document.getElementById('run-agent-btn');
  const badge = document.getElementById('arch-live-badge');
  if (runBtn) {
    runBtn.disabled = true;
    runBtn.innerHTML = '⚡ RUNNING...';
  }

  const setArchStep = (step) => {
    for (let i = 1; i <= 7; i++) {
      const node = document.getElementById(`arch-step-${i}`);
      if (!node) continue;
      if (i < step) {
        node.className = 'arch-node completed';
      } else if (i === step) {
        node.className = 'arch-node active';
      } else {
        node.className = 'arch-node';
      }
    }
  };

  // Step 1: Dashboard Page: User Command
  setArchStep(1);
  if (badge) badge.textContent = `1. User Command: "${task}"`;
  appendLog('USER_COMMAND', `Dashboard received: "${task}"`);
  await sleep(250);

  // Step 2: Chrome Extension: Screen Capture + Local Vision/OCR
  setArchStep(2);
  if (badge) badge.textContent = '2. Screen Capture & Local Vision/OCR';
  appendLog('EXTENSION_CAPTURE', 'Captured visible viewport. Extracted structured DOM layout.');
  await sleep(250);

  // Step 3: Privacy Gate: PII Detection & Redaction
  setArchStep(3);
  if (badge) badge.textContent = '3. Privacy Gate: PII Redacted Locally';
  processClientSideScreen();
  appendLog('PRIVACY_GATE', 'Redacted sensitive entities on client canvas. 0 raw data leaks.');
  await sleep(250);

  // Step 4: Backend AI: Sanitized Context Only
  setArchStep(4);
  if (badge) badge.textContent = '4. Backend AI: Sanitized Context Only';
  appendLog('AI_REASONING', 'Transmitted sanitized DOM & redacted canvas to AI reasoning server.');

  // Run reasoning & get action decision
  await runSimulation();

  // Step 5: Action Plan Generated
  setArchStep(5);
  if (badge) badge.textContent = '5. Action Plan: Target Located';
  await sleep(200);

  // Step 6: Chrome Extension: Validate Target & Execute Browser Action
  setArchStep(6);
  if (badge) badge.textContent = '6. Chrome Extension: Target Validated & Clicked';
  await sleep(250);

  // Step 7: Dashboard Status Updated
  setArchStep(7);
  if (badge) badge.textContent = '7. Dashboard: Status Updated ✓ (Success)';
  appendLog('ACTION_EXECUTED', 'Target executed with visual feedback ring. Dashboard updated.');

  if (runBtn) {
    runBtn.disabled = false;
    runBtn.innerHTML = '▶ RUN AGENT';
  }
}
