// Standard website and catalogue previews use the same image as the homepage hero.
// Keep share-card images on Vercel's stable project alias so previews still
// load when the custom domain has a DNS outage.
export const SOCIAL_IMAGE_ORIGIN = "https://hainaauto.vercel.app";

export function absoluteSocialImage(path: string): string {
  return new URL(path, SOCIAL_IMAGE_ORIGIN).toString();
}

export const SITE_HERO_PREVIEW = {
  url: "/images/Herohainamain.png?v=20260915",
  width: 1672,
  height: 941,
  alt: "Nindge Automobile — vehicles for international export",
};
