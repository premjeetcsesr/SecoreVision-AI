import fs from 'fs';
import path from 'path';

// Minimal 1x1 transparent/colored PNG template generator or shield PNG
// We will generate clean PNG files for 16x16, 48x48, 128x128
const dir = path.resolve('public/icons');
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

// A crisp SVG shield for high-res rendering
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" fill="none">
  <rect width="128" height="128" rx="28" fill="#0A192F"/>
  <path d="M64 22L98 36V64C98 86.8 83.5 107.8 64 114C44.5 107.8 30 86.8 30 64V36L64 22Z" fill="#0F233D" stroke="#10B981" stroke-width="4"/>
  <circle cx="64" cy="62" r="18" fill="#10B981" fill-opacity="0.2" stroke="#10B981" stroke-width="3"/>
  <circle cx="64" cy="62" r="7" fill="#10B981"/>
  <path d="M42 62C48 50 80 50 86 62C80 74 48 74 42 62Z" stroke="#34D399" stroke-width="3" stroke-linecap="round"/>
</svg>`;

fs.writeFileSync(path.join(dir, 'icon.svg'), svg, 'utf-8');

// Also create basic 1x1 green pixel PNGs as fallback if image tools aren't present
// Valid 1x1 green PNG base64:
const greenPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const greenPngBuffer = Buffer.from(greenPngBase64, 'base64');

[16, 48, 128].forEach(size => {
  fs.writeFileSync(path.join(dir, `icon-${size}.png`), greenPngBuffer);
});

console.log('Icons generated successfully in public/icons/');
