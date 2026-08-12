// Hex swatches for the color filter chips. Keyed on the output of normalizeColor().
const SWATCHES: Record<string, string> = {
  White: "#f5f5f2",
  Black: "#1a1a1a",
  Silver: "#c7cbd1",
  Gray: "#8b8f96",
  Blue: "#2e5fa3",
  Red: "#b5342e",
  Green: "#3f6b45",
  Gold: "#c9a24b",
  Brown: "#6b4a34",
  Orange: "#d0692b",
  Yellow: "#e0c23c",
  Purple: "#6b4e8e",
};

const FALLBACK_SWATCH = "#a8abb2";

export function swatchFor(colorLabel: string): string {
  return SWATCHES[colorLabel] ?? FALLBACK_SWATCH;
}
