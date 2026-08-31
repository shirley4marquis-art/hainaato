import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const site = "hongyu";
const USD_PER_CNY = 0.139;
// 25% below the previously published 70% sale-price rule.
const RECENT_LISTING_PRICE_FACTOR = 0.525;
const products = [
  {
    id: "jac-t9-hunter",
    title: "2025 JAC Hunter T9 2.0T Gasoline 4×4 Automatic",
    year: 2025,
    priceUsd: 11_000,
    finalPriceUsd: 9_500,
    stockCode: "HA-CN-JACT9-2025",
    color: "Red",
    transmission: "8-speed automatic",
    driveType: "4×4",
    overview: "Pickup JAC Hunter T9 nueva, con motor de gasolina turbo de 2.0 litros, tracción 4×4 y transmisión automática de ocho velocidades. Disponible para inspección, documentación de exportación y envío internacional mediante HainaAuto. El precio mostrado es desde y depende de la configuración final.",
    priceLabel: "Desde US$11,000",
    priceNote: "Rango publicado: US$11,000–25,000. El precio final depende de la versión, transmisión, tracción y configuración confirmadas en la cotización.",
    model: "Hunter T9",
    modelNumber: "HYS5137GYYZ3",
    torque: "360 N·m",
    dimensions: "5,620 × 1,965 × 1,920 mm",
    cargoBox: "1,810 × 1,590 × 470 mm",
    wheelbase: "3,400 mm",
    images: [
      "https://image.made-in-china.com/2f0j00eWoBUMkLAzbv/Hot-Selling-JAC-Pickup-T9-2-0t-4X4-4X2-6mt-8at-Hunter.webp",
      "https://image.made-in-china.com/2f0j00eiqMRNkJSgoB/Hot-Selling-JAC-Pickup-T9-2-0t-4X4-4X2-6mt-8at-Hunter.webp",
      "https://image.made-in-china.com/2f0j00sVkMfEoGgrce/Hot-Selling-JAC-Pickup-T9-2-0t-4X4-4X2-6mt-8at-Hunter.webp",
      "https://image.made-in-china.com/2f0j00jhqMfucyfgoC/Hot-Selling-JAC-Pickup-T9-2-0t-4X4-4X2-6mt-8at-Hunter.webp",
      "https://image.made-in-china.com/2f0j00ShcMRioqErke/Hot-Selling-JAC-Pickup-T9-2-0t-4X4-4X2-6mt-8at-Hunter.webp",
      "https://image.made-in-china.com/2f0j00SlcMYebzApqC/Hot-Selling-JAC-Pickup-T9-2-0t-4X4-4X2-6mt-8at-Hunter.webp",
    ],
  },
  {
    id: "jac-hunter-safety-4x4",
    title: "JAC Hunter Safety 2.0T Gasoline 4×4",
    year: null,
    priceUsd: 17_800,
    stockCode: "HA-CN-JACHUNTER-SAFETY",
    color: "White",
    transmission: "Manual/automatic option",
    driveType: "4×4",
    overview: "Pickup JAC Hunter Safety nueva para uso todoterreno, con motor de gasolina turbo de 2.0 litros, tracción 4×4 y cabina doble. Disponible con transmisión manual o automática, inspección previa y soporte completo de exportación mediante HainaAuto.",
    priceLabel: "US$17,800 por unidad",
    priceNote: "Precios publicados por volumen: US$17,500 para 2–4 unidades, US$16,800 para 5–19 y US$15,800 para 20 o más. Configuración final sujeta a cotización.",
    model: "Hunter Safety",
    modelNumber: "HFC1039",
    torque: "410 N·m",
    dimensions: "5,620 × 1,965 × 1,920 mm",
    cargoBox: "1,810 × 1,590 × 440 mm",
    wheelbase: "Consultar",
    images: [
      "https://image.made-in-china.com/2f0j00TzOBrSdsrgbW/JAC-Pickup-Hunter-Safety-off-Road-4X4-Diesel-New-Car-JAC-Truck-Auto.webp",
      "https://image.made-in-china.com/2f0j00tgFvuAwaZrci/JAC-Pickup-Hunter-Safety-off-Road-4X4-Diesel-New-Car-JAC-Truck-Auto.webp",
      "https://image.made-in-china.com/2f0j00RpnBgYmynrch/JAC-Pickup-Hunter-Safety-off-Road-4X4-Diesel-New-Car-JAC-Truck-Auto.webp",
      "https://image.made-in-china.com/2f0j00UuFBgDmRHrcV/JAC-Pickup-Hunter-Safety-off-Road-4X4-Diesel-New-Car-JAC-Truck-Auto.webp",
      "https://image.made-in-china.com/2f0j00RzyCgowhnpci/JAC-Pickup-Hunter-Safety-off-Road-4X4-Diesel-New-Car-JAC-Truck-Auto.webp",
      "https://image.made-in-china.com/2f0j00fzOBgZwylubW/JAC-Pickup-Hunter-Safety-off-Road-4X4-Diesel-New-Car-JAC-Truck-Auto.webp",
    ],
  },
  {
    id: "jac-t8-pro-hunter-at",
    title: "JAC T8 Pro Hunter 2.0T Gasoline 4×4 with A/T Tires",
    year: null,
    priceUsd: 17_000,
    stockCode: "HA-CN-JACT8PRO-AT",
    color: "White",
    transmission: "Manual/automatic option",
    driveType: "4×4",
    overview: "Pickup JAC T8 Pro Hunter nueva con motor de gasolina turbo de 2.0 litros, tracción 4×4 y neumáticos todoterreno. Se ofrece con opciones de transmisión manual o automática, inspección previa y gestión integral de exportación mediante HainaAuto.",
    priceLabel: "US$17,000 por unidad",
    priceNote: "Precio publicado para una unidad. La transmisión, tracción, cabina y demás opciones deben confirmarse en la cotización final.",
    model: "T8 Pro Hunter",
    modelNumber: "HYS5139GYYZ3",
    torque: "410 N·m según configuración",
    dimensions: "5,630 × 1,860 × 1,865 mm",
    cargoBox: "1,805 × 1,580 × 440 mm",
    wheelbase: "Consultar",
    images: [
      "https://image.made-in-china.com/2f0j00IzBvbnuaYfqP/Real-Shipping-JAC-T8PRO-Hunter-4X4-Pickup-with-at-Tires-for-Sale.webp",
      "https://image.made-in-china.com/2f0j00hgBeYtlSJGoD/Real-Shipping-JAC-T8PRO-Hunter-4X4-Pickup-with-at-Tires-for-Sale.webp",
      "https://image.made-in-china.com/2f0j00hzveUrlcJGbH/Real-Shipping-JAC-T8PRO-Hunter-4X4-Pickup-with-at-Tires-for-Sale.webp",
      "https://image.made-in-china.com/2f0j00WuvMYiVJbfcI/Real-Shipping-JAC-T8PRO-Hunter-4X4-Pickup-with-at-Tires-for-Sale.webp",
      "https://image.made-in-china.com/2f0j00ipvMGBlgafcI/Real-Shipping-JAC-T8PRO-Hunter-4X4-Pickup-with-at-Tires-for-Sale.webp",
      "https://image.made-in-china.com/2f0j00VpCeYnlcbfkI/Real-Shipping-JAC-T8PRO-Hunter-4X4-Pickup-with-at-Tires-for-Sale.webp",
    ],
  },
];

const indexPath = path.join(root, "data", "vehicles-index.json");
const detailsPath = path.join(root, "data", "vehicle-details.json");
let index = JSON.parse(fs.readFileSync(indexPath, "utf8"));
const details = JSON.parse(fs.readFileSync(detailsPath, "utf8"));
const slugs = new Set(products.map((product) => `${site}-${product.id}`));
index = index.filter((vehicle) => !slugs.has(vehicle.slug));
const imported = [];

for (const product of products) {
  const slug = `${site}-${product.id}`;
  const imageDir = path.join(root, "public", "vehicle-images", site, product.id);
  fs.mkdirSync(imageDir, { recursive: true });
  const images = [];
  for (let imageIndex = 0; imageIndex < product.images.length; imageIndex += 1) {
    const file = `${String(imageIndex + 1).padStart(2, "0")}.webp`;
    const output = path.join(imageDir, file);
    if (!fs.existsSync(output)) {
      const response = await fetch(product.images[imageIndex], { headers: { "user-agent": "Mozilla/5.0" } });
      if (!response.ok) throw new Error(`${slug} photo ${imageIndex + 1} failed: ${response.status}`);
      await sharp(Buffer.from(await response.arrayBuffer()))
        .rotate()
        .resize({ width: 1400, height: 1050, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 84 })
        .toFile(output);
    }
    images.push(file);
  }

  // finalPriceUsd is an approved final CIF selling price and must not receive
  // the general catalogue reduction a second time.
  const discountedPriceUsd = product.finalPriceUsd != null
    ? product.finalPriceUsd
    : product.priceUsd * RECENT_LISTING_PRICE_FACTOR;
  const priceCNY = discountedPriceUsd / USD_PER_CNY;
  imported.push({
    slug, site, id: product.id, title: product.title, year: product.year, priceCNY,
    mileageKm: 0, fuel: "Gasoline", bodyType: "Pickup", location: "Hubei, China",
    thumb: images[0], thumbs: images.slice(0, 4), imageCount: images.length, color: product.color,
    brand: "JAC", model: product.model, condition: "new", availability: "available",
    transmission: product.transmission, stockCode: product.stockCode, listedAt: new Date().toISOString(),
  });
  details[slug] = {
    slug, site, id: product.id, url: null, title: product.title, year: product.year, priceCNY,
    msrpCNY: null, mileageKm: 0, fuel: "Gasoline", bodyType: "Pickup",
    gearbox: product.transmission, color: product.color, location: "Hubei, China",
    driveType: product.driveType, overview: product.overview,
    specs: {
      "Código de inventario": product.stockCode, Marca: "JAC", Modelo: product.model,
      "Modelo de fábrica": product.modelNumber, Año: product.year ? String(product.year) : "Consultar",
      Condición: "Nuevo", Motor: "2.0 L turbo gasoline, 4 cylinders", Potencia: "170 hp / 125 kW",
      Torque: product.torque, Transmisión: product.transmission, Tracción: product.driveType,
      Dirección: "Volante a la izquierda", Asientos: "5", Emisiones: "Euro 6",
      Dimensiones: product.dimensions, Distancia_entre_ejes: product.wheelbase,
      Caja_de_carga: product.cargoBox, Velocidad_máxima: "150 km/h", Garantía: "12 meses",
    },
    images, otherColorPhotos: [],
  };
}

// The white T9 is a colour-specific clone maintained by the companion import
// script. Keep its price synchronized with the red base listing whenever this
// importer is rerun.
const t9Base = imported.find((vehicle) => vehicle.slug === "hongyu-jac-t9-hunter");
const t9WhiteSlug = "hongyu-jac-t9-hunter-white";
const t9WhiteIndex = index.find((vehicle) => vehicle.slug === t9WhiteSlug);
if (t9Base && t9WhiteIndex && details[t9WhiteSlug]) {
  t9WhiteIndex.priceCNY = t9Base.priceCNY;
  details[t9WhiteSlug].priceCNY = t9Base.priceCNY;
}

fs.writeFileSync(indexPath, JSON.stringify([...imported, ...index]));
fs.writeFileSync(detailsPath, JSON.stringify(details));
console.log(`Imported ${imported.length} Hongyu JAC pickups with ${imported.reduce((sum, vehicle) => sum + vehicle.imageCount, 0)} local photos.`);
