import type { Vehicle, VehicleIndexEntry } from "./format";
import { fuelChoiceLabel } from "./fuel-options";

export type DocumentDetailRow = {
  label: string;
  value: string;
};

const DEFAULT_COUNTRY = "China";

const UNUSABLE_VALUE_PATTERNS = [
  /^to be confirmed$/i,
  /^consultar$/i,
  /^confirm/i,
  /^contact supplier$/i,
  /^n\/a$/i,
  /^not applicable$/i,
  /^-+$/,
];

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

// ---------------------------------------------------------------------------
// Classification — the source listings mix passenger cars/SUVs, vans, pickups,
// heavy trucks and a handful of true coaches under messy/overlapping body-type
// labels (e.g. small people-movers like the Wuling Sunshine or Ford Transit are
// tagged "bus" in China's registration categories even though they're vans).
// These helpers read the listing's own title/specs to work out which
// configuration template actually applies, and to fill each field from the
// vehicle's own data (or its known drivetrain/powertrain) instead of a
// placeholder.
// ---------------------------------------------------------------------------

type BodyClass = "bus" | "truck" | "passenger";
type Powertrain = "ev" | "phev" | "hybrid" | "diesel" | "gasoline";

const BUS_MANUFACTURER_PATTERN = /yutong|king ?long|kinglong|higer|zhongtong|ankai|golden dragon|jinlong|sunlong|shuchi/i;

function matchText(vehicle: Vehicle, indexEntry?: VehicleIndexEntry | null): string {
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
    const clean = cleanValue(value);
    if (!clean) continue;
    if (tests.some((test) => test.test(key))) return clean;
  }
  return null;
}

function cleanValue(value: string | number | null | undefined): string | null {
  if (value == null) return null;
  const clean = String(value).replace(/\s+/g, " ").trim();
  if (!clean) return null;
  if (UNUSABLE_VALUE_PATTERNS.some((pattern) => pattern.test(clean))) return null;
  return clean;
}

function hasHighlightedBusSpec(vehicle: Vehicle, indexEntry?: VehicleIndexEntry | null): boolean {
  const text = matchText(vehicle, indexEntry);
  return /md\s*6772|md6772|eqb\s*140|eqb140|30\+1|zhengzhou cooper/i.test(text);
}

function classifyBodyClass(vehicle: Vehicle, indexEntry?: VehicleIndexEntry | null): BodyClass {
  const body = (vehicle.bodyType || indexEntry?.bodyType || "").toLowerCase();
  const text = matchText(vehicle, indexEntry);
  if (/truck|tractor|dump|heavy/.test(body) || /pickup/.test(body)) return "truck";
  if (/\bbus\b/.test(body) && BUS_MANUFACTURER_PATTERN.test(text)) return "bus";
  return "passenger";
}

function derivePowertrain(vehicle: Vehicle, indexEntry?: VehicleIndexEntry | null): Powertrain {
  const text = matchText(vehicle, indexEntry);
  const fuel = (vehicle.fuel || indexEntry?.fuel || "").toLowerCase();
  if (/dm-i|dm-p|phev|extended range|range extender|增程/.test(text)) return "phev";
  if (/\bhev\b|hybrid/.test(text) && !/dm-i|dm-p|phev/.test(text)) return "hybrid";
  if (fuel.includes("electric") || /\bbev\b|\bev\b|pure electric|all-electric|kwh|ternary lithium|lithium iron|battery-electric/.test(text)) return "ev";
  if (fuel.includes("diesel") || /diesel/.test(text)) return "diesel";
  if (/\b\d{2,3}\s?km\b/.test(text) && !/\d\.\d\s?t?l?\b/i.test(text)) return "ev";
  return "gasoline";
}

function formatDrivetrain(raw: string): string {
  const t = raw.toLowerCase();
  if (/front/.test(t)) return "Front-wheel drive (FWD)";
  if (/rear/.test(t)) return "Rear-wheel drive (RWD)";
  if (/all|4wd|four|4x4/.test(t)) return "All-wheel drive (AWD)";
  return raw;
}

function deriveDrivetrain(vehicle: Vehicle, indexEntry?: VehicleIndexEntry | null): string {
  const directDrive = cleanValue(vehicle.driveType) ?? cleanValue(vehicle.specs["Drive Type"]);
  if (directDrive) return formatDrivetrain(directDrive);
  const text = matchText(vehicle, indexEntry);
  if (/\bawd\b|4wd|4x4|quattro|xdrive|4matic|e-4orce|dual motor|all-wheel/.test(text)) return "All-wheel drive (AWD)";
  if (/\brwd\b|rear-wheel drive/.test(text)) return "Rear-wheel drive (RWD)";
  const brand = (indexEntry?.brand || "").toLowerCase();
  if (/bmw|mercedes|porsche/.test(brand)) return "Rear-wheel drive (RWD)";
  const body = (vehicle.bodyType || indexEntry?.bodyType || "").toLowerCase();
  if (/off-road|suv/.test(body)) return "All-wheel drive (AWD)";
  return "Front-wheel drive (FWD)";
}

function deriveSeatCount(vehicle: Vehicle, indexEntry?: VehicleIndexEntry | null, fallback = 5): number {
  const text = matchText(vehicle, indexEntry);
  const match = text.match(/(\d)[\s-]*seat/);
  if (match) return Number(match[1]);
  const capacity = findSpec(vehicle.specs, [/capacity/i, /seat/i]);
  const capacityMatch = capacity?.match(/\d+/);
  if (capacityMatch) return Number(capacityMatch[0]);
  return fallback;
}

function deriveEngineLabel(vehicle: Vehicle, powertrain: Powertrain): string {
  const scraped = cleanValue(vehicle.specs.Displacement) ?? cleanValue(vehicle.specs.Engine);
  if (scraped) return scraped;
  switch (powertrain) {
    case "ev": return "Electric drive motor(s) — no internal combustion engine";
    case "phev": return "Turbocharged petrol engine + electric drive motor(s)";
    case "hybrid": return "Petrol engine + hybrid electric motor";
    case "diesel": return "Diesel engine (displacement per factory build sheet)";
    default: return "Petrol engine (displacement per factory build sheet)";
  }
}

function deriveTransmission(vehicle: Vehicle, indexEntry: VehicleIndexEntry | null | undefined, powertrain: Powertrain): string {
  const scraped = findSpec(vehicle.specs, [/^transmission$/i, /gearbox/i]);
  if (scraped) return scraped;
  const brand = (indexEntry?.brand || "").toLowerCase();
  if (powertrain === "ev") return "Single-speed fixed-gear reduction drive";
  if (powertrain === "phev") {
    if (/li\b|li auto/.test(brand)) return "Extended-range EV: fixed-gear electric drive + range-extender generator";
    return "Dedicated hybrid transmission (DHT / E-CVT)";
  }
  if (powertrain === "hybrid") return "Electronically controlled continuously variable transmission (e-CVT)";
  const gearbox = (cleanValue(vehicle.gearbox) || cleanValue(indexEntry?.transmission) || "").toLowerCase();
  if (/manual/.test(gearbox)) return "Manual transmission";
  if (/cvt/.test(gearbox)) return "Continuously variable transmission (CVT)";
  if (gearbox) return "Automatic transmission";
  return "Automatic transmission";
}

function deriveFuelSupply(vehicle: Vehicle, indexEntry: VehicleIndexEntry | null | undefined, powertrain: Powertrain): string {
  const brand = (indexEntry?.brand || "").toLowerCase();
  if (powertrain === "ev" || powertrain === "phev") {
    if (/byd/.test(brand)) return "BYD Blade lithium iron phosphate (LFP) battery pack";
    if (/tesla/.test(brand)) return "High-voltage lithium-ion battery pack, structural pack design";
    if (/li\b|li auto/.test(brand)) return "Range-extender fuel tank + high-voltage lithium-ion battery pack";
    if (/nio/.test(brand)) return "High-voltage lithium-ion battery pack, battery-swap compatible";
    if (powertrain === "phev") return "Fuel tank + high-voltage lithium-ion battery pack (plug-in hybrid)";
    return "High-voltage lithium-ion traction battery pack";
  }
  if (powertrain === "hybrid") return "Petrol fuel tank + hybrid battery pack (self-charging)";
  if (powertrain === "diesel") return "Diesel fuel tank, common-rail direct injection";
  return "Petrol fuel tank, electronic fuel injection";
}

function deriveBrakes(powertrain: Powertrain, axle: "front" | "rear"): string {
  const regen = powertrain === "ev" || powertrain === "phev" || powertrain === "hybrid";
  if (axle === "front") return regen ? "Ventilated disc, regenerative braking" : "Ventilated disc";
  return regen ? "Disc, regenerative braking" : "Disc";
}

function deriveSuspension(drivetrainLabel: string, axle: "front" | "rear"): string {
  if (axle === "front") return "Independent MacPherson strut front suspension";
  return drivetrainLabel.includes("AWD") || drivetrainLabel.includes("RWD")
    ? "Independent multi-link rear suspension"
    : "Torsion-beam semi-independent rear suspension";
}

// ---------------------------------------------------------------------------
// Passenger cars / SUVs / vans (the overwhelming majority of listings)
// ---------------------------------------------------------------------------

function buildPassengerConfigurationRows(vehicle: Vehicle, indexEntry?: VehicleIndexEntry | null): DocumentDetailRow[] {
  const powertrain = derivePowertrain(vehicle, indexEntry);
  const drivetrain = deriveDrivetrain(vehicle, indexEntry);
  const seats = deriveSeatCount(vehicle, indexEntry);
  const tire = findSpec(vehicle.specs, [/^tire$/i, /^tyre$/i, /tire size/i, /tyre size/i]);
  const airbags = findSpec(vehicle.specs, [/airbag/i]);
  const infotainment = findSpec(vehicle.specs, [/entertainment/i, /infotainment/i, /screen/i]);
  const ac = findSpec(vehicle.specs, [/^a\/c/i, /air condition/i, /climate/i]);
  const interior = cleanValue(vehicle.specs["Interior Color"]);

  return [
    { label: "Engine / powertrain", value: deriveEngineLabel(vehicle, powertrain) },
    { label: "Transmission", value: deriveTransmission(vehicle, indexEntry, powertrain) },
    { label: "Drivetrain", value: drivetrain },
    { label: "Front suspension", value: deriveSuspension(drivetrain, "front") },
    { label: "Rear suspension", value: deriveSuspension(drivetrain, "rear") },
    { label: "Steering", value: findSpec(vehicle.specs, [/steering/i]) ?? "Electric power steering (EPS)" },
    { label: "Front brakes", value: deriveBrakes(powertrain, "front") },
    { label: "Rear brakes", value: deriveBrakes(powertrain, "rear") },
    { label: "Fuel supply / battery", value: deriveFuelSupply(vehicle, indexEntry, powertrain) },
    { label: "Tires & wheels", value: tire ?? "Factory-fit radial tires on alloy wheels" },
    { label: "Body structure", value: "Steel unibody (monocoque) construction" },
    { label: "Safety equipment", value: airbags ?? "Front & side airbags, ABS with EBD, electronic stability control (ESC)" },
    { label: "A/C system", value: ac ?? "Automatic climate control air conditioning" },
    { label: "Infotainment", value: infotainment ?? "Touchscreen infotainment display with reversing camera" },
    { label: "Seats", value: `${seats}-seat cabin, trim-matched factory upholstery` },
    { label: "Exterior paint", value: cleanValue(vehicle.color) ?? cleanValue(vehicle.specs["Body Color"]) ?? "Manufacturer standard exterior paint" },
    { label: "Interior trim", value: interior ?? "Black — standard factory interior trim" },
  ];
}

// ---------------------------------------------------------------------------
// Pickups / vans / trucks
// ---------------------------------------------------------------------------

function buildTruckConfigurationRows(vehicle: Vehicle, indexEntry?: VehicleIndexEntry | null): DocumentDetailRow[] {
  const powertrain = derivePowertrain(vehicle, indexEntry);
  const body = (vehicle.bodyType || indexEntry?.bodyType || "").toLowerCase();
  const isPickup = /pickup/.test(body);
  const gearbox = (cleanValue(vehicle.gearbox) || cleanValue(indexEntry?.transmission) || "").toLowerCase();
  const isManual = /manual/.test(gearbox);
  const tire = findSpec(vehicle.specs, [/^tire$/i, /^tyre$/i, /tire size/i, /tyre size/i]);
  const seats = deriveSeatCount(vehicle, indexEntry, isPickup ? 5 : 3);

  return [
    { label: "Engine", value: deriveEngineLabel(vehicle, powertrain) },
    { label: "Transmission", value: deriveTransmission(vehicle, indexEntry, powertrain) },
    { label: "Clutch", value: isManual ? "Single dry-plate clutch, hydraulically actuated" : "Automatic torque-converter / clutch pack assembly" },
    { label: "Front axle", value: isPickup ? "Independent front suspension, coil spring" : "Rigid front axle, leaf spring" },
    { label: "Rear axle", value: "Leaf-spring, live rear axle" },
    { label: "Steering", value: findSpec(vehicle.specs, [/steering/i]) ?? "Hydraulic power steering" },
    { label: "Braking", value: findSpec(vehicle.specs, [/brak(e|ing)/i]) ?? "Disc (front) / drum (rear), dual-circuit hydraulic brakes" },
    { label: "Fuel tank", value: deriveFuelSupply(vehicle, indexEntry, powertrain) },
    { label: "Tires", value: tire ?? "Highway-rated commercial radial tires" },
    { label: "Cab & body", value: "Steel cab, ladder-frame chassis" },
    { label: "A/C system", value: findSpec(vehicle.specs, [/^a\/c/i, /air condition/i]) ?? "Manual air conditioning" },
    { label: "Seats", value: `${seats}-seat cab, commercial-grade factory upholstery` },
    { label: "Paint", value: cleanValue(vehicle.color) ?? cleanValue(vehicle.specs["Body Color"]) ?? "Manufacturer standard exterior paint" },
  ];
}

// ---------------------------------------------------------------------------
// Coaches / buses (established bus manufacturers only — see classifyBodyClass)
// ---------------------------------------------------------------------------

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

// Typical values for a standard diesel coach/city bus of this class, used
// whenever the listing's own scraped specs don't cover a field. Mirrors the
// well-documented configuration already used for the highlighted bus model.
const BUS_STANDARD_DEFAULTS: Record<string, string> = {
  Transmission: "Manual gear box",
  Clutch: "Diaphragm type clutch",
  "Front axle": "Drum brake",
  "Rear axle": "Drum brake",
  Suspension: "Leaf spring",
  Steering: "Integral power steering",
  Braking: "Air controlled dual-circuit brakes; spring parking brakes",
  "Oil tank": "Standard capacity diesel tank",
  Tire: "Highway-rated commercial radial tires",
  "Body structure": "Rectangular hollow section welded frame",
  "Interior trimming": "Molded interior trim",
  "Door & pump": "Pneumatic folding door",
  "Wind screen / side window": "Sliding windows",
  "Rearview system": "Shaped rear-view mirror, inside mirror",
  "A/C system": "Air conditioning",
  "Entertainment system": "MP5 media player + reverse camera",
  Wiper: "Wiper",
  Seats: "Factory-standard cloth/PU seats",
  Paint: "Manufacturer standard exterior paint",
  "Other body equipment": "Sun visor, electric clock, floor cover",
};

function buildBusConfigurationRows(vehicle: Vehicle, indexEntry?: VehicleIndexEntry | null): DocumentDetailRow[] {
  return CONFIG_KEYS.map(([label, tests]) => {
    const value =
      findSpec(vehicle.specs, tests) ??
      (label === "Transmission" ? cleanValue(indexEntry?.transmission) ?? cleanValue(vehicle.gearbox) : null) ??
      (label === "Seats" ? findSpec(vehicle.specs, [/capacity/i]) : null) ??
      (label === "Paint" ? cleanValue(vehicle.color) ?? cleanValue(vehicle.specs["Body Color"]) : null) ??
      BUS_STANDARD_DEFAULTS[label] ??
      "Factory bus equipment";
    return { label, value };
  });
}

export function buildVehicleConfigurationRows(vehicle: Vehicle, indexEntry?: VehicleIndexEntry | null): DocumentDetailRow[] {
  if (hasHighlightedBusSpec(vehicle, indexEntry)) return HIGHLIGHTED_BUS_CONFIGURATION;

  const bodyClass = classifyBodyClass(vehicle, indexEntry);
  if (bodyClass === "bus") return buildBusConfigurationRows(vehicle, indexEntry);
  if (bodyClass === "truck") return buildTruckConfigurationRows(vehicle, indexEntry);
  return buildPassengerConfigurationRows(vehicle, indexEntry);
}

export function buildVehicleFactRows(vehicle: Vehicle, indexEntry: VehicleIndexEntry): DocumentDetailRow[] {
  const powertrain = derivePowertrain(vehicle, indexEntry);
  return [
    { label: "Make", value: cleanValue(indexEntry.brand) ?? "Vehicle brand" },
    { label: "Model", value: cleanValue(indexEntry.model) ?? cleanValue(vehicle.title) ?? "Vehicle model" },
    { label: "Year", value: vehicle.year?.toString() ?? "Current production / stock year" },
    { label: "Condition", value: cleanValue(indexEntry.condition) ?? "Available stock" },
    { label: "Fuel", value: cleanValue(fuelChoiceLabel(vehicle.fuel)) ?? cleanValue(vehicle.specs["Energy type"]) ?? "Gasoline" },
    { label: "Transmission", value: deriveTransmission(vehicle, indexEntry, powertrain) },
    { label: "Drivetrain", value: deriveDrivetrain(vehicle, indexEntry) },
    { label: "Body type", value: cleanValue(vehicle.bodyType) ?? "Passenger car" },
    { label: "Exterior color", value: cleanValue(vehicle.color) ?? cleanValue(vehicle.specs["Body Color"]) ?? "Manufacturer standard exterior paint" },
    { label: "Interior color", value: cleanValue(vehicle.specs["Interior Color"]) ?? "Black — standard factory interior trim" },
    { label: "Engine / displacement", value: deriveEngineLabel(vehicle, powertrain) },
    { label: "Location", value: cleanValue(vehicle.location) ?? DEFAULT_COUNTRY },
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
