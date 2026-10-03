/**
 * In-Page Floating Gesture Control Widget
 * Opens directly inside the current active webpage without opening any new tab or separate page.
 */

import { apiUrl } from '../shared/api';

let activeStream: MediaStream | null = null;
let animFrame: number | null = null;
let overlayEl: HTMLElement | null = null;
let lastHoverTime = 0;
let pinchCooldown = false;
let lastSmoothX = 0.5;
let lastSmoothY = 0.5;
let lastScrollY = 0.5;

export function stopInPageGestureHUD() {
  if (animFrame) {
    cancelAnimationFrame(animFrame);
    animFrame = null;
  }
  if (activeStream) {
    activeStream.getTracks().forEach((track) => track.stop());
    activeStream = null;
  }
  if (overlayEl) {
    overlayEl.remove();
    overlayEl = null;
  }
}

export async function startInPageGestureHUD(): Promise<boolean> {
  if (overlayEl) {
    stopInPageGestureHUD();
    return false;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 320 }, height: { ideal: 240 } },
    });
    activeStream = stream;

    // Create the exact user-requested in-page floating HUD
    overlayEl = document.createElement('div');
    overlayEl.id = 'sv-gesture-inpage-hud';
    overlayEl.style.position = 'fixed';
    overlayEl.style.bottom = '20px';
    overlayEl.style.left = '20px';
    overlayEl.style.zIndex = '2147483647';
    overlayEl.style.width = '290px';
    overlayEl.style.background = '#090d16';
    overlayEl.style.border = '2px solid #10b981';
    overlayEl.style.borderRadius = '16px';
    overlayEl.style.padding = '14px';
    overlayEl.style.boxShadow = '0 16px 40px rgba(0,0,0,0.9), 0 0 30px rgba(16,185,129,0.35)';
    overlayEl.style.fontFamily = 'monospace, system-ui, -apple-system, sans-serif';
    overlayEl.style.color = '#ffffff';
    overlayEl.style.userSelect = 'none';

    overlayEl.innerHTML = `
      <!-- Header -->
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; border-bottom: 1px solid #1e293b; padding-bottom: 6px;">
        <div style="display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 800; color: #ffffff;">
          <span>🖐️</span>
          <span>Gesture Control</span>
        </div>
        <div style="display: flex; align-items: center; gap: 4px; font-size: 11px;">
          <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #10b981; box-shadow: 0 0 8px #10b981;"></span>
          <span style="color: #10b981; font-weight: bold;">● Active</span>
        </div>
      </div>

      <!-- Real-time HUD Status & Coordinates -->
      <div style="background: #050b14; padding: 8px 10px; border-radius: 10px; border: 1px solid #1e293b; font-size: 11px; margin-bottom: 10px; line-height: 1.6;">
        <div style="display: flex; justify-content: space-between;">
          <span style="color: #94a3b8;">Status:</span>
          <span style="color: #10b981; font-weight: bold;">● Active</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="color: #94a3b8;">Gesture:</span>
          <span id="sv-hud-gesture-name" style="color: #38bdf8; font-weight: bold;">☝️ Move</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="color: #94a3b8;">Cursor:</span>
          <span id="sv-hud-cursor-coords" style="color: #f8fafc; font-weight: bold;">1250, 620</span>
        </div>
      </div>

      <!-- Enable / Disable Buttons -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 10px;">
        <button id="sv-btn-enabled-state" style="background: #064e3b; border: 1px solid #059669; color: #6ee7b7; padding: 6px; border-radius: 8px; font-size: 11px; font-weight: bold; cursor: default;">[ Enable ]</button>
        <button id="sv-hud-disable-btn" style="background: rgba(239,68,68,0.2); border: 1px solid rgba(239,68,68,0.6); color: #fca5a5; padding: 6px; border-radius: 8px; font-size: 11px; font-weight: bold; cursor: pointer;">[ Disable ]</button>
      </div>

      <!-- Video Feed Viewfinder -->
      <div style="position: relative; width: 100%; height: 120px; background: #000; border-radius: 10px; overflow: hidden; border: 1px solid #1e293b; margin-bottom: 10px;">
        <video id="sv-hud-video" autoplay playsinline muted style="width: 100%; height: 100%; object-fit: cover; transform: scaleX(-1);"></video>
        <div id="sv-hud-reticle" style="position: absolute; top: 50%; left: 50%; width: 26px; height: 26px; border-radius: 50%; border: 2px solid #10b981; transform: translate(-50%, -50%); pointer-events: none; display: flex; align-items: center; justify-content: center; background: rgba(16,185,129,0.3); font-size: 12px; box-shadow: 0 0 12px #10b981;">🖐️</div>
      </div>

      <!-- Gestures Cheat Sheet with Active Highlight -->
      <div style="border-top: 1px solid #1e293b; padding-top: 8px;">
        <div style="font-size: 9px; color: #64748b; text-transform: uppercase; margin-bottom: 4px; letter-spacing: 0.5px;">Gesture Actions:</div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 10px;">
          <div id="sv-badge-move" style="padding: 3px 6px; border-radius: 6px; background: rgba(16,185,129,0.15); border: 1px solid #10b981; color: #34d399; font-weight: bold;">☝️ Move</div>
          <div id="sv-badge-pinch" style="padding: 3px 6px; border-radius: 6px; background: #050b14; border: 1px solid #1e293b; color: #94a3b8;">🤏 Click</div>
          <div id="sv-badge-scroll" style="padding: 3px 6px; border-radius: 6px; background: #050b14; border: 1px solid #1e293b; color: #94a3b8;">✌️ Scroll</div>
          <div id="sv-badge-stop" style="padding: 3px 6px; border-radius: 6px; background: #050b14; border: 1px solid #1e293b; color: #94a3b8;">🖐️ Stop</div>
        </div>
      </div>
    `;

    document.body.appendChild(overlayEl);

    const disableBtn = document.getElementById('sv-hud-disable-btn');
    if (disableBtn) {
      disableBtn.onclick = stopInPageGestureHUD;
    }

    const videoEl = document.getElementById('sv-hud-video') as HTMLVideoElement;
    if (videoEl) {
      videoEl.srcObject = stream;
      await videoEl.play();
    }

    const reticleEl = document.getElementById('sv-hud-reticle');
    const gestureNameEl = document.getElementById('sv-hud-gesture-name');
    const cursorCoordsEl = document.getElementById('sv-hud-cursor-coords');

    const badgeMove = document.getElementById('sv-badge-move');
    const badgePinch = document.getElementById('sv-badge-pinch');
    const badgeScroll = document.getElementById('sv-badge-scroll');
    const badgeStop = document.getElementById('sv-badge-stop');

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

    // Tracking loop
    const trackLoop = () => {
      if (!activeStream || !videoEl) return;
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
            stopInPageGestureHUD();
            return;
          }

          // 2. ✊ Fist (Pause)
          if (density > 0.65 && handH < 120 * 0.38) {
            if (gestureNameEl) gestureNameEl.innerText = '✊ Fist Pause';
            highlightBadge('stop');
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
          // 4. 🤏 Pinch (Left click)
          else if (handW < 160 * 0.28 && minY < 120 * 0.35 && density > 0.42) {
            if (gestureNameEl) gestureNameEl.innerText = '🤏 Pinch Click';
            highlightBadge('pinch');

            if (!pinchCooldown) {
              pinchCooldown = true;

              // Physical OS click via backend (pyautogui)
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
      animFrame = requestAnimationFrame(trackLoop);
    };

    animFrame = requestAnimationFrame(trackLoop);
    return true;
  } catch (err: any) {
    alert(`Webcam access error: ${err?.message || 'Permission denied'}`);
    return false;
  }
}
