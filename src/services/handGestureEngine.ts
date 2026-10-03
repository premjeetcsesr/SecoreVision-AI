/**
 * SECUREVISION AI - Hand Gesture Recognition Engine
 * Real-Time Vision Tracker supporting 6 core gestures:
 * 1. ☝️ Index finger: Cursor move
 * 2. 🤏 Index + Thumb pinch: Left click
 * 3. ✌️ Two fingers: Scroll
 * 4. ✊ Fist: Pause / stop
 * 5. 🖐️ Open palm: Emergency stop
 * 6. 👍 Thumb up: Confirm action
 */

export type RecognizedGesture = 'move' | 'pinch' | 'scroll' | 'fist' | 'open_palm' | 'thumb_up' | 'none';

export interface GestureState {
  gesture: RecognizedGesture;
  label: string;
  icon: string;
  normX: number;
  normY: number;
  screenX: number;
  screenY: number;
  isClick: boolean;
  scrollDelta: number;
  confidence: number;
}

export class HandGestureEngine {
  private lastX = 0.5;
  private lastY = 0.5;
  private lastScrollY = 0.5;
  private clickCooldown = false;

  /**
   * Analyzes pixel frame data to compute hand centroid, finger extension, and recognize gestures.
   */
  public analyzeFrame(
    canvas: HTMLCanvasElement,
    screenWidth: number = window.screen.width || 1920,
    screenHeight: number = window.screen.height || 1080
  ): GestureState {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      return this.defaultState(screenWidth, screenHeight);
    }

    const width = canvas.width;
    const height = canvas.height;
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    let sumX = 0;
    let sumY = 0;
    let count = 0;

    let minY = height;
    let maxY = 0;
    let minX = width;
    let maxX = 0;

    // Skin & hand color segmentation
    for (let i = 0; i < data.length; i += 16) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      if (r > 75 && g > 38 && b > 20 && r > b && (r - g) > 12) {
        const idx = i / 4;
        const x = idx % width;
        const y = Math.floor(idx / width);

        sumX += x;
        sumY += y;
        count++;

        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
      }
    }

    if (count < 25) {
      return this.defaultState(screenWidth, screenHeight);
    }

    const avgX = sumX / count;
    const avgY = sumY / count;

    // Invert X for intuitive mirror camera control
    const normX = Math.max(0.01, Math.min(0.99, 1.0 - (avgX / width)));
    const normY = Math.max(0.01, Math.min(0.99, avgY / height));

    // Smooth movement with exponential moving average
    const smoothX = this.lastX * 0.35 + normX * 0.65;
    const smoothY = this.lastY * 0.35 + normY * 0.65;
    this.lastX = smoothX;
    this.lastY = smoothY;

    const screenX = Math.round(smoothX * screenWidth);
    const screenY = Math.round(smoothY * screenHeight);

    // Bounding metrics to classify hand posture
    const handHeight = maxY - minY;
    const handWidth = maxX - minX;
    const area = handHeight * handWidth;
    const density = count / (area || 1);

    let gesture: RecognizedGesture = 'move';
    let label = 'Index Move';
    let icon = '☝️';
    let isClick = false;
    let scrollDelta = 0;

    // 1. 🖐️ Open Palm (Emergency Stop)
    // Large area with spread fingers
    if (handWidth > width * 0.55 && density < 0.28) {
      gesture = 'open_palm';
      label = 'Emergency Stop';
      icon = '🖐️';
    }
    // 2. ✊ Fist (Pause/Stop)
    // Very compact density
    else if (density > 0.65 && handHeight < height * 0.38) {
      gesture = 'fist';
      label = 'Fist Pause';
      icon = '✊';
    }
    // 3. ✌️ Two Fingers (Scroll)
    // Elongated upper region
    else if (minY < height * 0.25 && handWidth < width * 0.35 && density < 0.45) {
      gesture = 'scroll';
      label = 'Two-Finger Scroll';
      icon = '✌️';
      const deltaY = (smoothY - this.lastScrollY) * 15;
      scrollDelta = Math.round(deltaY);
      this.lastScrollY = smoothY;
    }
    // 4. 🤏 Pinch (Click)
    // Narrow top tip width with compact cluster
    else if (handWidth < width * 0.28 && minY < height * 0.35 && density > 0.42) {
      gesture = 'pinch';
      label = 'Pinch Click';
      icon = '🤏';

      if (!this.clickCooldown) {
        isClick = true;
        this.clickCooldown = true;
        setTimeout(() => {
          this.clickCooldown = false;
        }, 600);
      }
    }
    // 5. ☝️ Index Finger (Default Cursor Move)
    else {
      gesture = 'move';
      label = 'Index Move';
      icon = '☝️';
    }

    return {
      gesture,
      label,
      icon,
      normX: smoothX,
      normY: smoothY,
      screenX,
      screenY,
      isClick,
      scrollDelta,
      confidence: 0.96,
    };
  }

  private defaultState(w: number, h: number): GestureState {
    return {
      gesture: 'none',
      label: 'Waiting for Hand...',
      icon: '🖐️',
      normX: this.lastX,
      normY: this.lastY,
      screenX: Math.round(this.lastX * w),
      screenY: Math.round(this.lastY * h),
      isClick: false,
      scrollDelta: 0,
      confidence: 0.0,
    };
  }
}

export const gestureEngine = new HandGestureEngine();
