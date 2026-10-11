/**
 * Privacy-Preserving Vision Agent - Client-Side Canvas Redaction Engine
 * Redacts detected sensitive regions (PII & Faces) directly on the client canvas before transmission.
 * Supports Blackout Masking, Gaussian Blur, Pixelation, and Semantic Token Badging.
 */

class RedactionEngine {
  constructor() {
    this.colorMap = {
      email: { bg: '#8b5cf6', text: '#ffffff', label: 'EMAIL' },
      phone: { bg: '#f59e0b', text: '#ffffff', label: 'PHONE' },
      creditCard: { bg: '#ef4444', text: '#ffffff', label: 'CARD' },
      ssn: { bg: '#dc2626', text: '#ffffff', label: 'SSN' },
      password: { bg: '#1f2937', text: '#10b981', label: 'PWD' },
      name: { bg: '#3b82f6', text: '#ffffff', label: 'NAME' },
      address: { bg: '#06b6d4', text: '#ffffff', label: 'ADDRESS' },
      face: { bg: '#ec4899', text: '#ffffff', label: 'FACE' },
      apiKey: { bg: '#e11d48', text: '#ffffff', label: 'SECRET' },
      other: { bg: '#475569', text: '#ffffff', label: 'REDACTED' }
    };
  }

  /**
   * Apply redaction over an image or canvas based on detected entities
   * @param {HTMLCanvasElement|HTMLImageElement} sourceImage - Raw image or canvas
   * @param {Array<Object>} entities - List of PII and face entities with bounding boxes
   * @param {string} mode - Redaction mode ('semantic', 'blackout', 'blur', 'pixelate')
   * @returns {Object} { sanitizedCanvas, dataUrl, telemetry }
   */
  redact(sourceImage, entities = [], mode = 'semantic') {
    const canvas = document.createElement('canvas');
    const width = sourceImage.naturalWidth || sourceImage.videoWidth || sourceImage.width || 1280;
    const height = sourceImage.naturalHeight || sourceImage.videoHeight || sourceImage.height || 800;

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // 1. Draw original raw image onto local canvas
    ctx.drawImage(sourceImage, 0, 0, width, height);

    let totalRedactedPixels = 0;
    const categoryCounts = {};

    // 2. Iterate through all detected entities and redact bounding boxes
    entities.forEach((entity) => {
      const box = entity.boundingBox;
      if (!box || box.width <= 0 || box.height <= 0) return;

      // Add a slight safety margin padding
      const padX = 3;
      const padY = 2;
      const x = Math.max(0, box.x - padX);
      const y = Math.max(0, box.y - padY);
      const w = Math.min(width - x, box.width + padX * 2);
      const h = Math.min(height - y, box.height + padY * 2);

      totalRedactedPixels += (w * h);
      const cat = entity.category || 'other';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;

      // Apply chosen redaction technique
      switch (mode) {
        case 'blur':
          this.applyBlur(ctx, x, y, w, h);
          break;
        case 'pixelate':
          this.applyPixelate(ctx, x, y, w, h);
          break;
        case 'blackout':
          this.applyBlackout(ctx, x, y, w, h, entity);
          break;
        case 'semantic':
        default:
          this.applySemanticBadge(ctx, x, y, w, h, entity);
          break;
      }
    });

    const totalCanvasPixels = width * height;
    const redactedAreaPercentage = totalCanvasPixels > 0 
      ? Math.min(100, (totalRedactedPixels / totalCanvasPixels) * 100).toFixed(2) 
      : 0;

    return {
      sanitizedCanvas: canvas,
      dataUrl: canvas.toDataURL('image/jpeg', 0.88),
      telemetry: {
        totalEntitiesRedacted: entities.length,
        categoryCounts,
        redactedAreaPercentage: Number(redactedAreaPercentage),
        mode,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Redaction Mode: Solid Blackout with Border and Subtle Privacy Label
   */
  applyBlackout(ctx, x, y, w, h, entity) {
    ctx.save();
    // Solid fill
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(x, y, w, h);

    // Subtle outline
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);

    // Centered label if large enough
    if (w >= 36 && h >= 14) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = `bold ${Math.max(9, Math.min(12, Math.floor(h * 0.55)))}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('██████', x + w / 2, y + h / 2);
    }
    ctx.restore();
  }

  /**
   * Redaction Mode: Pixelation / Mosaic
   */
  applyPixelate(ctx, x, y, w, h) {
    ctx.save();
    const blockSize = Math.max(6, Math.min(16, Math.floor(Math.min(w, h) / 3)));
    
    // Read pixels from area
    const imgData = ctx.getImageData(x, y, w, h);
    const data = imgData.data;

    for (let py = 0; py < h; py += blockSize) {
      for (let px = 0; px < w; px += blockSize) {
        // Sample average color in block
        let r = 0, g = 0, b = 0, count = 0;
        for (let subY = 0; subY < blockSize && (py + subY) < h; subY++) {
          for (let subX = 0; subX < blockSize && (px + subX) < w; subX++) {
            const idx = ((py + subY) * w + (px + subX)) * 4;
            r += data[idx];
            g += data[idx + 1];
            b += data[idx + 2];
            count++;
          }
        }
        r = Math.floor(r / count);
        g = Math.floor(g / count);
        b = Math.floor(b / count);

        // Fill block with average color
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(x + px, y + py, Math.min(blockSize, w - px), Math.min(blockSize, h - py));
      }
    }
    ctx.restore();
  }

  /**
   * Redaction Mode: Gaussian Blur Filter
   */
  applyBlur(ctx, x, y, w, h) {
    ctx.save();
    // Draw blurred sub-region
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = w;
    tempCanvas.height = h;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(ctx.canvas, x, y, w, h, 0, 0, w, h);

    ctx.filter = 'blur(10px)';
    ctx.drawImage(tempCanvas, 0, 0, w, h, x, y, w, h);
    ctx.filter = 'none';

    // Outline
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);
    ctx.restore();
  }

  /**
   * Redaction Mode: Semantic Obfuscation Badge
   * Displays [PERSON_NAME], [EMAIL], [CARD] so server AI understands semantic context without raw data.
   */
  applySemanticBadge(ctx, x, y, w, h, entity) {
    ctx.save();
    const cat = entity.category || 'other';
    const config = this.colorMap[cat] || this.colorMap.other;
    const token = entity.sanitizedToken || `[${config.label}]`;

    // 1. Draw sleek pill/rounded rect background
    const radius = Math.min(6, Math.floor(h / 4));
    ctx.fillStyle = config.bg;
    ctx.beginPath();
    this.roundRect(ctx, x, y, w, h, radius);
    ctx.fill();

    // 2. Add subtle gloss border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 3. Draw text badge
    ctx.fillStyle = config.text;
    const fontSize = Math.max(9, Math.min(13, Math.floor(h * 0.65)));
    ctx.font = `600 ${fontSize}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // If box is narrow, show short label
    const displayText = (ctx.measureText(token).width > w - 6) ? `[${config.label}]` : token;
    ctx.fillText(displayText, x + w / 2, y + h / 2, Math.max(10, w - 4));

    ctx.restore();
  }

  /**
   * Helper to draw rounded rectangle on canvas
   */
  roundRect(ctx, x, y, w, h, r) {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
}

// Export for extension and browser environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { RedactionEngine };
}
if (typeof window !== 'undefined') {
  window.RedactionEngine = RedactionEngine;
}
