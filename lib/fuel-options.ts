export type FuelPreference = "Gasoline" | "Diesel";

export const FUEL_OPTIONS: readonly { value: FuelPreference; label: string }[] = [
  { value: "Gasoline", label: "Gasoline" },
  { value: "Diesel", label: "Diesel" },
] as const;

export function normalizeFuelPreference(value: unknown): FuelPreference {
  return typeof value === "string" && value.trim().toLowerCase() === "diesel" ? "Diesel" : "Gasoline";
}

export function fuelChoiceLabel(): string {
  return "Gasoline primary / Diesel optional";
}
