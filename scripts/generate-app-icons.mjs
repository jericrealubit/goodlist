// One-off script: crop the icon-only glyph out of the repo-root logo.png
// (which also contains the "Goodlist" wordmark below it) and produce the
// app icon / splash / favicon assets referenced from app.json.
//
// Run with: node scripts/generate-app-icons.mjs
import sharp from 'sharp';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const source = path.join(rootDir, 'logo.png');
const imagesDir = path.join(rootDir, 'assets', 'images');

// Bounding box of the icon glyph within logo.png (1920x1920), measured by
// scanning alpha channel: glyph rows 299-1185, cols 520-1395. Square crop
// centered on that box with a small margin.
const crop = { left: 487, top: 272, width: 940, height: 940 };

// Brand navy — matches the icon's own background so flattening is invisible
// against the glyph itself.
const BRAND_NAVY = '#072655';

async function main() {
  const glyph = sharp(source).extract(crop);

  // icon.png is the App Store/general app icon: Apple rejects icons with an
  // alpha channel, and the OS applies its own corner rounding, so this must
  // be a fully opaque, edge-to-edge square (flatten removes the transparent
  // corners left by the crop instead of just resizing them in place).
  await glyph.clone().flatten({ background: BRAND_NAVY }).resize(1024, 1024).toFile(path.join(imagesDir, 'icon.png'));
  // splash-icon.png, favicon.png, and the Android adaptive-icon foreground
  // keep their transparency — none of those have an "opaque square" rule,
  // and Android composites the foreground over its own background layer.
  await glyph.clone().resize(1024, 1024).toFile(path.join(imagesDir, 'splash-icon.png'));
  await glyph.clone().resize(256, 256).toFile(path.join(imagesDir, 'favicon.png'));
  await glyph.clone().resize(1024, 1024).toFile(path.join(imagesDir, 'android-icon-foreground.png'));

  console.log('Generated icon.png, splash-icon.png, favicon.png, android-icon-foreground.png');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
