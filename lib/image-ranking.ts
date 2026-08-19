// Pure image-candidate ranking, split out of app/vehicle-image.tsx (a "use
// client" module) so server-side code (API routes) can reuse it without
// pulling in client-only React state.
const BAD_IMAGE_HINTS = /(?:logo|avatar|icon|qr|qrcode|document|certificate|invoice|vin|engine|dashboard|interior|seat|steering|detail|closeup|close-up)/i;
const GOOD_IMAGE_HINTS = /(?:cover|main|hero|exterior|front|three-quarter|newcar|col_)/i;

export function rankVehicleImages(images: Array<string | null | undefined>): string[] {
  const unique = [...new Set(images.map((image) => image?.trim()).filter((image): image is string => Boolean(image)))];
  return unique
    .filter((image) => /(?:\.(?:avif|webp|png|jpe?g)(?:\?.*)?$)|(?:^\/(?:img|api\/vehicle-image)\/)|(?:^https?:\/\/)/i.test(image))
    .sort((a, b) => {
      const score = (image: string) => (GOOD_IMAGE_HINTS.test(image) ? 2 : 0) - (BAD_IMAGE_HINTS.test(image) ? 4 : 0);
      return score(b) - score(a);
    });
}
