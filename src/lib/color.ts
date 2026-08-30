function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.replace('#', '');
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return [r, g, b];
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (value: number) => Math.round(value).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

/** Mixes `hex` toward white by `amount` (0 = unchanged, 1 = pure white). */
export function mixWithWhite(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  const mix = (channel: number) => channel + (255 - channel) * amount;
  return rgbToHex(mix(r), mix(g), mix(b));
}

/** Mixes `hex` toward black by `amount` (0 = unchanged, 1 = pure black). */
export function mixWithBlack(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  const mix = (channel: number) => channel * (1 - amount);
  return rgbToHex(mix(r), mix(g), mix(b));
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG 2.x relative contrast ratio between two colors, from 1 (no contrast) to 21 (max). */
export function contrastRatio(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(hex1);
  const l2 = relativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Darken `color` toward black in small steps until it reaches at least
 * `minRatio` contrast against `against`. Returns `color` unchanged if it
 * already passes. Caps the darkening so it never returns pure black: if the
 * cap is hit, returns the darkest step tried (best effort).
 */
export function darkenToContrast(color: string, against: string, minRatio: number): string {
  if (contrastRatio(color, against) >= minRatio) return color;
  let result = color;
  for (let amount = 0.05; amount <= 0.9; amount += 0.05) {
    result = mixWithBlack(color, amount);
    if (contrastRatio(result, against) >= minRatio) return result;
  }
  return result; // best effort at amount = 0.9
}
