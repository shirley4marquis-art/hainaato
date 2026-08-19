import { FileText, MessageSquareText, Wallet, CheckCircle2, Ship, PackageCheck, XCircle, type LucideIcon } from "lucide-react";

export type QuoteStatus =
  | "quoted"
  | "negotiating"
  | "deposit_paid"
  | "paid_full"
  | "usdt_payment_confirmed"
  | "bitcoin_payment_confirmed"
  | "inspection_scheduled"
  | "inspection_passed"
  | "export_docs_ready"
  | "booked_for_shipping"
  | "shipped"
  | "departed_port"
  | "arrived_port"
  | "customs_clearance"
  | "out_for_delivery"
  | "delivered"
  | "lost";

export const STATUS_ORDER: QuoteStatus[] = [
  "quoted",
  "negotiating",
  "deposit_paid",
  "paid_full",
  "usdt_payment_confirmed",
  "bitcoin_payment_confirmed",
  "inspection_scheduled",
  "inspection_passed",
  "export_docs_ready",
  "booked_for_shipping",
  "shipped",
  "departed_port",
  "arrived_port",
  "customs_clearance",
  "out_for_delivery",
  "delivered",
  "lost",
];

export const STATUS_META: Record<QuoteStatus, { label: string; icon: LucideIcon; tone: string }> = {
  quoted: { label: "Quoted", icon: FileText, tone: "blue" },
  negotiating: { label: "Negotiating", icon: MessageSquareText, tone: "amber" },
  deposit_paid: { label: "Deposit paid", icon: Wallet, tone: "teal" },
  paid_full: { label: "Paid in full", icon: CheckCircle2, tone: "green" },
  usdt_payment_confirmed: { label: "USDT confirmed", icon: Wallet, tone: "green" },
  bitcoin_payment_confirmed: { label: "Bitcoin confirmed", icon: Wallet, tone: "amber" },
  inspection_scheduled: { label: "Inspection scheduled", icon: FileText, tone: "blue" },
  inspection_passed: { label: "Inspection passed", icon: CheckCircle2, tone: "green" },
  export_docs_ready: { label: "Export docs ready", icon: FileText, tone: "teal" },
  booked_for_shipping: { label: "Shipping booked", icon: Ship, tone: "indigo" },
  shipped: { label: "Shipped", icon: Ship, tone: "indigo" },
  departed_port: { label: "Departed port", icon: Ship, tone: "indigo" },
  arrived_port: { label: "Arrived at port", icon: Ship, tone: "teal" },
  customs_clearance: { label: "Customs clearance", icon: FileText, tone: "amber" },
  out_for_delivery: { label: "Out for delivery", icon: PackageCheck, tone: "teal" },
  delivered: { label: "Delivered", icon: PackageCheck, tone: "green" },
  lost: { label: "Lost", icon: XCircle, tone: "red" },
};
