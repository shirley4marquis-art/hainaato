import { readFile } from "node:fs/promises";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import subsetFont from "subset-font";
import { PDFDocument, PDFFont, StandardFonts } from "pdf-lib";
import { DocumentError, type FieldMapping } from "./types";

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
      primary = await this.pdf.embedFont(field.font === "serif" ? (bold ? StandardFonts.TimesRomanBold : StandardFonts.TimesRoman) : field.font === "mono" ? (bold ? StandardFonts.CourierBold : StandardFonts.Courier) : (bold ? StandardFonts.HelveticaBold : StandardFonts.Helvetica));
      this.latin.set(key, primary);
    }
    const supported = new Set(primary.getCharacterSet());
    // HarfBuzz makes a valid compact TrueType font; avoid fontkit's broken
    // CJK subsetting, which retains character codes but loses glyph outlines.
    if ([...text].some(c => !supported.has(c.codePointAt(0)!) && c !== "\n") && !this.fallback) {
      const bytes = await subsetFont(await loadCjkFont(), this.allText, { targetFormat: "sfnt" });
      this.fallback = await this.pdf.embedFont(bytes, { subset: false });
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
