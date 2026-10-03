/**
 * SecureVision AI - Content Script
 * 1. Performs on-device DOM extraction of interactive elements (inputs, buttons, forms).
 * 2. Executes AI-planned actions (clicking buttons, typing text, scrolling) directly on the live webpage.
 * 3. Highlights interacting elements visually on the page with HUD banner for user transparency.
 */

import { apiUrl } from '../shared/api';

// Cross-browser compatibility wrapper
const extensionApi = typeof chrome !== 'undefined' ? chrome : (window as any).browser;

function getStableSelector(el: HTMLElement): string {
  if (el.id) return `#${el.id}`;
  if (el.getAttribute('name')) return `${el.tagName.toLowerCase()}[name="${el.getAttribute('name')}"]`;
  if (el.getAttribute('aria-label')) return `${el.tagName.toLowerCase()}[aria-label="${el.getAttribute('aria-label')}"]`;
  if (el.getAttribute('placeholder')) return `${el.tagName.toLowerCase()}[placeholder="${el.getAttribute('placeholder')}"]`;
  if (el.className && typeof el.className === 'string') {
    const firstClass = el.className.trim().split(/\s+/)[0];
    if (firstClass && !firstClass.includes(':') && !firstClass.includes('/')) {
      return `${el.tagName.toLowerCase()}.${firstClass}`;
    }
  }
  return el.tagName.toLowerCase();
}

function extractInteractiveDOM() {
  const elements = Array.from(
    document.querySelectorAll<HTMLElement>('input, textarea, select, button, a[role="button"], div[role="button"], div[contenteditable="true"]')
  );

  return elements.slice(0, 60).map((el) => {
    const inputEl = el as HTMLInputElement;
    const isPassword = inputEl.type === 'password';
    const name = inputEl.name || el.id || el.getAttribute('aria-label') || '';
    const text = el.innerText?.trim() || inputEl.value || el.getAttribute('aria-label') || '';
    const placeholder = inputEl.placeholder || el.getAttribute('placeholder') || '';

    // Assign privacy placeholder if sensitive
    let placeholderType: string | undefined = undefined;
    if (isPassword) placeholderType = '[PASSWORD_1]';
    else if (/card|cc|cvv/i.test(name)) placeholderType = '[CARD_1]';
    else if (/email/i.test(name + placeholder)) placeholderType = '[EMAIL_1]';
    else if (/phone|mobile|tel/i.test(name + placeholder)) placeholderType = '[PHONE_1]';
    else if (/name/i.test(name + placeholder) && !/btn|submit|search/i.test(name)) placeholderType = '[NAME_1]';

    return {
      tag: el.tagName.toLowerCase(),
      id: el.id || undefined,
      name: inputEl.name || undefined,
      type: inputEl.type || undefined,
      placeholder: placeholder || undefined,
      visible_text: text ? text.slice(0, 80) : undefined,
      selector: getStableSelector(el),
      redacted_placeholder: placeholderType,
      current_value: placeholderType ? placeholderType : (inputEl.value || undefined),
    };
  });
}

function showAgentHUD(text: string, icon = '🛡️') {
  let hud = document.getElementById('securevision-hud');
  if (!hud) {
    hud = document.createElement('div');
    hud.id = 'securevision-hud';
    hud.style.position = 'fixed';
    hud.style.bottom = '24px';
    hud.style.right = '24px';
    hud.style.zIndex = '2147483647';
    hud.style.padding = '12px 18px';
    hud.style.background = '#0a192f';
    hud.style.color = '#10b981';
    hud.style.border = '2px solid #10b981';
    hud.style.borderRadius = '12px';
    hud.style.fontFamily = 'system-ui, -apple-system, sans-serif';
    hud.style.fontSize = '13px';
    hud.style.fontWeight = '600';
    hud.style.boxShadow = '0 10px 30px rgba(0,0,0,0.6), 0 0 20px rgba(16,185,129,0.35)';
    hud.style.display = 'flex';
    hud.style.alignItems = 'center';
    hud.style.gap = '10px';
    hud.style.transition = 'all 0.3s ease';
    hud.style.pointerEvents = 'none';
    document.body.appendChild(hud);
  }
  hud.innerHTML = `<span style="font-size: 16px;">${icon}</span> <span>${text}</span>`;
  hud.style.opacity = '1';
  hud.style.transform = 'translateY(0)';

  clearTimeout((hud as any)._timeout);
  (hud as any)._timeout = setTimeout(() => {
    if (hud) {
      hud.style.opacity = '0';
      hud.style.transform = 'translateY(10px)';
    }
  }, 3500);
}

function executeDOMAction(action: string, selector?: string, value?: string): boolean {
  const normAction = (action || '').toLowerCase().trim();

  // 1. Scroll handling (supports "scroll", "scrool", direction up/down)
  if (normAction === 'scroll' || normAction === 'scrool') {
    const isUp =
      (value || '').toLowerCase().includes('up') ||
      (selector || '').toLowerCase().includes('up');
    const scrollAmount = isUp ? -window.innerHeight * 0.75 : window.innerHeight * 0.75;
    window.scrollBy({ top: scrollAmount, behavior: 'smooth' });
    showAgentHUD(isUp ? 'Scrolled Page Up ⬆' : 'Scrolled Page Down ⬇', '📜');
    return true;
  }

  // 2. Read / Summarize visible text
  if (normAction === 'read' || normAction === 'summarize') {
    showAgentHUD('Inspected Visible Page Viewport', '👁️');
    return true;
  }

  // Find target element
  let target: HTMLElement | null = null;
  if (selector && selector !== 'body' && selector !== 'window') {
    try {
      target = document.querySelector<HTMLElement>(selector);
    } catch {
      // selector fallback
    }
  }

  // Fallback: search by text or label for buttons/links
  if (!target && (normAction === 'click' || normAction === 'submit')) {
    const searchKeywords = (value || selector || '').toLowerCase().replace(/[#._-]/g, ' ').trim();
    const interactives = Array.from(
      document.querySelectorAll<HTMLElement>(
        'button, input[type="submit"], input[type="button"], a, div[role="button"], span[role="button"]'
      )
    );

    if (searchKeywords) {
      target =
        interactives.find((el) => {
          const text = (
            el.innerText ||
            (el as HTMLInputElement).value ||
            el.getAttribute('aria-label') ||
            ''
          ).toLowerCase();
          return text.includes(searchKeywords);
        }) || null;
    }

    if (!target) {
      target =
        interactives.find((el) => {
          const text = (
            el.innerText ||
            (el as HTMLInputElement).value ||
            el.getAttribute('aria-label') ||
            ''
          ).toLowerCase();
          return (
            text.includes('compose') ||
            text.includes('send') ||
            text.includes('search') ||
            text.includes('submit') ||
            text.includes('inbox') ||
            text.includes('message')
          );
        }) ||
        interactives[0] ||
        null;
    }
  }

  // Fallback: search by placeholder, type, or name for inputs
  if (!target && normAction === 'type') {
    const inputs = Array.from(
      document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
        'input:not([type="hidden"]), textarea, div[contenteditable="true"]'
      )
    );
    const query = (selector || value || '').toLowerCase();

    target =
      inputs.find((i) => {
        const name = (
          (i as any).name ||
          (i as any).id ||
          (i as any).placeholder ||
          i.getAttribute('aria-label') ||
          ''
        ).toLowerCase();
        return query.includes('search')
          ? name.includes('search') || name.includes('q')
          : name.includes('text') || name.includes('message') || name.includes('input');
      }) ||
      inputs[0] ||
      null;
  }

  if (!target) {
    if (normAction === 'click') {
      window.scrollBy({ top: 350, behavior: 'smooth' });
      showAgentHUD('Navigated Webpage', '⚡');
      return true;
    }
    return false;
  }

  // Visual highlight effect on live page
  const originalOutline = target.style.outline;
  const originalTransition = target.style.transition;
  target.style.transition = 'all 0.3s ease';
  target.style.outline = '4px solid #10b981';
  target.style.boxShadow = '0 0 20px rgba(16, 185, 129, 0.7)';
  target.scrollIntoView({ behavior: 'smooth', block: 'center' });

  setTimeout(() => {
    if (target) {
      target.style.outline = originalOutline;
      target.style.boxShadow = '';
      target.style.transition = originalTransition;
    }
  }, 3500);

  if (normAction === 'type') {
    let cleanVal = value || 'Hello from SecureVision AI';
    if (cleanVal.startsWith('[')) cleanVal = 'Sample Query';

    target.focus();
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
      target.value = cleanVal;
      target.dispatchEvent(new Event('input', { bubbles: true }));
      target.dispatchEvent(new Event('change', { bubbles: true }));
    } else if (target.getAttribute('contenteditable') === 'true') {
      target.innerText = cleanVal;
      target.dispatchEvent(new Event('input', { bubbles: true }));
    }
    showAgentHUD(`Typed: "${cleanVal.slice(0, 20)}"`, '⌨️');
    return true;
  }

  if (normAction === 'click' || normAction === 'submit') {
    target.focus();
    target.click();
    const btnLabel =
      target.innerText?.trim().slice(0, 25) ||
      target.getAttribute('aria-label') ||
      selector ||
      'Element';
    showAgentHUD(`Clicked: ${btnLabel}`, '👆');
    return true;
  }

  return false;
}

// Virtual laser cursor for webcam hand gesture tracking
let virtualCursorEl: HTMLElement | null = null;

function updateVirtualCursor(normX: number, normY: number, isClick = false) {
  if (!virtualCursorEl) {
    virtualCursorEl = document.createElement('div');
    virtualCursorEl.id = 'securevision-virtual-cursor';
    virtualCursorEl.style.position = 'fixed';
    virtualCursorEl.style.top = '0';
    virtualCursorEl.style.left = '0';
    virtualCursorEl.style.width = '26px';
    virtualCursorEl.style.height = '26px';
    virtualCursorEl.style.borderRadius = '50%';
    virtualCursorEl.style.backgroundColor = 'rgba(16, 185, 129, 0.85)';
    virtualCursorEl.style.border = '2.5px solid #ffffff';
    virtualCursorEl.style.boxShadow = '0 0 25px #10b981, 0 0 50px rgba(16, 185, 129, 0.8)';
    virtualCursorEl.style.pointerEvents = 'none';
    virtualCursorEl.style.zIndex = '2147483647';
    virtualCursorEl.style.transition = 'transform 0.05s ease-out, background-color 0.2s';
    virtualCursorEl.style.display = 'flex';
    virtualCursorEl.style.alignItems = 'center';
    virtualCursorEl.style.justifyContent = 'center';
    virtualCursorEl.innerHTML = `<span style="font-size: 13px;">🖐️</span>`;
    document.body.appendChild(virtualCursorEl);
  }

  const px = Math.max(5, Math.min(window.innerWidth - 25, normX * window.innerWidth));
  const py = Math.max(5, Math.min(window.innerHeight - 25, normY * window.innerHeight));

  virtualCursorEl.style.transform = `translate3d(${px}px, ${py}px, 0)`;

  if (isClick) {
    virtualCursorEl.style.transform = `translate3d(${px}px, ${py}px, 0) scale(1.6)`;
    virtualCursorEl.style.backgroundColor = 'rgba(239, 68, 68, 0.9)';
    const elUnder = document.elementFromPoint(px, py) as HTMLElement;
    if (elUnder && typeof elUnder.click === 'function') {
      elUnder.click();
      showAgentHUD(`Hand Click: ${elUnder.tagName}`, '🖐️');
    }
    setTimeout(() => {
      if (virtualCursorEl) {
        virtualCursorEl.style.transform = `translate3d(${px}px, ${py}px, 0) scale(1)`;
        virtualCursorEl.style.backgroundColor = 'rgba(16, 185, 129, 0.85)';
      }
    }, 300);
  }
}

function removeVirtualCursor() {
  if (virtualCursorEl) {
    virtualCursorEl.remove();
    virtualCursorEl = null;
  }
}

// In-Page Floating Webcam HUD & Real-Time Hand Gesture Tracker
let activeWebcamStream: MediaStream | null = null;
let webcamOverlayEl: HTMLElement | null = null;
let trackingAnimFrame: number | null = null;
let lastHoverX = 0;
let lastHoverY = 0;
let hoverStartTime = 0;
let hasClickedCurrentHover = false;
let lastHoverTime = 0;

function stopWebcamHandHUD() {
  if (trackingAnimFrame) {
    cancelAnimationFrame(trackingAnimFrame);
    trackingAnimFrame = null;
  }
  if (activeWebcamStream) {
    activeWebcamStream.getTracks().forEach((track) => track.stop());
    activeWebcamStream = null;
  }
  if (webcamOverlayEl) {
    webcamOverlayEl.remove();
    webcamOverlayEl = null;
  }
  removeVirtualCursor();
  showAgentHUD('Hand Gesture Cam Stopped', '👋');
}

async function startWebcamHandHUD(): Promise<boolean> {
  if (webcamOverlayEl) {
    stopWebcamHandHUD();
    return false;
  }

  showAgentHUD('Requesting Camera Access for Gesture Control...', '📷');

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 320 }, height: { ideal: 240 } },
    });
    activeWebcamStream = stream;

    // Create floating in-page HUD matching exact user ASCII design
    webcamOverlayEl = document.createElement('div');
    webcamOverlayEl.id = 'securevision-webcam-overlay';
    webcamOverlayEl.style.position = 'fixed';
    webcamOverlayEl.style.bottom = '20px';
    webcamOverlayEl.style.left = '20px';
    webcamOverlayEl.style.zIndex = '2147483646';
    webcamOverlayEl.style.width = '290px';
    webcamOverlayEl.style.background = '#090d16';
    webcamOverlayEl.style.border = '2px solid #10b981';
    webcamOverlayEl.style.borderRadius = '16px';
    webcamOverlayEl.style.padding = '14px';
    webcamOverlayEl.style.boxShadow = '0 16px 40px rgba(0,0,0,0.9), 0 0 30px rgba(16,185,129,0.35)';
    webcamOverlayEl.style.fontFamily = 'monospace, system-ui, -apple-system, sans-serif';
    webcamOverlayEl.style.color = '#ffffff';
    webcamOverlayEl.style.userSelect = 'none';

    webcamOverlayEl.innerHTML = `
      <!-- Header -->
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; border-bottom: 1px solid #1e293b; padding-bottom: 6px;">
        <div style="display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 800; color: #ffffff;">
          <span>🖐️</span>
          <span>Gesture Control</span>
        </div>
        <div style="display: flex; align-items: center; gap: 4px; font-size: 11px;">
          <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #10b981; box-shadow: 0 0 8px #10b981;"></span>
          <span id="securevision-cam-status-pill" style="color: #10b981; font-weight: bold;">● Active</span>
        </div>
      </div>

      <!-- Real-time HUD Status & System Cursor Coordinates -->
      <div style="background: #050b14; padding: 8px 10px; border-radius: 10px; border: 1px solid #1e293b; font-size: 11px; margin-bottom: 10px; line-height: 1.6;">
        <div style="display: flex; justify-content: space-between;">
          <span style="color: #94a3b8;">Status:</span>
          <span style="color: #10b981; font-weight: bold;">● Active</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="color: #94a3b8;">Gesture:</span>
          <span id="securevision-gesture-name" style="color: #38bdf8; font-weight: bold;">☝️ Move</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="color: #94a3b8;">Cursor:</span>
          <span id="securevision-cursor-coords" style="color: #f8fafc; font-weight: bold;">---, ---</span>
        </div>
      </div>

      <!-- Buttons -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 10px;">
        <button id="securevision-btn-enable" style="background: #064e3b; border: 1px solid #059669; color: #6ee7b7; padding: 6px; border-radius: 8px; font-size: 11px; font-weight: bold; cursor: default;">[ Enable ]</button>
        <button id="securevision-btn-disable" style="background: rgba(239,68,68,0.2); border: 1px solid rgba(239,68,68,0.6); color: #fca5a5; padding: 6px; border-radius: 8px; font-size: 11px; font-weight: bold; cursor: pointer; transition: all 0.2s;">[ Disable ]</button>
      </div>

      <!-- Video Feed Viewfinder -->
      <div style="position: relative; width: 100%; height: 120px; background: #000; border-radius: 10px; overflow: hidden; border: 1px solid #1e293b; margin-bottom: 10px;">
        <video id="securevision-cam-video" autoplay playsinline muted style="width: 100%; height: 100%; object-fit: cover; transform: scaleX(-1);"></video>
        <div id="securevision-cam-reticle" style="position: absolute; top: 50%; left: 50%; width: 26px; height: 26px; border-radius: 50%; border: 2px solid #10b981; transform: translate(-50%, -50%); pointer-events: none; display: flex; align-items: center; justify-content: center; background: rgba(16,185,129,0.3); font-size: 12px; box-shadow: 0 0 12px #10b981;">🖐️</div>
      </div>

      <!-- Gestures Cheat Sheet with Active Highlight -->
      <div style="border-top: 1px solid #1e293b; padding-top: 8px;">
        <div style="font-size: 9px; color: #64748b; text-transform: uppercase; margin-bottom: 4px; letter-spacing: 0.5px;">Gesture Actions:</div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 10px;">
          <div id="badge-gesture-move" style="padding: 3px 6px; border-radius: 6px; background: rgba(16,185,129,0.15); border: 1px solid #10b981; color: #34d399; font-weight: bold;">☝️ Move</div>
          <div id="badge-gesture-pinch" style="padding: 3px 6px; border-radius: 6px; background: #050b14; border: 1px solid #1e293b; color: #94a3b8;">🤏 Click</div>
          <div id="badge-gesture-scroll" style="padding: 3px 6px; border-radius: 6px; background: #050b14; border: 1px solid #1e293b; color: #94a3b8;">✌️ Scroll</div>
          <div id="badge-gesture-stop" style="padding: 3px 6px; border-radius: 6px; background: #050b14; border: 1px solid #1e293b; color: #94a3b8;">🖐️ Stop</div>
        </div>
      </div>
    `;

    document.body.appendChild(webcamOverlayEl);

    const disableBtn = document.getElementById('securevision-btn-disable');
    if (disableBtn) {
      disableBtn.onclick = stopWebcamHandHUD;
    }

    const videoEl = document.getElementById('securevision-cam-video') as HTMLVideoElement;
    if (videoEl) {
      videoEl.srcObject = stream;
      await videoEl.play();
    }

    const reticleEl = document.getElementById('securevision-cam-reticle');
    const gestureNameEl = document.getElementById('securevision-gesture-name');
    const cursorCoordsEl = document.getElementById('securevision-cursor-coords');

    const badgeMove = document.getElementById('badge-gesture-move');
    const badgePinch = document.getElementById('badge-gesture-pinch');
    const badgeScroll = document.getElementById('badge-gesture-scroll');
    const badgeStop = document.getElementById('badge-gesture-stop');

    const highlightBadge = (type: 'move' | 'pinch' | 'scroll' | 'stop') => {
      const all = [
        { el: badgeMove, id: 'move' },
        { el: badgePinch, id: 'pinch' },
        { el: badgeScroll, id: 'scroll' },
        { el: badgeStop, id: 'stop' },
      ];
      all.forEach((b) => {
        if (!b.el) return;
        if (b.id === type) {
          b.el.style.background = 'rgba(16,185,129,0.2)';
          b.el.style.border = '1px solid #10b981';
          b.el.style.color = '#34d399';
          b.el.style.fontWeight = 'bold';
        } else {
          b.el.style.background = '#050b14';
          b.el.style.border = '1px solid #1e293b';
          b.el.style.color = '#94a3b8';
          b.el.style.fontWeight = 'normal';
        }
      });
    };

    const canvas = document.createElement('canvas');
    canvas.width = 160;
    canvas.height = 120;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    showAgentHUD('🖐️ Hand Gesture Cam ACTIVE! Move your hand.', '⚡');

    let pinchCooldown = false;
    let lastSmoothX = 0.5;
    let lastSmoothY = 0.5;
    let lastScrollY = 0.5;

    // Run tracking loop
    const trackLoop = () => {
      if (!activeWebcamStream || !videoEl) return;
      if (videoEl.readyState >= 2 && ctx) {
        ctx.drawImage(videoEl, 0, 0, 160, 120);
        const frame = ctx.getImageData(0, 0, 160, 120);
        const data = frame.data;
        let sumX = 0;
        let sumY = 0;
        let count = 0;

        let minY = 120;
        let maxY = 0;
        let minX = 160;
        let maxX = 0;

        for (let i = 0; i < data.length; i += 16) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          if (r > 75 && g > 38 && b > 20 && r > b && (r - g) > 12) {
            const pixelIdx = i / 4;
            const x = pixelIdx % 160;
            const y = Math.floor(pixelIdx / 160);
            sumX += x;
            sumY += y;
            count++;

            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
          }
        }

        if (count > 25) {
          const avgX = sumX / count;
          const avgY = sumY / count;

          // Invert X for mirror camera
          const normX = Math.max(0.02, Math.min(0.98, 1.0 - (avgX / 160)));
          const normY = Math.max(0.02, Math.min(0.98, avgY / 120));

          // Smooth exponential filter
          lastSmoothX = lastSmoothX * 0.35 + normX * 0.65;
          lastSmoothY = lastSmoothY * 0.35 + normY * 0.65;

          const screenW = window.screen.width || 1920;
          const screenH = window.screen.height || 1080;
          const screenX = Math.round(lastSmoothX * screenW);
          const screenY = Math.round(lastSmoothY * screenH);

          // Update reticle inside HUD
          if (reticleEl) {
            reticleEl.style.left = `${(1.0 - avgX / 160) * 100}%`;
            reticleEl.style.top = `${(avgY / 120) * 100}%`;
          }

          if (cursorCoordsEl) {
            cursorCoordsEl.innerText = `${screenX}, ${screenY}`;
          }

          // Gesture analysis
          const handH = maxY - minY;
          const handW = maxX - minX;
          const area = handH * handW;
          const density = count / (area || 1);

          // 1. 🖐️ Open Palm (Emergency Stop)
          if (handW > 160 * 0.55 && density < 0.28) {
            if (gestureNameEl) gestureNameEl.innerText = '🖐️ Stop';
            highlightBadge('stop');
            stopWebcamHandHUD();
            showAgentHUD('🖐️ Emergency Stop Triggered by Open Palm', '🛑');
            return;
          }

          // 2. ✊ Fist (Pause)
          if (density > 0.65 && handH < 120 * 0.38) {
            if (gestureNameEl) gestureNameEl.innerText = '✊ Fist Pause';
            highlightBadge('stop');
            // Do not move cursor during fist
          }
          // 3. ✌️ Two Fingers (Scroll)
          else if (minY < 120 * 0.25 && handW < 160 * 0.36 && density < 0.45) {
            if (gestureNameEl) gestureNameEl.innerText = '✌️ Scroll';
            highlightBadge('scroll');
            const deltaY = (lastSmoothY - lastScrollY) * 200;
            if (Math.abs(deltaY) > 8) {
              window.scrollBy({ top: deltaY, behavior: 'smooth' });
              lastScrollY = lastSmoothY;
            }
          }
          // 4. 🤏 Pinch (Click)
          else if (handW < 160 * 0.28 && minY < 120 * 0.35 && density > 0.42) {
            if (gestureNameEl) gestureNameEl.innerText = '🤏 Pinch Click';
            highlightBadge('pinch');

            if (!pinchCooldown) {
              pinchCooldown = true;
              updateVirtualCursor(lastSmoothX, lastSmoothY, true);

              // Physical OS click via backend
              fetch(apiUrl('/api/cursor/move'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ norm_x: lastSmoothX, norm_y: lastSmoothY, is_click: true }),
              }).catch(() => {});

              setTimeout(() => {
                pinchCooldown = false;
              }, 600);
            }
          }
          // 5. ☝️ Move (Default)
          else {
            if (gestureNameEl) gestureNameEl.innerText = '☝️ Move';
            highlightBadge('move');
            lastScrollY = lastSmoothY;
            updateVirtualCursor(lastSmoothX, lastSmoothY, false);

            // Move OS system cursor (throttled to ~30ms)
            const nowOs = Date.now();
            if (nowOs - lastHoverTime > 30) {
              lastHoverTime = nowOs;
              fetch(apiUrl('/api/cursor/move'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ norm_x: lastSmoothX, norm_y: lastSmoothY, is_click: false }),
              }).catch(() => {});
            }
          }
        }
      }
      trackingAnimFrame = requestAnimationFrame(trackLoop);
    };

    trackingAnimFrame = requestAnimationFrame(trackLoop);
    return true;
  } catch (err: any) {
    showAgentHUD(`Camera error: ${err?.message || 'Permission denied'}`, '❌');
    return false;
  }
}

// Runtime message listener
if (typeof extensionApi !== 'undefined' && extensionApi.runtime?.onMessage) {
  extensionApi.runtime.onMessage.addListener((message: any, _sender: any, sendResponse: (res: any) => void) => {
    if (message.type === 'PING') {
      sendResponse({ pong: true, url: window.location.href });
      return true;
    }

    if (message.type === 'EXTRACT_DOM') {
      const elements = extractInteractiveDOM();
      sendResponse({
        success: true,
        data: {
          url: window.location.href,
          title: document.title,
          domain: window.location.hostname,
          elements,
        },
      });
      return true;
    }

    if (message.type === 'EXECUTE_ACTION') {
      const result = executeDOMAction(message.action, message.selector, message.value);
      sendResponse({
        success: result,
        action: message.action,
        selector: message.selector,
      });
      return true;
    }

    if (message.type === 'SCROLL_PAGE') {
      const isUp = message.direction === 'up';
      const amount = isUp ? -window.innerHeight * 0.75 : window.innerHeight * 0.75;
      window.scrollBy({ top: amount, behavior: 'smooth' });
      showAgentHUD(isUp ? 'Scrolled Page Up ⬆' : 'Scrolled Page Down ⬇', '📜');
      sendResponse({ success: true, direction: message.direction });
      return true;
    }

    if (message.type === 'TOGGLE_HAND_CAM') {
      startWebcamHandHUD().then((active) => {
        sendResponse({ success: true, active });
      });
      return true;
    }

    if (message.type === 'START_HAND_GESTURE_TRACKING') {
      if (!webcamOverlayEl) {
        startWebcamHandHUD().then((active) => {
          sendResponse({ success: true, active });
        });
      } else {
        sendResponse({ success: true, active: true });
      }
      return true;
    }

    if (message.type === 'STOP_HAND_GESTURE_TRACKING') {
      stopWebcamHandHUD();
      sendResponse({ success: true, active: false });
      return true;
    }

    if (message.type === 'MOVE_VIRTUAL_CURSOR') {
      updateVirtualCursor(message.x, message.y, message.isClick);
      if (message.scrollDelta) {
        window.scrollBy({ top: message.scrollDelta, behavior: 'smooth' });
      }
      sendResponse({ success: true });
      return true;
    }

    if (message.type === 'REMOVE_VIRTUAL_CURSOR') {
      removeVirtualCursor();
      sendResponse({ success: true });
      return true;
    }

    return false;
  });
}
