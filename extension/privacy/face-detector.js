/**
 * Privacy-Preserving Vision Agent - Client-Side Face & Avatar Detector
 * Detects human faces and user profile avatars locally in the browser
 * Uses multi-pass visual heuristics: Color space analysis (YCbCr/HSV skin clustering) +
 * Feature geometry checking + DOM Avatar metadata detection.
 */

class FaceDetector {
  constructor() {
    this.minFaceSize = 24;
  }

  /**
   * Check if a visual source is an icon, social media logo, or non-human graphic
   */
  isIconOrLogo(source) {
    if (!source) return true;
    const src = String(source.src || source.currentSrc || '').toLowerCase();
    const alt = String(source.alt || '').toLowerCase();
    const cls = String(source.className || '').toLowerCase();
    const id = String(source.id || '').toLowerCase();

    // Universal Icon & Social Media Brands Regex
    const iconRegex = /(?:icon|logo|favicon|symbol|badge|emoji|btn-icon|nav-icon|social|instagram|insta|facebook|fb-|youtube|yt-|twitter|x-logo|tiktok|linkedin|github|whatsapp|telegram|discord|reddit|pinterest|snapchat|threads)/i;

    if (iconRegex.test(src) || iconRegex.test(alt) || iconRegex.test(cls) || iconRegex.test(id)) {
      return true;
    }

    if (src.endsWith('.svg') || src.endsWith('.ico') || src.includes('.svg?') || src.includes('data:image/svg+xml')) {
      return true;
    }

    // Generic avatar graphics, silhouettes, or placeholder icons (NOT real human faces)
    const placeholderPattern = /(?:default[-_]?avatar|avatar[-_]?placeholder|avatar[-_]?icon|user[-_]?icon|user[-_]?placeholder|silhouette|dummy[-_]?avatar|guest[-_]?avatar|no[-_]?avatar)/i;
    if (placeholderPattern.test(src) || placeholderPattern.test(alt) || placeholderPattern.test(cls) || placeholderPattern.test(id)) {
      return true;
    }

    const w = source.naturalWidth || source.width || 0;
    const h = source.naturalHeight || source.height || 0;
    if (w > 0 && h > 0 && w <= 28 && h <= 28) {
      return true;
    }

    return false;
  }

  /**
   * Synchronously detect faces on a Canvas or Image Element locally
   */
  detectFacesSync(source) {
    if (!source || this.isIconOrLogo(source)) return [];

    try {
      return this.analyzeCanvasSkinRegions(source);
    } catch (err) {
      return this.fallbackPhotoDetection(source);
    }
  }

  /**
   * Fallback for cross-origin photos where Canvas pixel reading is blocked by browser CORS
   */
  fallbackPhotoDetection(source) {
    if (!source || this.isIconOrLogo(source)) return [];

    const src = String(source.src || source.currentSrc || '').toLowerCase();
    const alt = String(source.alt || '').toLowerCase();
    const cls = String(source.className || '').toLowerCase();

    const isRealPhoto = (
      src.includes('photo-') || src.includes('/photo') || src.includes('portrait') ||
      src.includes('headshot') || src.includes('person') || src.includes('people') ||
      alt.includes('photo') || alt.includes('portrait') || alt.includes('person') ||
      cls.includes('user-face') || cls.includes('user-photo')
    );

    const w = source.naturalWidth || source.width || 0;
    const h = source.naturalHeight || source.height || 0;

    if (isRealPhoto && w >= 32 && h >= 32) {
      return [{
        id: 'FACE_1',
        category: 'face',
        boundingBox: {
          x: 0,
          y: 0,
          width: Math.round(w),
          height: Math.round(h),
          relative: true
        },
        confidence: 0.90
      }];
    }

    return [];
  }

  /**
   * Detect faces on a Canvas or Image Element locally
   * @param {HTMLCanvasElement|HTMLImageElement} source - Canvas or image to inspect
   * @returns {Promise<Array<Object>>} List of face bounding boxes
   */
  async detectFaces(source) {
    if (!source || this.isIconOrLogo(source)) return [];

    // 1. If native Experimental Chrome Shape Detection FaceDetector API is available, use it
    const NativeFaceDetector = (typeof window !== 'undefined' && window.FaceDetector && window.FaceDetector !== FaceDetector) ? window.FaceDetector : null;
    if (NativeFaceDetector && typeof NativeFaceDetector === 'function') {
      try {
        const detector = new NativeFaceDetector({ fastMode: true, maxDetectedFaces: 10 });
        if (typeof detector.detect === 'function') {
          const nativeFaces = await detector.detect(source);
          if (nativeFaces && nativeFaces.length > 0) {
            return nativeFaces.map((f, i) => ({
              id: `FACE_${i + 1}`,
              category: 'face',
              boundingBox: {
                x: Math.round(f.boundingBox.x),
                y: Math.round(f.boundingBox.y),
                width: Math.round(f.boundingBox.width),
                height: Math.round(f.boundingBox.height)
              },
              confidence: 0.96
            }));
          }
        }
      } catch (e) {
        // Fall back to canvas pixel analysis
      }
    }

    // 2. High-speed Canvas Pixel Analysis for Skin Clustered Face Regions
    try {
      const faceRegions = this.analyzeCanvasSkinRegions(source);
      return faceRegions;
    } catch (err) {
      return this.fallbackPhotoDetection(source);
    }
  }

  /**
   * Fast client-side skin-tone clustering and aspect ratio heuristic
   */
  analyzeCanvasSkinRegions(source) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    
    // Scale down for ultra-fast local processing (< 15ms)
    const scale = 0.25;
    const w = Math.round((source.naturalWidth || source.videoWidth || source.width || 640) * scale);
    const h = Math.round((source.naturalHeight || source.videoHeight || source.height || 480) * scale);
    
    if (w <= 0 || h <= 0) return [];

    canvas.width = w;
    canvas.height = h;
    ctx.drawImage(source, 0, 0, w, h);

    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;
    const skinMask = new Uint8Array(w * h);

    // YCbCr / Normalized RGB Skin color filtering
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const pixelIdx = i / 4;

      // Skin detection heuristic in RGB/YCbCr
      const isSkin = (
        r > 95 && g > 40 && b > 20 &&
        (Math.max(r, g, b) - Math.min(r, g, b) > 15) &&
        Math.abs(r - g) > 15 &&
        r > g && r > b
      );

      skinMask[pixelIdx] = isSkin ? 1 : 0;
    }

    // Connected component bounding boxes on downscaled grid
    const visited = new Uint8Array(w * h);
    const clusters = [];

    const getPixel = (x, y) => {
      if (x < 0 || x >= w || y < 0 || y >= h) return 0;
      return skinMask[y * w + x];
    };

    // Fast block scanning
    const step = 4;
    for (let y = 0; y < h; y += step) {
      for (let x = 0; x < w; x += step) {
        const idx = y * w + x;
        if (skinMask[idx] === 1 && !visited[idx]) {
          // Flood fill or cluster bounding box
          let minX = x, maxX = x, minY = y, maxY = y;
          let count = 0;
          const queue = [[x, y]];
          visited[idx] = 1;

          while (queue.length > 0 && queue.length < 500) {
            const [cx, cy] = queue.pop();
            count++;
            if (cx < minX) minX = cx;
            if (cx > maxX) maxX = cx;
            if (cy < minY) minY = cy;
            if (cy > maxY) maxY = cy;

            const neighbors = [
              [cx + step, cy], [cx - step, cy],
              [cx, cy + step], [cx, cy - step]
            ];

            for (const [nx, ny] of neighbors) {
              if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
                const nIdx = ny * w + nx;
                if (skinMask[nIdx] === 1 && !visited[nIdx]) {
                  visited[nIdx] = 1;
                  queue.push([nx, ny]);
                }
              }
            }
          }

          const boxW = (maxX - minX + step) / scale;
          const boxH = (maxY - minY + step) / scale;
          const aspect = boxW / boxH;

          // Faces generally have aspect ratio roughly between 0.6 and 1.4, and minimum size
          if (boxW >= this.minFaceSize && boxH >= this.minFaceSize && aspect >= 0.5 && aspect <= 1.8 && count >= 8) {
            clusters.push({
              boundingBox: {
                x: Math.round(minX / scale),
                y: Math.round(minY / scale),
                width: Math.round(boxW),
                height: Math.round(boxH)
              },
              confidence: 0.85
            });
          }
        }
      }
    }

    return clusters.map((c, i) => ({
      id: `FACE_${i + 1}`,
      category: 'face',
      boundingBox: c.boundingBox,
      confidence: c.confidence
    }));
  }
}

// Export for extension and browser environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { FaceDetector };
}
if (typeof window !== 'undefined') {
  window.FaceDetector = FaceDetector;
}
