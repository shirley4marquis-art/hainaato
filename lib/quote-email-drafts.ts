import type { AdminQuoteDetail } from "./crm";
import { customerQuoteEmailHtml } from "./email";
import { formatDate, formatMoney, itemTitle } from "./quote-document";

export type QuoteEmailDraftType = "quotation" | "follow_up" | "contract_deposit" | "shipping_docs" | "arrival_balance";

export type QuoteEmailDraft = {
  type: QuoteEmailDraftType;
  label: string;
  eyebrow: string;
  subject: string;
  html: string;
  summary: string;
  primary?: boolean;
  attachesPdf?: boolean;
};

const EMAIL_LOGO_CID = "hainaauto-logo";
const SALES_EMAIL = "sales@hainaautochina.com";
const WHATSAPP_URL = "https://wa.me/8615531026121";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function vehicleSummary(quote: AdminQuoteDetail): string {
  return quote.items.map((item) => itemTitle(item)).filter(Boolean).join("; ") || "Vehicle quotation";
}

function docRef(quote: AdminQuoteDetail): string {
  return quote.documentNumber ?? quote.ref;
}

function destination(quote: AdminQuoteDetail): string {
  return [quote.destinationPort, quote.destinationCountry].filter(Boolean).join(", ");
}

function amount(value: number, quote: AdminQuoteDetail): string {
  return formatMoney(value, quote.currency);
}

function paragraph(text: string): string {
  return `<p style="margin:0 0 16px;font-size:15px;line-height:1.75;color:#44536A">${escapeHtml(text).replace(/\n/g, "<br>")}</p>`;
}

function brandedEmail(params: {
  customerName: string;
  docRef: string;
  eyebrow: string;
  heading: string;
  preheader: string;
  paragraphs: string[];
  facts?: { label: string; value: string | null | undefined }[];
  ctaLabel?: string;
  ctaUrl?: string;
}): string {
  const NAVY = "#082F63";
  const CORAL = "#FF6B00";
  const factRows = (params.facts ?? [])
    .filter((fact) => fact.value)
    .map(
      (fact) =>
        `<tr><td style="padding:9px 0;border-top:1px solid #E0E6EF;color:#7B879A;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;width:150px;vertical-align:top">${escapeHtml(fact.label)}</td><td style="padding:9px 0;border-top:1px solid #E0E6EF;color:${NAVY};font-size:13px;line-height:1.55;font-weight:700;vertical-align:top">${escapeHtml(fact.value ?? "")}</td></tr>`
    )
    .join("");
  const cta = params.ctaLabel && params.ctaUrl
    ? `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0 8px"><tr><td bgcolor="${CORAL}" style="background:${CORAL};border-radius:8px"><a href="${escapeHtml(params.ctaUrl)}" style="display:inline-block;padding:13px 20px;color:#fff;text-decoration:none;font-size:13px;font-weight:800">${escapeHtml(params.ctaLabel)}</a></td><td width="10"></td><td style="border:1px solid #CBD5E1;border-radius:8px"><a href="${WHATSAPP_URL}" style="display:inline-block;padding:12px 18px;color:${NAVY};text-decoration:none;font-size:13px;font-weight:800">WhatsApp</a></td></tr></table>`
    : "";

  return `<!doctype html>
<html lang="en">
<head><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"></head>
<body style="margin:0;padding:0;background:#EEF2F7;font-family:Arial,Helvetica,sans-serif;color:#14213D">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(params.preheader)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#EEF2F7"><tr><td align="center" style="padding:28px 12px">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#FFFFFF" style="max-width:620px;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #DCE3EC;box-shadow:0 8px 28px rgba(8,47,99,.10)">
      <tr><td style="background:${CORAL};height:7px;font-size:0;line-height:0">&nbsp;</td></tr>
      <tr>
        <td bgcolor="${NAVY}" style="background:${NAVY};padding:24px 28px">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr>
            <td width="74" valign="middle"><img src="cid:${EMAIL_LOGO_CID}" width="62" height="62" alt="Haina Auto" style="display:block;width:62px;height:62px;border:0;border-radius:10px;background:#fff"></td>
            <td valign="middle"><div style="color:#fff;font-size:22px;font-weight:800;letter-spacing:-.02em">HAINA AUTO EXPORT</div><div style="color:#9FC5FF;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;margin-top:5px">${escapeHtml(params.eyebrow)}</div></td>
          </tr></table>
        </td>
      </tr>
      <tr>
        <td style="padding:30px 30px 10px">
          <div style="display:inline-block;background:#EAF2FF;color:${NAVY};border-radius:999px;padding:7px 12px;font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase">Quote ${escapeHtml(params.docRef)}</div>
          <h1 style="margin:18px 0 10px;font-size:25px;line-height:1.25;color:${NAVY};letter-spacing:-.02em">${escapeHtml(params.heading)}</h1>
          <p style="margin:0 0 18px;font-size:15px;line-height:1.7;color:#44536A">Hello ${escapeHtml(params.customerName)},</p>
          ${params.paragraphs.map(paragraph).join("")}
          ${factRows ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#F7F9FC" style="background:#F7F9FC;border:1px solid #E0E6EF;border-radius:12px;margin-top:20px"><tr><td style="padding:16px 20px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">${factRows}</table></td></tr></table>` : ""}
          ${cta}
          <p style="margin:22px 0 0;font-size:14px;line-height:1.7;color:#44536A">Best regards,<br><b style="color:${NAVY}">HainaAuto Sales Team</b></p>
        </td>
      </tr>
      <tr>
        <td style="padding:20px 30px 28px"><div style="height:1px;background:#E3E8EF;margin-bottom:18px"></div><div style="font-size:11px;color:#7B879A;line-height:1.7">
          <b style="color:${NAVY}">HAINA AUTO EXPORT</b><br>11, Yuefeng Road, Economic Development Zone, Zhangjiagang, Jiangsu, China<br>
          <a href="mailto:${SALES_EMAIL}" style="color:${NAVY}">${SALES_EMAIL}</a> · <a href="https://www.hainaautochina.com" style="color:${NAVY}">hainaautochina.com</a>
        </div></td>
      </tr>
    </table>
    <p style="margin:16px 0 0;font-size:10px;line-height:1.5;color:#98A2B3;text-align:center">You received this message because you are working with Haina Auto on a vehicle quotation.</p>
  </td></tr></table>
</body>
</html>`;
}

export function buildQuoteEmailDraft(quote: AdminQuoteDetail, type: QuoteEmailDraftType): QuoteEmailDraft {
  const ref = docRef(quote);
  const vehicles = vehicleSummary(quote);
  const dest = destination(quote);
  const customerName = quote.customer.name || "there";
  const quoteFacts = [
    { label: "Quotation", value: ref },
    { label: "Destination", value: dest },
    { label: "Vehicles", value: vehicles },
    { label: "Total CIF", value: amount(quote.cifTotal, quote) },
    { label: "Deposit", value: `${quote.depositPct}% · ${amount(quote.depositAmount, quote)}` },
    { label: "Balance", value: amount(quote.balanceAmount, quote) },
    { label: "Valid until", value: quote.validUntil ? formatDate(quote.validUntil, quote.language) : null },
  ];

  if (type === "quotation") {
    const { subject, html } = customerQuoteEmailHtml({
      customerName,
      ref: quote.ref,
      documentNumber: quote.documentNumber,
      vehicleSummary: vehicles,
    });
    return {
      type,
      label: "Quote email",
      eyebrow: "Primary email",
      subject,
      html,
      summary: "Formal quotation email with the regenerated PDF attached.",
      primary: true,
      attachesPdf: true,
    };
  }

  if (type === "follow_up") {
    return {
      type,
      label: "Quotation follow-up",
      eyebrow: "After quote",
      subject: `Following up on your HainaAuto quotation ${ref}`,
      html: brandedEmail({
        customerName,
        docRef: ref,
        eyebrow: "Quotation follow-up",
        heading: "Do you have any questions about your quotation?",
        preheader: `Following up on Haina Auto quotation ${ref}.`,
        paragraphs: [
          "I wanted to follow up and make sure you received the quotation we prepared for you.",
          "Please review the vehicle details, CIF price, destination port and payment terms. If you would like any adjustment, such as quantity, color, configuration or destination port, reply to this email and our team will revise the quotation for you.",
        ],
        facts: quoteFacts,
        ctaLabel: "Reply to sales team",
        ctaUrl: `mailto:${SALES_EMAIL}?subject=${encodeURIComponent(`Quotation ${ref}`)}`,
      }),
      summary: "Friendly follow-up after the quotation has been sent.",
    };
  }

  if (type === "contract_deposit") {
    return {
      type,
      label: "Contract & deposit",
      eyebrow: "Next step",
      subject: `Next step for quotation ${ref}: contract and ${quote.depositPct}% deposit`,
      html: brandedEmail({
        customerName,
        docRef: ref,
        eyebrow: "Contract and deposit",
        heading: "We are ready to prepare your sales contract",
        preheader: `Next step for Haina Auto quotation ${ref}: sales contract and deposit.`,
        paragraphs: [
          `If the quotation is approved, the next step is to prepare the sales contract for your review and signature.`,
          `After the contract is reviewed and signed, the ${quote.depositPct}% initial payment confirms the unit and allows Haina Auto to begin the export process from China. The remaining ${100 - quote.depositPct}% is paid after shipment, before vehicle release at the destination port.`,
        ],
        facts: quoteFacts,
        ctaLabel: "Confirm contract details",
        ctaUrl: `mailto:${SALES_EMAIL}?subject=${encodeURIComponent(`Approve quotation ${ref}`)}`,
      }),
      summary: "Explains approval, contract preparation and deposit payment.",
    };
  }

  if (type === "shipping_docs") {
    return {
      type,
      label: "Export documentation",
      eyebrow: "Export process",
      subject: `Export documentation process for HainaAuto quotation ${ref}`,
      html: brandedEmail({
        customerName,
        docRef: ref,
        eyebrow: "Export documentation",
        heading: "Your export documentation and shipment process",
        preheader: `Export documentation and shipping process for quotation ${ref}.`,
        paragraphs: [
          "Once the order is confirmed, our team prepares the export documents, coordinates vehicle release from the supplier, and arranges international shipping to the agreed destination port.",
          "We will keep you updated as the vehicle moves through inspection, export documentation, booking and shipment. Destination-country charges such as import duties, nationalization, port handling, customs broker fees, registration and plates remain separate unless they are expressly stated in the quotation.",
        ],
        facts: quoteFacts,
        ctaLabel: "Send shipping questions",
        ctaUrl: `mailto:${SALES_EMAIL}?subject=${encodeURIComponent(`Shipping process ${ref}`)}`,
      }),
      summary: "Explains documents, booking, shipment and destination charges.",
    };
  }

  return {
    type,
    label: "Arrival & balance",
    eyebrow: "Before release",
    subject: `Arrival and balance payment reminder for HainaAuto order ${ref}`,
    html: brandedEmail({
      customerName,
      docRef: ref,
      eyebrow: "Arrival and balance",
      heading: "Balance payment before destination release",
      preheader: `Balance payment reminder for Haina Auto quotation ${ref}.`,
      paragraphs: [
        `When the vehicle arrives at ${dest || "the destination port"}, the remaining ${100 - quote.depositPct}% balance is completed before release.`,
        "After the balance is completed, the customer or appointed customs broker can continue with port release, customs clearance, registration and other local destination-country procedures.",
      ],
      facts: quoteFacts,
      ctaLabel: "Confirm balance process",
      ctaUrl: `mailto:${SALES_EMAIL}?subject=${encodeURIComponent(`Balance payment ${ref}`)}`,
    }),
    summary: "Reminder for arrival, remaining balance and release process.",
  };
}

export function buildQuoteEmailDrafts(quote: AdminQuoteDetail): QuoteEmailDraft[] {
  return [
    buildQuoteEmailDraft(quote, "quotation"),
    buildQuoteEmailDraft(quote, "follow_up"),
    buildQuoteEmailDraft(quote, "contract_deposit"),
    buildQuoteEmailDraft(quote, "shipping_docs"),
    buildQuoteEmailDraft(quote, "arrival_balance"),
  ];
}
