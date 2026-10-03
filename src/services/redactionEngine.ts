/**
 * SECUREVISION AI - Client-Side Redaction Engine
 * Generates mathematically irreversible opaque blackout masks directly on an HTML5 Canvas.
 * NEVER blur or pixelate sensitive text; opaque solid black rectangles prevent de-blurring or reconstruction attacks.
 */

import { BoundingBox } from './piiDetector';

export interface RedactionTarget {
  boundingBox: BoundingBox;
  label?: string;
  category?: string;
}

/**
 * Apply opaque blackout rectangles over an image given an array of bounding boxes.
 * Returns a new sanitized base64 data URL.
 */
export async function applyOpaqueRedaction(
  imageSource: string | HTMLCanvasElement | HTMLImageElement,
  targets: RedactionTarget[],
  options: {
    padding?: number;
    showLabel?: boolean;
    fillColor?: string;
    strokeColor?: string;
  } = {}
): Promise<string> {
  const padding = options.padding ?? 6;
  const showLabel = options.showLabel ?? true;
  const fillColor = options.fillColor ?? '#050b14'; // Solid opaque obsidian
  const strokeColor = options.strokeColor ?? '#10b981'; // Cyber emerald border

  return new Promise((resolve, reject) => {
    const processCanvas = (img: HTMLImageElement | HTMLCanvasElement) => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width || 1280;
        canvas.height = img.height || 720;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Failed to create canvas 2D rendering context'));
          return;
        }

        // 1. Draw the base frame
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // 2. Apply irreversible opaque blackout rectangles over all sensitive targets
        targets.forEach((target) => {
          const { x, y, width, height } = target.boundingBox;
          if (width <= 0 || height <= 0) return;

          const padX = Math.max(0, x - padding);
          const padY = Math.max(0, y - padding);
          const padW = width + padding * 2;
          const padH = height + padding * 2;

          // Solid Blackout Box
          ctx.save();
          ctx.fillStyle = fillColor;
          ctx.fillRect(padX, padY, padW, padH);

          // Subtle Emerald Security Stroke
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = strokeColor;
          ctx.strokeRect(padX, padY, padW, padH);

          // Redaction Badge
          if (showLabel && padW > 40 && padH > 14) {
            ctx.fillStyle = strokeColor;
            ctx.font = 'bold 9px monospace';
            ctx.textBaseline = 'middle';
            const badgeText = target.category ? `[REDACTED ${target.category.toUpperCase()}]` : '[REDACTED PII]';
            ctx.fillText(badgeText, padX + 4, padY + Math.min(padH / 2, 10));
          }
          ctx.restore();
        });

        resolve(canvas.toDataURL('image/jpeg', 0.85));
      } catch (err) {
        reject(err);
      }
    };

    if (typeof imageSource === 'string') {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => processCanvas(img);
      img.onerror = (e) => reject(new Error('Failed to load image source for redaction: ' + e));
      img.src = imageSource;
    } else {
      processCanvas(imageSource);
    }
  });
}

/**
 * Text-level string redaction with solid block characters
 */
export function redactTextOpaque(text: string, matches: string[]): string {
  let sanitized = text;
  matches.forEach((m) => {
    if (!m) return;
    const blockMask = '█'.repeat(Math.max(6, m.length));
    sanitized = sanitized.split(m).join(blockMask);
  });
  return sanitized;
}
