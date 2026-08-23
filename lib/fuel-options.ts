export type FuelPreference = "Diesel" | "Gasoline" | "Hybrid" | "Electric";

export const FUEL_OPTIONS: readonly { value: FuelPreference; label: string }[] = [
  { value: "Diesel", label: "Diesel" },
  { value: "Gasoline", label: "Gasoline" },
  { value: "Hybrid", label: "Hybrid" },
  { value: "Electric", label: "Electric" },
] as const;

export function normalizeFuelPreference(value: unknown): FuelPreference {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";

  if (normalized.includes("electric") || normalized === "ev") return "Electric";
  if (normalized.includes("hybrid")) return "Hybrid";
  if (normalized.includes("diesel")) return "Diesel";
  if (normalized.includes("gasoline") || normalized.includes("petrol")) return "Gasoline";
  return "Diesel";
}

export function fuelChoiceLabel(value?: string | null): string {
  if (value == null || value.trim() === "") return "Diesel";
  return normalizeFuelPreference(value);
}
