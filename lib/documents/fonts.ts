import { readFile } from "node:fs/promises";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import subsetFont from "subset-font";
import { PDFDocument, PDFFont, StandardFonts } from "pdf-lib";
import { DocumentError, type FieldMapping } from "./types";

// pdf-lib subtracts an unscaled descender for custom fonts whose em is not 1000.
// Keep real font-unit metrics so reference-sized labels do not shrink incorrectly.
const customMetrics = new WeakMap<PDFFont, { ascent: number; descent: number }>();
function rememberMetrics(font: PDFFont, bytes: Uint8Array) {
  const parsed = fontkit.create(bytes);
  customMetrics.set(font, { ascent: parsed.ascent / parsed.unitsPerEm, descent: Math.abs(parsed.descent) / parsed.unitsPerEm });
}
export function fontVerticalMetrics(font: PDFFont, size: number) {
  const metrics = customMetrics.get(font);
  if (metrics) return { ascent: metrics.ascent * size, descent: metrics.descent * size };
  const ascent = font.heightAtSize(size, { descender: false });
  return { ascent, descent: font.heightAtSize(size) - ascent };
}
let cjkBytes: Promise<Buffer> | undefined;
export function loadCjkFont(): Promise<Buffer> {
  return cjkBytes ??= readFile(path.join(process.cwd(), "assets/fonts/NotoSansSC-Regular.ttf")).catch(() => { cjkBytes = undefined; throw new DocumentError("Chinese font failed to load.", 503); });
}
export class DocumentFonts {
  private latin = new Map<string, PDFFont>();
  private fallback?: PDFFont;
  constructor(private pdf: PDFDocument, private allText: string) { pdf.registerFontkit(fontkit); }
  async prepare(text: string, field: FieldMapping) {
    const key = `${field.font}-${field.fontWeight}`;
    let primary = this.latin.get(key);
    if (!primary) {
      const bold = field.fontWeight === "bold";
      if (field.font === "sans") {
        // Match the supplied company master, which embeds Liberation Sans.
        const bytes = await readFile(path.join(process.cwd(), "assets/fonts", `LiberationSans-${bold ? "Bold" : "Regular"}.ttf`));
        primary = await this.pdf.embedFont(await subsetFont(bytes, this.allText, { targetFormat: "sfnt" }), { subset: false });
        rememberMetrics(primary, bytes);
      } else {
        primary = await this.pdf.embedFont(field.font === "serif" ? (bold ? StandardFonts.TimesRomanBold : StandardFonts.TimesRoman) : (bold ? StandardFonts.CourierBold : StandardFonts.Courier));
      }
      this.latin.set(key, primary);
    }
    const supported = new Set(primary.getCharacterSet());
    // HarfBuzz makes a valid compact TrueType font; avoid fontkit's broken
    // CJK subsetting, which retains character codes but loses glyph outlines.
    if ([...text].some(c => !supported.has(c.codePointAt(0)!) && c !== "\n") && !this.fallback) {
      const bytes = await subsetFont(await loadCjkFont(), this.allText, { targetFormat: "sfnt" });
      this.fallback = await this.pdf.embedFont(bytes, { subset: false });
      rememberMetrics(this.fallback, bytes);
    }
    const fallbackSet = this.fallback ? new Set(this.fallback.getCharacterSet()) : new Set<number>();
    const fallback = this.fallback;
    return (character: string): PDFFont => {
      const code = character.codePointAt(0)!;
      if (supported.has(code)) return primary!;
      if (fallback && fallbackSet.has(code)) return fallback;
      throw new DocumentError(`The document font does not support character U+${code.toString(16).toUpperCase()}.`);
    };
  }
}
