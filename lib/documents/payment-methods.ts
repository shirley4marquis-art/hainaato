import type { DocumentLanguage } from "./types";

/**
 * SECURITY-SENSITIVE — HAINA AUTO's approved crypto receiving details.
 *
 * This is the ONE place the wallet address is written. Buyers send funds to it,
 * so every document (proforma, commercial invoice, purchase contract) must show
 * exactly the same string. Do not edit without written confirmation from HAINA
 * AUTO; if the wallet ever changes, change it here and nowhere else.
 *
 * Verified against private-documents/Contrato_Haina_Auto_Ali_Rmeiti_EST0076
 * (§3 "Cómo pagar en USDT" and §13 "Método de pago") and its .docx source,
 * which states the address is "la misma billetera del contrato operativo de
 * Haina Auto Export".
 */
export const USDT_WALLET_ADDRESS = "0x3508A11CD6Dcc0A88114956eb574997E41655964";
export const USDT_NETWORK = "BNB Smart Chain (BSC / BEP-20)";

type Localised = Record<DocumentLanguage, string>;

export type ApprovedPaymentMethod = {
  id: string;
  /** Language-neutral label for the admin dropdown. */
  menuLabel: string;
  /** One-line form for tight header cells (contract cover chip). */
  summary: Localised;
  /** Full block written into every {{payment_method}} slot. */
  block: Localised;
};

const usdtBinanceBsc: ApprovedPaymentMethod = {
  id: "usdt-binance-bsc",
  menuLabel: "USDT — Binance · BNB Smart Chain (BSC / BEP-20)",
  summary: {
    es: "USDT — Binance BSC (BEP-20)",
    en: "USDT — Binance BSC (BEP-20)",
    zh: "USDT — 币安 BSC (BEP-20)",
    "es-zh": "USDT — Binance BSC (BEP-20)",
  },
  block: {
    es: `USDT (Tether) — Binance · red ${USDT_NETWORK}. No use ERC-20 ni TRC-20.
Billetera: ${USDT_WALLET_ADDRESS}
Es la misma billetera del contrato operativo de HAINA AUTO EXPORT.
Ningún cambio de datos de pago es válido sin confirmación oficial de HAINA AUTO.`,
    en: `USDT (Tether) — Binance · ${USDT_NETWORK} network. Do not use ERC-20 or TRC-20.
Wallet: ${USDT_WALLET_ADDRESS}
This is the same wallet as HAINA AUTO EXPORT's operating contract.
No change of payment details is valid without official confirmation from HAINA AUTO.`,
    zh: `USDT（Tether）— 币安 · ${USDT_NETWORK}。请勿使用 ERC-20 或 TRC-20。
收款地址：${USDT_WALLET_ADDRESS}
与 HAINA AUTO EXPORT 运营合同为同一钱包地址。
未经 HAINA AUTO 正式确认的收款信息变更一律无效。`,
    "es-zh": `USDT (Tether) — Binance · ${USDT_NETWORK} / 币安。No ERC-20 / TRC-20。
Billetera / 收款地址: ${USDT_WALLET_ADDRESS}
Misma billetera del contrato operativo de HAINA AUTO EXPORT. / 与运营合同同一钱包地址。
Ningún cambio válido sin confirmación oficial de HAINA AUTO. / 未经正式确认的变更无效。`,
  },
};

export const APPROVED_PAYMENT_METHODS: readonly ApprovedPaymentMethod[] = [usdtBinanceBsc];

/** Full block for a method id, or null if the id is not an approved method. */
export function paymentMethodBlock(id: string, language: DocumentLanguage): string | null {
  return APPROVED_PAYMENT_METHODS.find((method) => method.id === id)?.block[language] ?? null;
}

/**
 * Short one-line form of whatever payment method text was chosen. Used for the
 * contract cover chip. Matches an approved method by its exact block text so a
 * hand-typed value still yields a sensible summary (its first line).
 */
export function paymentMethodSummary(value: string, language: DocumentLanguage): string {
  if (!value) return "";
  const approved = APPROVED_PAYMENT_METHODS.find((method) =>
    Object.values(method.block).includes(value),
  );
  return approved ? approved.summary[language] : value.split("\n")[0].slice(0, 120);
}
