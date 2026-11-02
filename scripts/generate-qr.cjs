const fs = require('fs');
const path = require('path');
const { toQR } = require('toqr');
const { PNG } = require('pngjs');

const EXPO_URL = 'exp://192.168.1.11:8081';
const ARTIFACT_DIR = 'C:\\Users\\gokul\\.gemini\\antigravity\\brain\\42d52ac2-773d-4b42-9ba0-614b1876cfaf';

// 1. Generate matrix
const matrix = toQR(EXPO_URL);
const matrixSide = Math.round(Math.sqrt(matrix.length));
console.log(`Generated QR matrix for "${EXPO_URL}": ${matrixSide}x${matrixSide}`);

// 2. Generate SVG
const quietZone = 4;
const totalModules = matrixSide + quietZone * 2;
let svgPaths = '';
for (let y = 0; y < matrixSide; y++) {
  for (let x = 0; x < matrixSide; x++) {
    if (matrix[y * matrixSide + x]) {
      const rx = x + quietZone;
      const ry = y + quietZone;
      svgPaths += `<rect x="${rx}" y="${ry}" width="1" height="1" fill="#000000"/>`;
    }
  }
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalModules} ${totalModules}" shape-rendering="crispEdges"><rect width="${totalModules}" height="${totalModules}" fill="#ffffff"/>${svgPaths}</svg>`;

// Write SVG to artifact directory as expo-go-qr.svg
const svgPath = path.join(ARTIFACT_DIR, 'expo-go-qr.svg');
fs.writeFileSync(svgPath, svg, 'utf8');
console.log(`Wrote SVG to ${svgPath}`);

// 3. Generate high-res PNG (e.g. 512x512 with quiet zone)
const scale = 14; // 33 * 14 = 462x462
const imageSize = totalModules * scale;
const png = new PNG({ width: imageSize, height: imageSize, colorType: 2 });

// Initialize to white
for (let y = 0; y < imageSize; y++) {
  for (let x = 0; x < imageSize; x++) {
    const idx = (imageSize * y + x) << 2;
    png.data[idx] = 255;     // R
    png.data[idx + 1] = 255; // G
    png.data[idx + 2] = 255; // B
    png.data[idx + 3] = 255; // A
  }
}

// Paint black modules
for (let my = 0; my < matrixSide; my++) {
  for (let mx = 0; mx < matrixSide; mx++) {
    if (matrix[my * matrixSide + mx]) {
      const startX = (mx + quietZone) * scale;
      const startY = (my + quietZone) * scale;
      for (let py = 0; py < scale; py++) {
        for (let px = 0; px < scale; px++) {
          const idx = (imageSize * (startY + py) + (startX + px)) << 2;
          png.data[idx] = 10;     // R
          png.data[idx + 1] = 10; // G
          png.data[idx + 2] = 15; // B
          png.data[idx + 3] = 255;
        }
      }
    }
  }
}

const pngPath = path.join(ARTIFACT_DIR, 'expo-go-qr.png');
const buffer = PNG.sync.write(png);
fs.writeFileSync(pngPath, buffer);
console.log(`Wrote PNG (${imageSize}x${imageSize}) to ${pngPath}`);

// Also copy to active workspace so it can be referenced anywhere
fs.writeFileSync(path.join(__dirname, '..', 'apps', 'mobile', 'assets', 'expo-go-qr.png'), buffer);

// 4. Update HTML viewer artifact
const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MOZHI - Expo Go QR Code</title>
  <script src="https://www.gstatic.com/antigravity/web/dev/tailwindcss.min.js"></script>
</head>
<body class="bg-transparent text-[var(--foreground)] antialiased p-4 flex items-center justify-center min-h-screen">
  <div class="bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-2xl max-w-md w-full p-6 text-center">
    <!-- Header -->
    <div class="flex items-center justify-center space-x-2 mb-3">
      <span class="inline-block w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
      <span class="text-xs font-bold uppercase tracking-wider text-emerald-400">Metro Bundler Active (LAN)</span>
    </div>
    <h1 class="text-2xl font-black tracking-tight text-[var(--foreground)] mb-1">MOZHI Social Platform</h1>
    <p class="text-sm text-[var(--muted-foreground)] mb-5">Scan with Expo Go to preview live on physical Android or iOS device</p>

    <!-- QR Code Container -->
    <div class="bg-white p-4 rounded-2xl border-2 border-[var(--border)] inline-block shadow-lg mb-5 mx-auto">
      ${svg.replace('<svg ', '<svg class="w-64 h-64 mx-auto" ')}
    </div>

    <!-- URL Box -->
    <div class="bg-[var(--sidebar)] border border-[var(--border)] rounded-xl p-3 mb-5 flex items-center justify-between text-left">
      <div class="truncate mr-2">
        <div class="text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider">Expo Go URL</div>
        <div class="text-sm font-mono font-bold text-[var(--primary)] truncate">${EXPO_URL}</div>
      </div>
      <button onclick="navigator.clipboard.writeText('${EXPO_URL}'); alert('Copied Expo Go URL: ${EXPO_URL}')" class="px-3.5 py-1.5 text-xs font-bold bg-[var(--primary)] text-white rounded-lg hover:opacity-90 transition shadow">
        Copy
      </button>
    </div>

    <!-- Quick Instructions -->
    <div class="grid grid-cols-2 gap-3 text-left text-xs mb-5">
      <div class="bg-[var(--background)] p-3 rounded-xl border border-[var(--border)]">
        <div class="font-bold text-[var(--foreground)] mb-1 flex items-center gap-1.5">
          <span>📱</span> Android
        </div>
        <p class="text-[var(--muted-foreground)] leading-relaxed text-[11px]">Open <b>Expo Go</b> app and tap <b>"Scan QR code"</b>.</p>
      </div>
      <div class="bg-[var(--background)] p-3 rounded-xl border border-[var(--border)]">
        <div class="font-bold text-[var(--foreground)] mb-1 flex items-center gap-1.5">
          <span>🍎</span> iPhone
        </div>
        <p class="text-[var(--muted-foreground)] leading-relaxed text-[11px]">Open native <b>Camera</b> and tap the yellow banner.</p>
      </div>
    </div>

    <!-- Web Link -->
    <div class="pt-4 border-t border-[var(--border)] flex items-center justify-between text-xs">
      <span class="text-[var(--muted-foreground)]">Web Preview:</span>
      <a href="http://localhost:8081" target="_blank" class="text-[var(--primary)] font-semibold hover:underline">
        Open in Browser (localhost:8081) &rarr;
      </a>
    </div>
  </div>
</body>
</html>`;

const viewerPath = path.join(ARTIFACT_DIR, 'expo-qr-viewer.html');
fs.writeFileSync(viewerPath, htmlContent, 'utf8');
console.log(`Wrote Viewer HTML to ${viewerPath}`);
