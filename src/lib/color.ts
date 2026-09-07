/** Blends two `#RRGGBB` colors in sRGB. `amount` is clamped to 0-1. */
export function mixHex(from: string, to: string, amount: number): string {
  const t = Math.min(Math.max(amount, 0), 1);
  const channel = (offset: number) => {
    const a = parseInt(from.replace('#', '').slice(offset, offset + 2), 16);
    const b = parseInt(to.replace('#', '').slice(offset, offset + 2), 16);
    return Math.round(a + (b - a) * t)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${channel(0)}${channel(2)}${channel(4)}`;
}

function relativeLuminance(hex: string): number {
  const channels = [0, 2, 4].map((offset) => {
    const value = parseInt(hex.replace('#', '').slice(offset, offset + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

/** WCAG contrast ratio between two `#RRGGBB` colors, 1-21. */
export function contrastRatio(a: string, b: string): number {
  const [lighter, darker] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
}

// A chart mark that drops below this against its own background stops reading
// as a mark at all — it becomes a tint of the card.
const MARK_CONTRAST_FLOOR = 2.3;
const STEP = 0.05;

/**
 * The pale end of a sequential ramp: `color` washed as far toward `surface` as
 * it will go while still clearing the contrast floor against it.
 *
 * Fixed wash fractions can't work here — this app ships 9 themes whose
 * `primary` sits anywhere from 2.5:1 to 10:1 against its own card, so the same
 * 60% wash that looks right on one theme dissolves into the card on another.
 * Snapping to the palest step that still passes gives every theme the widest
 * ramp it can actually support.
 */
export function washToSurface(color: string, surface: string, maxAmount = 0.6): string {
  let best = 0;
  // Contrast falls monotonically as the wash goes further, so the first
  // failing step is the last one worth trying.
  for (let amount = STEP; amount <= maxAmount + Number.EPSILON; amount += STEP) {
    if (contrastRatio(mixHex(color, surface, amount), surface) < MARK_CONTRAST_FLOOR) break;
    best = amount;
  }
  return mixHex(color, surface, best);
}
