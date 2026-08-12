import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const vehicles = JSON.parse(fs.readFileSync(path.join(root, "data", "vehicles-index.json"), "utf8"));
const destinations = [
  ["Ahmed", "Dubai, UAE"], ["Fatima", "Abu Dhabi, UAE"], ["Omar", "Riyadh, Saudi Arabia"],
  ["Amina", "Lagos, Nigeria"], ["Chinedu", "Abuja, Nigeria"], ["Samuel", "Nairobi, Kenya"],
  ["Ivan", "Moscow, Russia"], ["Alina", "Kazan, Russia"], ["Arman", "Almaty, Kazakhstan"],
  ["Dilnoza", "Tashkent, Uzbekistan"], ["Carlos", "Santiago, Chile"], ["Lucia", "Lima, Peru"],
  ["Mateo", "Mexico City, Mexico"], ["Kwame", "Accra, Ghana"], ["Thabo", "Johannesburg, South Africa"],
  ["Nour", "Muscat, Oman"], ["Youssef", "Casablanca, Morocco"], ["Giorgi", "Tbilisi, Georgia"],
  ["Marek", "Warsaw, Poland"], ["Minh", "Ho Chi Minh City, Vietnam"], ["Rizal", "Manila, Philippines"],
  ["Putri", "Jakarta, Indonesia"], ["Daniel", "Kingston, Jamaica"], ["Diego", "Bogota, Colombia"],
  ["Sofia", "Montevideo, Uruguay"]
];
const actions = ["reserved", "requested an inspection for", "received a shipping quote for", "completed a demo payment step for", "shortlisted"];
const sampleChainRecords = [
  "0x3bedf12d8c7b4ca40dc66d4d2f6043e0179b3e66a60cdc2c7c3a6d809a8f7720",
  "0x046ab2c53576afdb803899d4aa5a581d0e5b29dc35be9813696f5ebe952f7f90",
  "0xc86c561060695a37948c4a25fb0129a2fca2eea21b652376d19850bde728f94c",
  "0x1d06996dda2a07a5cd2c4c7bc97927fe6717c511f3f2b9d53ae020b25c108189"
];

const eligible = vehicles.filter((vehicle) => vehicle.availability === "available" && vehicle.thumb).slice(0, 500);
const events = Array.from({ length: 50 }, (_, index) => {
  const [firstName, location] = destinations[index % destinations.length];
  const vehicle = eligible[(index * 37 + 11) % eligible.length];
  const action = actions[index % actions.length];
  const isPaymentDemo = action.includes("payment");
  const hash = isPaymentDemo ? sampleChainRecords[index % sampleChainRecords.length] : null;
  return {
    id: `demo-activity-${String(index + 1).padStart(2, "0")}`,
    client: `${firstName} ${String.fromCharCode(65 + (index % 26))}.`,
    location,
    action,
    vehicle: vehicle.title,
    vehicleHref: `/vehicles/${vehicle.slug}`,
    occurredMinutesAgo: 2 + ((index * 13) % 179),
    transactionHash: hash,
    transactionUrl: hash ? `https://etherscan.io/tx/${hash}` : null,
    demo: true
  };
});

fs.writeFileSync(path.join(root, "data", "live-activity.json"), `${JSON.stringify(events, null, 2)}\n`);
console.log(`Generated ${events.length} demo live-activity records.`);
