import type { Vehicle, VehicleIndexEntry } from "./format";
import { fuelChoiceLabel } from "./fuel-options";

export type DocumentDetailRow = {
  label: string;
  value: string;
};

const UNKNOWN = "To be confirmed";

const HIGHLIGHTED_BUS_CONFIGURATION: DocumentDetailRow[] = [
  { label: "Transmission", value: "FAST gear box" },
  { label: "Clutch", value: "Diaphragm type clutch" },
  { label: "Front axle", value: "Drum brake" },
  { label: "Rear axle", value: "Drum brake" },
  { label: "Suspension", value: "Less-leaf spring" },
  { label: "Steering", value: "Integral power steering" },
  { label: "Braking", value: "Air controlled dual-circuit brakes; energy storage spring parking brakes" },
  { label: "Oil tank", value: "85L" },
  { label: "Tire", value: "215/75R17.5" },
  { label: "Other chassis equipment", value: "Dryer, air brake, clutch booster" },
  { label: "Body structure", value: "Rectangular hollow section welded" },
  { label: "Interior trimming", value: "Molding interior trim" },
  { label: "Door & pump", value: "Pneumatic folding door" },
  { label: "Wind screen / side window", value: "Sliding windows" },
  { label: "Rearview system", value: "Shaped rear-view mirror, inside mirror" },
  { label: "A/C system", value: "Air condition" },
  { label: "Entertainment system", value: "MP5 + reverse image" },
  { label: "Wiper", value: "Wiper" },
  { label: "Seats", value: "PU seats (black)" },
  { label: "Paint", value: "Metallic paint (gold)" },
  { label: "Other body equipment", value: "Sun visor, electric clock, luxury floor cover" },
  { label: "FOB", value: "29,700 USD" },
];

const CONFIG_KEYS: Array<[string, RegExp[]]> = [
  ["Transmission", [/^transmission$/i, /gearbox/i]],
  ["Clutch", [/clutch/i]],
  ["Front axle", [/front axle/i]],
  ["Rear axle", [/rear axle/i]],
  ["Suspension", [/suspension/i]],
  ["Steering", [/steering/i]],
  ["Braking", [/brak(e|ing)/i]],
  ["Oil tank", [/oil tank/i, /fuel tank/i]],
  ["Tire", [/^tire$/i, /^tyre$/i, /tire size/i, /tyre size/i]],
  ["Body structure", [/body structure/i]],
  ["Interior trimming", [/interior trimming/i, /interior trim/i]],
  ["Door & pump", [/door.*pump/i, /pneumatic.*door/i]],
  ["Wind screen / side window", [/wind\s*screen/i, /side window/i, /window/i]],
  ["Rearview system", [/rearview/i, /rear-view/i, /mirror/i]],
  ["A/C system", [/^a\/c/i, /air condition/i]],
  ["Entertainment system", [/entertainment/i, /reverse image/i, /mp5/i]],
  ["Wiper", [/wiper/i]],
  ["Seats", [/seat/i, /capacity/i]],
  ["Paint", [/paint/i, /body color/i, /exterior color/i]],
  ["Other body equipment", [/sun visor/i, /electric clock/i, /floor cover/i]],
];

function textForMatch(vehicle: Vehicle, indexEntry?: VehicleIndexEntry | null): string {
  return [
    vehicle.title,
    vehicle.overview,
    vehicle.bodyType,
    vehicle.url,
    indexEntry?.brand,
    indexEntry?.model,
    Object.entries(vehicle.specs).map(([key, value]) => `${key} ${value}`).join(" "),
  ].filter(Boolean).join(" ").toLowerCase();
}

function findSpec(specs: Record<string, string>, tests: RegExp[]): string | null {
  for (const [key, value] of Object.entries(specs)) {
    if (!value) continue;
    if (tests.some((test) => test.test(key))) return value;
  }
  return null;
}

function hasHighlightedBusSpec(vehicle: Vehicle, indexEntry?: VehicleIndexEntry | null): boolean {
  const text = textForMatch(vehicle, indexEntry);
  return /md\s*6772|md6772|eqb\s*140|eqb140|30\+1|zhengzhou cooper/i.test(text);
}

export function buildVehicleConfigurationRows(vehicle: Vehicle, indexEntry?: VehicleIndexEntry | null): DocumentDetailRow[] {
  if (hasHighlightedBusSpec(vehicle, indexEntry)) return HIGHLIGHTED_BUS_CONFIGURATION;

  return CONFIG_KEYS.map(([label, tests]) => {
    const value =
      findSpec(vehicle.specs, tests) ??
      (label === "Transmission" ? indexEntry?.transmission ?? vehicle.gearbox : null) ??
      (label === "Seats" ? findSpec(vehicle.specs, [/capacity/i]) : null) ??
      (label === "Paint" ? vehicle.color : null) ??
      UNKNOWN;
    return { label, value };
  });
}

export function buildVehicleFactRows(vehicle: Vehicle, indexEntry: VehicleIndexEntry): DocumentDetailRow[] {
  return [
    { label: "Make", value: indexEntry.brand || UNKNOWN },
    { label: "Model", value: indexEntry.model || UNKNOWN },
    { label: "Year", value: vehicle.year?.toString() ?? UNKNOWN },
    { label: "Condition", value: indexEntry.condition || UNKNOWN },
    { label: "Fuel", value: fuelChoiceLabel(vehicle.fuel) || UNKNOWN },
    { label: "Transmission", value: indexEntry.transmission ?? vehicle.gearbox ?? UNKNOWN },
    { label: "Drivetrain", value: vehicle.driveType ?? UNKNOWN },
    { label: "Body type", value: vehicle.bodyType ?? UNKNOWN },
    { label: "Exterior color", value: vehicle.color ?? UNKNOWN },
    { label: "Interior color", value: vehicle.specs["Interior Color"] ?? UNKNOWN },
    { label: "Engine / displacement", value: vehicle.specs.Displacement ?? vehicle.specs.Engine ?? UNKNOWN },
    { label: "Location", value: vehicle.location ?? "China" },
  ];
}

export function formatRowsForHistory(rows: DocumentDetailRow[]): string {
  return rows.map((row) => `${row.label}: ${row.value}`).join("\n");
}

export function parseHistoryRows(value: string | null | undefined): DocumentDetailRow[] {
  if (!value) return [];
  return value
    .split(/\r?\n/)
    .map((line) => {
      const index = line.indexOf(":");
      if (index < 1) return null;
      const label = line.slice(0, index).trim();
      const detail = line.slice(index + 1).trim();
      return label && detail ? { label, value: detail } : null;
    })
    .filter((row): row is DocumentDetailRow => row !== null);
}
