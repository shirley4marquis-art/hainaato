export const CUSTOM_COLOR_SURCHARGE_USD = 300;

export function supportsCustomColor(bodyType: string | null | undefined): boolean {
  if (!bodyType) return false;
  const normalized = bodyType.toLowerCase();
  if (/(truck|pickup|van|bus|machinery|machine|tractor|dump|mixer|crane|trailer|cargo|commercial)/.test(normalized)) {
    return false;
  }
  return /(suv|sedan|hatchback|coupe|convertible|wagon|mpv|minivan|crossover|car|sport)/.test(normalized);
}
