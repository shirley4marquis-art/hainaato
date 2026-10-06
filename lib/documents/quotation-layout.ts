import { PDFDocument, rgb } from "pdf-lib";
import { generatePdf } from "./pdf";
import { cleanValue } from "./mapping";
import { defaultField, DocumentError, type DocumentData, type FieldMapping } from "./types";
import { translateSpecificationLines } from "./vehicle-translation";

type CopyTriple = readonly [string, string, string];
const C = {
  quotation: ["VEHICLE QUOTATION", "COTIZACIÓN DE VEHÍCULOS", "车辆报价"],
  specification: ["VEHICLE SPECIFICATIONS", "FICHA TÉCNICA DEL VEHÍCULO", "车辆规格"],
  more: ["ADDITIONAL SPECIFICATIONS", "ESPECIFICACIONES ADICIONALES", "补充车辆规格"],
  buyer: ["CUSTOMER DETAILS", "DATOS DEL CLIENTE", "客户资料"],
  destination: ["DELIVERY DESTINATION", "DESTINO DE ENTREGA", "交付目的地"],
  vehicleList: ["VEHICLES IN THIS QUOTATION", "VEHÍCULOS DE ESTA COTIZACIÓN", "本报价车辆"],
  prices: ["PRICE BREAKDOWN", "DESGLOSE DE PRECIOS", "价格明细"],
  total: ["TOTAL CIF ESTIMATE", "TOTAL CIF ESTIMADO", "预估 CIF 总额"],
  deposit: ["Deposit", "Anticipo", "定金"],
  balance: ["Balance before release", "Saldo antes de la entrega", "交付前尾款"],
  valid: ["Valid until", "Válida hasta", "有效期至"],
  fob: ["Vehicle FOB subtotal", "Subtotal FOB de los vehículos", "车辆 FOB 小计"],
  inland: ["China inland handling", "Gestión terrestre en China", "中国境内运输及操作"],
  export: ["Export clearance and documents", "Despacho y documentos de exportación", "出口清关及文件"],
  freight: ["Ocean freight", "Flete marítimo", "海运费"],
  insurance: ["Marine insurance", "Seguro marítimo", "海运保险"],
  customs: ["Estimated destination duties", "Impuestos estimados en destino", "目的地预估税费"],
  terms: ["PAYMENT & DELIVERY TERMS", "CONDICIONES DE PAGO Y ENTREGA", "付款及交付条款"],
  localCosts: ["Destination duties, port handling, registration and other local charges are estimates payable at destination. They are excluded unless expressly included in the written offer.", "Los aranceles, la manipulación portuaria, el registro y otros gastos locales son estimaciones pagaderas en destino. Se excluyen salvo que la oferta escrita indique expresamente lo contrario.", "目的地关税、港口操作费、登记费及其他当地费用均为估算金额，需在目的地支付；除非书面报价明确列明，否则不包含在内。"],
  facts: ["VEHICLE OVERVIEW", "DATOS DEL VEHÍCULO", "车辆概况"],
  equipment: ["EQUIPMENT & ADDITIONAL DETAILS", "EQUIPAMIENTO Y DETALLES ADICIONALES", "配置及其他详情"],
  noDetails: ["No additional catalogue details were supplied for this vehicle.", "No se proporcionaron más detalles de catálogo para este vehículo.", "目录中没有提供该车辆的其他信息。"],
  vehicle: ["Vehicle", "Vehículo", "车辆"],
  condition: ["Condition", "Estado", "车况"],
  vin: ["VIN", "VIN", "车架号"],
  exterior: ["Exterior", "Exterior", "外观颜色"],
  interior: ["Interior", "Interior", "内饰颜色"],
  engine: ["Engine", "Motor", "发动机"],
  fuel: ["Fuel / powertrain", "Combustible / motor", "燃料 / 动力"],
  transmission: ["Transmission", "Transmisión", "变速箱"],
  drive: ["Drivetrain", "Tracción", "驱动方式"],
  power: ["Power", "Potencia", "功率"],
  mileage: ["Mileage", "Kilometraje", "里程"],
  capacity: ["Seating capacity", "Capacidad de pasajeros", "乘坐人数"],
  body: ["Body type", "Tipo de carrocería", "车身类型"],
  stock: ["Stock ID", "Código de inventario", "库存编号"],
  unitPrice: ["Vehicle price", "Precio del vehículo", "车辆价格"],
  quantity: ["Quantity", "Cantidad", "数量"],
  note: ["Specifications are based on available vehicle records. Confirm the exact unit and arrange an inspection before booking.", "Las especificaciones se basan en los registros disponibles. Confirme la unidad exacta y coordine una inspección antes de reservar.", "规格根据现有车辆记录整理。预订前请确认具体车辆并安排验车。"],
  exported: ["Prepared for vehicle export", "Preparado para la exportación de vehículos", "汽车出口报价文件"],
  page: ["Page", "Página", "页"],
} satisfies Record<string, CopyTriple>;

function tr(copy: CopyTriple, language: DocumentData["language"]): string {
  if (language === "en") return copy[0];
  if (language === "zh") return copy[2];
  if (language === "es-zh") return `${copy[1]} / ${copy[2]}`;
  return copy[1];
}

function cleanText(value: unknown): string {
  return cleanValue(value).split("\n").map(line => line.trim().replace(/[ \t]+/g, " ")).filter(Boolean).join("\n");
}

export function publicSpecificationNotes(specs: Record<string, unknown>, language: DocumentData["language"] = "en"): string {
  return translateSpecificationLines(specs, language);
}

export async function generateQuotationLayout(data: DocumentData, galleries: Uint8Array[][], specificationOnly = false): Promise<Buffer> {
  if (!data.vehicles.length) throw new DocumentError("Select at least one vehicle.");
  if (galleries.length < data.vehicles.length || galleries.some(images => !images.length)) throw new DocumentError("Vehicle photos are required for customer documents. Refresh the catalogue photos and try again.");

  const pdf = await PDFDocument.create();
  const fields: FieldMapping[] = [], images: Uint8Array[] = [];
  const width = 595.28, height = 841.89, margin = 38, content = width - margin * 2;
  const v = data.values;
  const navy = rgb(.17, .055, .03), red = rgb(.71, .12, .035), gold = rgb(.87, .73, .37), cream = rgb(.98, .96, .91), line = rgb(.9, .87, .79);
  const pageNumbers: number[] = [];

  const text = (page: number, value: unknown, y: number, h: number, extra: Partial<FieldMapping> = {}) => {
    const cleaned = cleanText(value);
    if (!cleaned) return;
    if (cleaned.length > 30000) throw new DocumentError("The vehicle details exceed the document limit. Shorten the repeated descriptions and try again.");
    fields.push({ ...defaultField(page), id: `document-${fields.length}`, field: "notes", text: cleaned, x: margin, y, width: content, height: h, fontSize: 9.5, minFontSize: 8, maxLines: 80, color: "#241611", ...extra });
  };
  const section = (page: number, title: string, y: number) => {
    const target = pdf.getPage(page - 1);
    target.drawRectangle({ x: margin, y: height - y - 23, width: content, height: 23, color: cream, borderColor: line, borderWidth: .6 });
    target.drawRectangle({ x: margin, y: height - y - 23, width: 4, height: 23, color: gold });
    text(page, title, y + 5, 14, { x: margin + 11, width: content - 18, fontWeight: "bold", fontSize: 9.5, minFontSize: 8.5, color: "#2a0e08" });
  };
  const addPage = (title: string, continuation = false) => {
    const page = pdf.addPage([width, height]), number = pdf.getPageCount();
    pageNumbers.push(number);
    page.drawRectangle({ x: 0, y: height - 92, width, height: 92, color: navy });
    page.drawRectangle({ x: 0, y: height - 98, width, height: 6, color: red });
    page.drawRectangle({ x: margin, y: height - 98, width: 94, height: 3, color: gold });
    text(number, "NINDGE AUTOMOBILE", 22, 22, { fontSize: 18, minFontSize: 15, fontWeight: "bold", color: "#ffffff" });
    text(number, title, 52, 22, { fontSize: 11, minFontSize: 9.5, fontWeight: "bold", color: "#f3d486" });
    text(number, [continuation ? cleanValue(v.vehicle_summary) : cleanValue(v.document_number), cleanValue(v.issue_date)].filter(Boolean).join("   ·   "), 120, 15, { fontSize: 8.5, minFontSize: 8, color: "#6b5643" });
    page.drawLine({ start: { x: margin, y: height - 124 }, end: { x: width - margin, y: height - 124 }, thickness: .8, color: line });
    return number;
  };
  const image = (page: number, source: Uint8Array | null | undefined, x: number, y: number, w: number, h: number, id: string) => {
    const target = pdf.getPage(page - 1);
    target.drawRectangle({ x, y: height - y - h, width: w, height: h, color: rgb(.99, .985, .97), borderColor: line, borderWidth: .7 });
    if (!source) return;
    fields.push({ ...defaultField(page), id, field: "vehicle_image", kind: "image", itemIndex: images.length, x: x + 3, y: y + 3, width: w - 6, height: h - 6 });
    images.push(source);
  };
  const card = (page: number, y: number, h: number, x = margin, w = content) => pdf.getPage(page - 1).drawRectangle({ x, y: height - y - h, width: w, height: h, color: rgb(1, .997, .987), borderColor: line, borderWidth: .65 });
  const pairedDetails = (page: number, entries: string[], y: number, maxRows: number, rowHeight: number, fontSize = 8.7) => {
    const colGap = 14, colWidth = (content - colGap) / 2;
    for (let index = 0; index < entries.length; index++) {
      const col = Math.floor(index / maxRows), row = index % maxRows;
      const x = margin + col * (colWidth + colGap), top = y + row * rowHeight;
      card(page, top, rowHeight - 3, x, colWidth);
      text(page, entries[index], top + 4, rowHeight - 8, { x: x + 7, width: colWidth - 14, fontSize, minFontSize: 7.6, maxLines: 3, lineHeight: 1.2, color: "#39281c" });
    }
  };

  if (!specificationOnly) {
    const chunkSize = 3;
    for (let start = 0; start < data.vehicles.length; start += chunkSize) {
      const end = Math.min(data.vehicles.length, start + chunkSize), n = addPage(tr(C.quotation, data.language));
      const isLast = end === data.vehicles.length;
      card(n, 137, 56);
      text(n, tr(C.buyer, data.language), 145, 12, { x: margin + 10, width: 130, fontSize: 8, minFontSize: 7, fontWeight: "bold", color: "#9c260e" });
      text(n, [v.buyer_name, v.buyer_company, v.buyer_email, v.buyer_phone, v.buyer_address, v.buyer_country].filter(Boolean).join(" · "), 159, 26, { x: margin + 10, width: content - 20, fontSize: 8.5, minFontSize: 7.5, maxLines: 3 });
      text(n, `${tr(C.destination, data.language)}: ${[v.destination_port, v.destination_country].filter(Boolean).join(", ")}${v.expiry_date ? `   ·   ${tr(C.valid, data.language)}: ${v.expiry_date}` : ""}`, 189, 18, { fontSize: 8.3, minFontSize: 7.5, color: "#6b5643" });
      section(n, tr(C.vehicleList, data.language), 216);
      for (let index = start; index < end; index++) {
        const item = data.vehicles[index], local = index - start, top = 249 + local * 72;
        card(n, top, 66);
        image(n, galleries[index]?.[0], margin + 5, top + 5, 66, 56, `quotation-thumb-${index}`);
        const left = margin + 80, infoWidth = 315;
        text(n, [item.vehicle_year, item.vehicle_brand, item.vehicle_model].map(cleanValue).filter(Boolean).join(" "), top + 7, 15, { x: left, width: infoWidth, fontSize: 10.3, minFontSize: 9, fontWeight: "bold", color: "#2a0e08" });
        text(n, [item.stock_id ? `${tr(C.stock, data.language)}: ${item.stock_id}` : "", item.vehicle_condition, item.vehicle_color, item.mileage ? `${item.mileage} km` : ""].filter(Boolean).join(" · "), top + 25, 13, { x: left, width: infoWidth, fontSize: 8.2, minFontSize: 7.5, color: "#6b5643" });
        text(n, `${cleanValue(item.quantity)} × ${cleanValue(item.unit_price)} = ${cleanValue(item.vehicle_total)}`, top + 42, 13, { x: left, width: infoWidth, fontSize: 8.8, minFontSize: 8, fontWeight: "bold", color: "#9c260e" });
        text(n, cleanValue(item.vehicle_total), top + 23, 22, { x: margin + content - 112, width: 101, align: "right", fontSize: 9.3, minFontSize: 8, fontWeight: "bold", color: "#2a0e08" });
      }
      if (!isLast) {
        text(n, tr(["Additional vehicles continue on the next page.", "Los vehículos restantes continúan en la página siguiente.", "其余车辆详见下一页。"], data.language), 477, 22, { fontSize: 8.5, minFontSize: 8, color: "#6b5643" });
        continue;
      }
      const costsY = 249 + (end - start) * 72 + 10;
      section(n, tr(C.prices, data.language), costsY);
      const costEntries = [
        `${tr(C.fob, data.language)}: ${v.subtotal}`,
        `${tr(C.inland, data.language)}: ${v.inland_cost}`,
        `${tr(C.export, data.language)}: ${v.documentation_cost}`,
        `${tr(C.freight, data.language)}: ${v.shipping_cost}`,
        `${tr(C.insurance, data.language)}: ${v.insurance_cost}`,
        v.customs_estimate ? `${tr(C.customs, data.language)}: ${v.customs_estimate}` : "",
      ].filter(Boolean);
      pairedDetails(n, costEntries, costsY + 31, 3, 24, 8.2);
      const totalY = costsY + 108;
      pdf.getPage(n - 1).drawRectangle({ x: margin, y: height - totalY - 43, width: content, height: 43, color: red });
      text(n, tr(C.total, data.language), totalY + 8, 15, { x: margin + 10, width: content - 150, fontSize: 10, minFontSize: 9, fontWeight: "bold", color: "#ffffff" });
      text(n, v.total_amount, totalY + 7, 17, { x: margin + content - 160, width: 150, align: "right", fontSize: 12, minFontSize: 10, fontWeight: "bold", color: "#ffffff" });
      const paymentY = totalY + 54;
      text(n, `${tr(C.deposit, data.language)} (${v.initial_payment_percentage}%): ${v.initial_payment}     ·     ${tr(C.balance, data.language)}: ${v.remaining_balance}`, paymentY, 17, { fontSize: 8.5, minFontSize: 7.8, fontWeight: "bold", color: "#39281c" });
      if (v.payment_terms) text(n, `${tr(C.terms, data.language)}: ${v.payment_terms}`, paymentY + 19, 30, { fontSize: 8, minFontSize: 7.4, maxLines: 2, color: "#6b5643" });
      text(n, v.customs_estimate ? tr(C.localCosts, data.language) : tr(C.note, data.language), paymentY + (v.payment_terms ? 51 : 20), 34, { fontSize: 7.4, minFontSize: 7, maxLines: 3, color: "#6b5643" });
    }
  }

  for (const [index, item] of data.vehicles.entries()) {
    const title = [item.vehicle_year, item.vehicle_brand, item.vehicle_model].map(cleanValue).filter(Boolean).join(" ");
    const n = addPage(tr(C.specification, data.language));
    text(n, title, 137, 26, { fontSize: 17, minFontSize: 13, fontWeight: "bold", color: "#2a0e08" });
    text(n, `${tr(C.stock, data.language)}: ${cleanValue(item.stock_id || v.document_number)}`, 164, 16, { fontSize: 8.5, minFontSize: 8, color: "#8a2914" });
    const photos = galleries[index] ?? [];
    if (!photos.length) throw new DocumentError(`A vehicle image is required for ${title}.`);
    if (photos.length === 1) {
      image(n, photos[0], margin, 188, content, 202, `vehicle-photo-${index}-0`);
    } else {
      image(n, photos[0], margin, 188, 326, 202, `vehicle-photo-${index}-0`);
      image(n, photos[1], margin + 338, 188, content - 338, photos.length > 2 ? 97 : 202, `vehicle-photo-${index}-1`);
      if (photos[2]) image(n, photos[2], margin + 338, 293, content - 338, 97, `vehicle-photo-${index}-2`);
    }
    section(n, tr(C.facts, data.language), 404);
    const facts: [keyof typeof C, unknown][] = [
      ["condition", item.vehicle_condition], ["vin", item.vin], ["exterior", item.vehicle_color], ["interior", item.interior_color],
      ["engine", item.engine], ["fuel", item.fuel], ["transmission", item.transmission], ["drive", item.drivetrain],
      ["power", item.power], ["mileage", item.mileage ? `${cleanValue(item.mileage)} km` : ""], ["capacity", item.capacity], ["body", item.body_type],
      ["unitPrice", item.unit_price], ["quantity", item.quantity],
    ].filter(([, value]) => cleanValue(value)) as [keyof typeof C, unknown][];
    const factEntries = facts.map(([key, value]) => `${tr(C[key], data.language)}: ${cleanValue(value)}`);
    pairedDetails(n, factEntries, 433, 7, 24, 8.2);

    const details = cleanText(item.notes).split("\n").filter(Boolean);
    const detailsStart = 625;
    section(n, tr(C.equipment, data.language), 601);
    if (!details.length) {
      text(n, tr(C.noDetails, data.language), detailsStart, 28, { fontSize: 8.5, minFontSize: 8, color: "#6b5643" });
    } else {
      pairedDetails(n, details.slice(0, 14), detailsStart, 7, 22, 7.9);
    }
    text(n, tr(C.note, data.language), 782, 20, { fontSize: 7.1, minFontSize: 6.6, color: "#6b5643" });

    for (let offset = 14; offset < details.length; offset += 30) {
      const extra = addPage(tr(C.more, data.language), true);
      text(extra, title, 137, 22, { fontSize: 13, minFontSize: 11, fontWeight: "bold", color: "#2a0e08" });
      section(extra, tr(C.equipment, data.language), 170);
      pairedDetails(extra, details.slice(offset, offset + 30), 202, 15, 38, 8.5);
    }
  }

  for (const n of pageNumbers) {
    const page = pdf.getPage(n - 1);
    page.drawLine({ start: { x: margin, y: 29 }, end: { x: width - margin, y: 29 }, thickness: .65, color: line });
    text(n, `info@nindgeauto.com  ·  nindgeauto.com   |   ${tr(C.page, data.language)} ${n} / ${pageNumbers.length}`, 815, 13, { fontSize: 7.4, minFontSize: 7, color: "#6b5643" });
  }

  try { return await generatePdf(await pdf.save(), { fields, protectedRegions: [], lockedPages: [], requiredFields: [], reviewed: true }, { ...data, images }); }
  catch (error) {
    if (error instanceof DocumentError && /too long|Unable to fit/.test(error.message)) throw new DocumentError("The quotation details exceed the readable layout. The document was not truncated; shorten repeated descriptions and try again.");
    throw error;
  }
}
