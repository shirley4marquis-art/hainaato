import routeData from "../data/cif-route-rates.json";
import { SHIPPING_COUNTRIES } from "./shipping-ports";

const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

type RouteRate = {
  country: string;
  freightUsd: number;
  freightLowUsd: number;
  freightHighUsd: number;
  insuranceRate: number;
  basis: "published-route-range" | "regional-route-estimate";
};

const ROUTE_RATES = routeData.rates as Record<string, RouteRate>;

export type CifEstimateItem = {
  fobFinal: number;
  qty: number;
  bodyType: string | null;
  fuelType?: string | null;
  condition?: string | null;
};

export type CifEstimate = {
  country: string;
  port: string;
  vehicleCount: number;
  vehicleTypes: string[];
  rateBasis: "published-route-range" | "regional-route-estimate";
  rateDate: string;
  routeFreightPerStandardCar: number;
  insuranceRate: number;
  fobSubtotal: number;
  exportClearance: number;
  originHandling: number;
  documentation: number;
  billOfLading: number;
  inlandTransportCost: number;
  exportDocumentationCost: number;
  freightCost: number;
  lowFreightCost: number;
  highFreightCost: number;
  insuranceCost: number;
  cifTotal: number;
  lowCifTotal: number;
  highCifTotal: number;
  estimateNote: string;
};

type VehicleClass = { label: string; freightFactor: number; insuranceFactor: number };

function vehicleClass(item: CifEstimateItem): VehicleClass {
  const body = (item.bodyType ?? "").toLowerCase();
  const title = body.replace(/[^a-z]/g, " ");
  if (/bus|coach/.test(title)) return { label: "Bus", freightFactor: 2.4, insuranceFactor: 1.25 };
  if (/tractor|dump|heavy truck|truck/.test(title)) return { label: "Truck", freightFactor: 2.2, insuranceFactor: 1.25 };
  if (/pickup/.test(title)) return { label: "Pickup", freightFactor: 1.2, insuranceFactor: 1.12 };
  if (/van|minivan|mpv|commercial/.test(title)) return { label: "Van / MPV", freightFactor: 1.18, insuranceFactor: 1.1 };
  if (/suv|off road/.test(title)) return { label: "SUV", freightFactor: 1.1, insuranceFactor: 1.06 };
  return { label: "Passenger car", freightFactor: 1, insuranceFactor: 1 };
}

function insuranceFactor(item: CifEstimateItem, base: number): number {
  const fuel = (item.fuelType ?? "").toLowerCase();
  const electric = /electric|ev|bev|battery/.test(fuel);
  const used = (item.condition ?? "").toLowerCase() === "used";
  return base * (electric ? 1.12 : 1) * (used ? 1.04 : 1);
}

function quoteCountry(country: string) {
  return SHIPPING_COUNTRIES.find((entry) => entry.country.toLowerCase() === country.trim().toLowerCase()) ?? null;
}

function estimateInsurance(cargoBeforeInsurance: number, rate: number): number {
  // CIF cover is budgeted at 110% of insured value. Solve the premium against
  // a CIF base that includes the premium, rather than applying a flat amount.
  const insuredRate = Math.min(0.02, Math.max(0, rate)) * 1.1;
  return Math.max(25, Math.round((cargoBeforeInsurance * insuredRate) / (1 - insuredRate)));
}

export function estimateCif(
  countryName: string,
  portName: string,
  items: CifEstimateItem[],
): CifEstimate | null {
  const destination = quoteCountry(countryName);
  const rate = destination ? ROUTE_RATES[destination.iso2] : null;
  const selectedPort = destination?.ports.find((entry) => entry.name.toLowerCase() === portName.trim().toLowerCase());
  if (!destination || !rate || (!selectedPort && portName !== "Other / To be confirmed") || items.length === 0) return null;

  const quantityFor = (item: CifEstimateItem) => Math.min(50, Math.max(1, Math.round(Number.isFinite(item.qty) ? item.qty : 1)));
  const vehicleCount = items.reduce((sum, item) => sum + quantityFor(item), 0);
  const volumeFactor = vehicleCount >= 5 ? 0.8 : vehicleCount >= 3 ? 0.86 : vehicleCount === 2 ? 0.92 : 1;
  const fobSubtotal = roundMoney(items.reduce((sum, item) => sum + Math.max(0, Number.isFinite(item.fobFinal) ? item.fobFinal : 0) * quantityFor(item), 0));

  const exportClearance = Math.round(items.reduce((sum, item) => sum + 95 * vehicleClass(item).freightFactor * quantityFor(item), 0));
  const originHandling = Math.round(items.reduce((sum, item) => sum + 185 * vehicleClass(item).freightFactor * quantityFor(item), 0));
  const documentation = 80;
  const billOfLading = 65;
  const inlandTransportCost = originHandling;
  const exportDocumentationCost = exportClearance + documentation + billOfLading;

  let freightCost = 0;
  let lowFreight = 0;
  let highFreight = 0;
  let insuranceCost = 0;
  let lowInsurance = 0;
  let highInsurance = 0;
  for (const item of items) {
    const qty = quantityFor(item);
    const vehicle = vehicleClass(item);
    const freight = rate.freightUsd * vehicle.freightFactor * qty * volumeFactor;
    const low = rate.freightLowUsd * vehicle.freightFactor * qty * volumeFactor;
    const high = rate.freightHighUsd * vehicle.freightFactor * qty * volumeFactor;
    const originPerLine = qty * 280 * vehicle.freightFactor + (documentation + billOfLading) * (qty / vehicleCount);
    const cargo = Math.max(0, item.fobFinal) * qty + originPerLine;
    freightCost += freight;
    lowFreight += low;
    highFreight += high;
    insuranceCost += estimateInsurance(cargo + freight, insuranceFactor(item, rate.insuranceRate));
    lowInsurance += estimateInsurance(cargo + low, insuranceFactor(item, rate.insuranceRate));
    highInsurance += estimateInsurance(cargo + high, insuranceFactor(item, rate.insuranceRate));
  }

  freightCost = Math.round(freightCost);
  lowFreight = Math.round(lowFreight);
  highFreight = Math.round(highFreight);
  insuranceCost = Math.round(insuranceCost);
  lowInsurance = Math.round(lowInsurance);
  highInsurance = Math.round(highInsurance);

  const originTotal = inlandTransportCost + exportDocumentationCost;
  const cifTotal = roundMoney(fobSubtotal + originTotal + freightCost + insuranceCost);
  const lowCifTotal = roundMoney(fobSubtotal + originTotal + lowFreight + lowInsurance);
  const highCifTotal = roundMoney(fobSubtotal + originTotal + highFreight + highInsurance);
  const vehicleTypes = [...new Set(items.map((item) => vehicleClass(item).label))];
  const rateBasis = rate.basis;

  return {
    country: destination.country,
    port: selectedPort?.name ?? "Other / To be confirmed",
    vehicleCount,
    vehicleTypes,
    rateBasis,
    rateDate: routeData.fetchedAt,
    routeFreightPerStandardCar: rate.freightUsd,
    insuranceRate: rate.insuranceRate,
    fobSubtotal,
    exportClearance,
    originHandling,
    documentation,
    billOfLading,
    inlandTransportCost,
    exportDocumentationCost,
    freightCost,
    lowFreightCost: lowFreight,
    highFreightCost: highFreight,
    insuranceCost,
    cifTotal,
    lowCifTotal,
    highCifTotal,
    estimateNote:
      rateBasis === "published-route-range"
        ? "Indicative route benchmark and midpoint; carrier, sailing, vehicle dimensions and insurance underwriting determine the final amount."
        : "Indicative regional route estimate where a published country route was unavailable; final amount requires carrier and insurer confirmation.",
  };
}
