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

// Tight crops (no margin) of the icon glyph and the "Goodlist" wordmark band
// below it, measured the same way, used for the feature graphic lockup.
const iconTight = { left: 520, top: 299, width: 1395 - 520, height: 1185 - 299 };
const wordmarkTight = { left: 227, top: 1253, width: 1692 - 227, height: 1563 - 1253 };

// Brand navy — matches the icon's own background so flattening is invisible
// against the glyph itself.
const BRAND_NAVY = '#072655';
// Brand cream — the feature graphic needs a light ground, since the wordmark
// itself is rendered in navy and would disappear against a navy background.
const BRAND_CREAM = '#faf8f3';

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

  // Play Store listing icon: same opaque square as icon.png, just 512x512.
  await sharp(source)
    .extract(crop)
    .flatten({ background: BRAND_NAVY })
    .resize(512, 512)
    .toFile(path.join(imagesDir, 'play-store-icon.png'));

  // Feature graphic (1024x500): icon glyph + wordmark side by side on cream,
  // sized to roughly match their proportions in the original lockup.
  const iconSize = 340;
  const wordmarkHeight = Math.round(iconSize * (wordmarkTight.height / iconTight.height));
  const wordmarkWidth = Math.round(wordmarkTight.width * (wordmarkHeight / wordmarkTight.height));
  const gap = 40;
  const contentWidth = iconSize + gap + wordmarkWidth;
  const leftMargin = Math.round((1024 - contentWidth) / 2);

  const iconBuf = await sharp(source).extract(iconTight).resize(iconSize, iconSize).toBuffer();
  const wordmarkBuf = await sharp(source)
    .extract(wordmarkTight)
    .resize(wordmarkWidth, wordmarkHeight)
    .toBuffer();

  await sharp({
    create: { width: 1024, height: 500, channels: 3, background: BRAND_CREAM },
  })
    .composite([
      { input: iconBuf, left: leftMargin, top: Math.round((500 - iconSize) / 2) },
      { input: wordmarkBuf, left: leftMargin + iconSize + gap, top: Math.round((500 - wordmarkHeight) / 2) },
    ])
    .png()
    .toFile(path.join(imagesDir, 'feature-graphic.png'));

  console.log(
    'Generated icon.png, splash-icon.png, favicon.png, android-icon-foreground.png, play-store-icon.png, feature-graphic.png',
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
