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

async function main() {
  const glyph = sharp(source).extract(crop);

  await glyph.clone().resize(1024, 1024).toFile(path.join(imagesDir, 'icon.png'));
  await glyph.clone().resize(1024, 1024).toFile(path.join(imagesDir, 'splash-icon.png'));
  await glyph.clone().resize(256, 256).toFile(path.join(imagesDir, 'favicon.png'));
  await glyph.clone().resize(1024, 1024).toFile(path.join(imagesDir, 'android-icon-foreground.png'));

  console.log('Generated icon.png, splash-icon.png, favicon.png, android-icon-foreground.png');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
