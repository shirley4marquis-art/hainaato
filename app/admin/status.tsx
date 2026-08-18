import { FileText, MessageSquareText, Wallet, CheckCircle2, Ship, PackageCheck, XCircle, type LucideIcon } from "lucide-react";

export type QuoteStatus =
  | "quoted"
  | "negotiating"
  | "deposit_paid"
  | "paid_full"
  | "shipped"
  | "delivered"
  | "lost";

export const STATUS_ORDER: QuoteStatus[] = [
  "quoted",
  "negotiating",
  "deposit_paid",
  "paid_full",
  "shipped",
  "delivered",
  "lost",
];

export const STATUS_META: Record<QuoteStatus, { label: string; icon: LucideIcon; tone: string }> = {
  quoted: { label: "Quoted", icon: FileText, tone: "blue" },
  negotiating: { label: "Negotiating", icon: MessageSquareText, tone: "amber" },
  deposit_paid: { label: "Deposit paid", icon: Wallet, tone: "teal" },
  paid_full: { label: "Paid in full", icon: CheckCircle2, tone: "green" },
  shipped: { label: "Shipped", icon: Ship, tone: "indigo" },
  delivered: { label: "Delivered", icon: PackageCheck, tone: "green" },
  lost: { label: "Lost", icon: XCircle, tone: "red" },
};
