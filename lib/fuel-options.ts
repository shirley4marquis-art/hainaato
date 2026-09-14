export type FuelPreference = "Diesel" | "Gasoline" | "Hybrid" | "Electric";

export const FUEL_OPTIONS: readonly { value: FuelPreference; label: string }[] = [
  { value: "Diesel", label: "Diesel" },
  { value: "Gasoline", label: "Gasoline" },
  { value: "Hybrid", label: "Hybrid" },
  { value: "Electric", label: "Electric" },
] as const;

export const ELECTRIC_ONLY_FUEL_OPTIONS: readonly { value: FuelPreference; label: string }[] = [
  { value: "Electric", label: "Electric" },
] as const;

export function isPureElectricVehicleFuel(value: unknown): boolean {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!normalized) return false;

  // A listing that combines a combustion engine with electric drive must
  // remain configurable as a hybrid rather than being treated as a BEV.
  if (/(hybrid|gasoline|petrol|diesel|range[- ]?extender|extended[- ]?range|erev)/.test(normalized)) {
    return false;
  }

  return normalized === "ev"
    || normalized === "bev"
    || normalized === "electric"
    || normalized === "pure electric"
    || normalized === "all-electric"
    || normalized === "all electric"
    || normalized === "battery electric";
}

export function fuelOptionsForVehicle(fuel: unknown): readonly { value: FuelPreference; label: string }[] {
  const standardFuel = isPureElectricVehicleFuel(fuel) ? "Electric" : normalizeFuelPreference(fuel);
  return FUEL_OPTIONS.filter((option) => option.value === standardFuel);
}

export function normalizeFuelPreference(value: unknown): FuelPreference {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";

  if (normalized.includes("hybrid")) return "Hybrid";
  if (normalized.includes("diesel")) return "Diesel";
  if (normalized.includes("gasoline") || normalized.includes("petrol")) return "Gasoline";
  if (normalized.includes("electric") || normalized === "ev") return "Electric";
  return "Diesel";
}

export function fuelChoiceLabel(value?: string | null): string {
  if (value == null || value.trim() === "") return "Diesel";
  return normalizeFuelPreference(value);
}
