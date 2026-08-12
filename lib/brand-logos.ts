// Maps a brand string as it appears in our vehicle data (which can be inconsistent —
// "Li" vs "Li Auto", "Jietu" vs "Jetour", etc.) to the slug of a logo file under
// public/brand-logos/<slug>.png. Ported from the canonical brand list used on the
// brand directory so listings and the directory agree on naming.

const SLUG_OVERRIDES: Record<string, string> = {
  "Great Wall": "great-wall",
  HiPhi: "hiphi",
  "IM Motors": "im-motors",
  "Land Rover": "land-rover",
  "Li Auto": "li-auto",
  "Lynk & Co": "lynk-co",
  "Mercedes-Maybach": "maybach",
  "Rising Auto": "rising-auto",
  "Golden Dragon": "golden-dragon",
  ZhiJie: "luxeed",
  XPeng: "xpeng",
};

// canonical brand name -> raw strings that may appear in our normalized `brand` field
const ALIASES: Record<string, string[]> = {
  "IM Motors": ["IM Motors", "IM"],
  Hyundai: ["Hyundai", "Elantra"],
  BYD: ["BYD", "Qin"],
  Jetour: ["Jetour", "Jietu"],
  "Li Auto": ["Li", "Li Auto"],
  "Lynk & Co": ["Lynk", "Lynk & Co"],
  "Great Wall": ["Great", "Great Wall"],
  "Rising Auto": ["Feifan", "Rising Auto"],
  Voyah: ["Voyah", "LanTu", "Lantu", "Lan图"],
  ZhiJie: ["ZhiJie", "Zhijie", "Zhi"],
  Neta: ["Neta", "Nezha"],
  XPeng: ["Xpeng", "XPeng"],
  Bestune: ["Bestune", "Besturn", "Benteng"],
  AVATR: ["Avatr", "Avata", "Avatar"],
  "Mercedes-Maybach": ["Mercedes-Maybach"],
  Oshan: ["Oshan", "Oushang"],
  ORA: ["ORA", "Euler", "Eula"],
};

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const rawToCanonical = new Map<string, string>();
for (const [canonical, raws] of Object.entries(ALIASES)) {
  for (const raw of raws) rawToCanonical.set(raw.toLowerCase(), canonical);
}

export function logoSlugFor(rawBrand: string): string {
  const key = rawBrand.trim().toLowerCase();
  const canonical = rawToCanonical.get(key) ?? rawBrand.trim();
  return SLUG_OVERRIDES[canonical] ?? slugify(canonical);
}

export function logoPathFor(rawBrand: string): string {
  return `/brand-logos/${logoSlugFor(rawBrand)}.png`;
}
