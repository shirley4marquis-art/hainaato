import type { DocumentLanguage } from "./types";

type Translation = readonly [string, string, string];

const LABELS: Record<string, Translation> = {
  "stock id": ["Stock ID", "Código de inventario", "库存编号"],
  "stock code": ["Stock ID", "Código de inventario", "库存编号"],
  "inventory code": ["Stock ID", "Código de inventario", "库存编号"],
  "codigo de inventario": ["Stock ID", "Código de inventario", "库存编号"],
  "vehicle condition": ["Condition", "Estado", "车况"],
  condition: ["Condition", "Estado", "车况"],
  "exterior color": ["Exterior colour", "Color exterior", "外观颜色"],
  "exterior colour": ["Exterior colour", "Color exterior", "外观颜色"],
  color: ["Exterior colour", "Color exterior", "外观颜色"],
  "interior color": ["Interior colour", "Color interior", "内饰颜色"],
  "interior colour": ["Interior colour", "Color interior", "内饰颜色"],
  engine: ["Engine", "Motor", "发动机"],
  displacement: ["Engine displacement", "Cilindrada", "发动机排量"],
  cilindrada: ["Engine displacement", "Cilindrada", "发动机排量"],
  "engine displacement": ["Engine displacement", "Cilindrada", "发动机排量"],
  fuel: ["Fuel / powertrain", "Combustible / motor", "燃料 / 动力"],
  combustible: ["Fuel / powertrain", "Combustible / motor", "燃料 / 动力"],
  "tipo de combustible": ["Fuel / powertrain", "Combustible / motor", "燃料 / 动力"],
  "fuel type": ["Fuel / powertrain", "Combustible / motor", "燃料 / 动力"],
  "energy type": ["Fuel / powertrain", "Combustible / motor", "燃料 / 动力"],
  transmission: ["Transmission", "Transmisión", "变速箱"],
  transmision: ["Transmission", "Transmisión", "变速箱"],
  "caja de cambios": ["Transmission", "Transmisión", "变速箱"],
  gearbox: ["Transmission", "Transmisión", "变速箱"],
  "drive type": ["Drivetrain", "Tracción", "驱动方式"],
  traccion: ["Drivetrain", "Tracción", "驱动方式"],
  drivetrain: ["Drivetrain", "Tracción", "驱动方式"],
  mileage: ["Mileage (km)", "Kilometraje (km)", "里程 (km)"],
  kilometraje: ["Mileage (km)", "Kilometraje (km)", "里程 (km)"],
  odometer: ["Mileage (km)", "Kilometraje (km)", "里程 (km)"],
  "mileage (km)": ["Mileage (km)", "Kilometraje (km)", "里程 (km)"],
  capacity: ["Seating capacity", "Capacidad de pasajeros", "乘坐人数"],
  seats: ["Seating capacity", "Capacidad de pasajeros", "乘坐人数"],
  "passenger capacity": ["Seating capacity", "Capacidad de pasajeros", "乘坐人数"],
  "body type": ["Body type", "Tipo de carrocería", "车身类型"],
  carroceria: ["Body type", "Tipo de carrocería", "车身类型"],
  body: ["Body type", "Tipo de carrocería", "车身类型"],
  "maximum power": ["Maximum power", "Potencia máxima", "最大功率"],
  "potencia maxima": ["Maximum power", "Potencia máxima", "最大功率"],
  "max power": ["Maximum power", "Potencia máxima", "最大功率"],
  horsepower: ["Power (hp)", "Potencia (hp)", "功率 (hp)"],
  "power (hp)": ["Power (hp)", "Potencia (hp)", "功率 (hp)"],
  "fuel consumption": ["Fuel consumption", "Consumo de combustible", "油耗"],
  "battery range": ["Electric range", "Autonomía eléctrica", "纯电续航"],
  "electric range": ["Electric range", "Autonomía eléctrica", "纯电续航"],
  "max speed": ["Maximum speed", "Velocidad máxima", "最高车速"],
  "maximum speed": ["Maximum speed", "Velocidad máxima", "最高车速"],
  "vehicle dimensions": ["Vehicle dimensions", "Dimensiones del vehículo", "车辆尺寸"],
  dimensions: ["Dimensions", "Dimensiones", "尺寸"],
  "wheelbase (mm)": ["Wheelbase (mm)", "Distancia entre ejes (mm)", "轴距 (mm)"],
  "front suspension": ["Front suspension", "Suspensión delantera", "前悬架"],
  "rear suspension": ["Rear suspension", "Suspensión trasera", "后悬架"],
  "brake system": ["Brake system", "Sistema de frenos", "制动系统"],
  airbags: ["Airbags", "Airbags", "安全气囊"],
  "vehicle overview": ["Vehicle overview", "Descripción del vehículo", "车辆介绍"],
  location: ["Vehicle location", "Ubicación del vehículo", "车辆所在地"],
  availability: ["Availability", "Disponibilidad", "库存状态"],
};

const VALUES: Record<string, Translation> = {
  new: ["New", "Nuevo", "新车"],
  used: ["Used", "Usado", "二手车"],
  gasoline: ["Gasoline", "Gasolina", "汽油"],
  petrol: ["Gasoline", "Gasolina", "汽油"],
  diesel: ["Diesel", "Diésel", "柴油"],
  electric: ["Electric", "Eléctrico", "纯电动"],
  "pure electric": ["Electric", "Eléctrico", "纯电动"],
  hybrid: ["Hybrid", "Híbrido", "混合动力"],
  "plug-in hybrid": ["Plug-in hybrid", "Híbrido enchufable", "插电式混合动力"],
  automatic: ["Automatic", "Automática", "自动"],
  manual: ["Manual", "Manual", "手动"],
  cvt: ["CVT automatic", "Automática CVT", "CVT无级变速"],
  "front wheel drive": ["Front-wheel drive", "Tracción delantera", "前轮驱动"],
  "rear wheel drive": ["Rear-wheel drive", "Tracción trasera", "后轮驱动"],
  "all wheel drive": ["All-wheel drive", "Tracción total", "全轮驱动"],
  "four wheel drive": ["Four-wheel drive", "Tracción 4×4", "四轮驱动"],
  white: ["White", "Blanco", "白色"],
  black: ["Black", "Negro", "黑色"],
  silver: ["Silver", "Plateado", "银色"],
  gray: ["Gray", "Gris", "灰色"],
  grey: ["Gray", "Gris", "灰色"],
  blue: ["Blue", "Azul", "蓝色"],
  red: ["Red", "Rojo", "红色"],
  green: ["Green", "Verde", "绿色"],
  brown: ["Brown", "Marrón", "棕色"],
  orange: ["Orange", "Naranja", "橙色"],
  yellow: ["Yellow", "Amarillo", "黄色"],
  available: ["Available", "Disponible", "在售"],
  reserved: ["Reserved", "Reservado", "已预订"],
  sold: ["Sold", "Vendido", "已售"],
};

function normalized(value: string) {
  return value.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

function select(words: Translation, language: DocumentLanguage): string {
  if (language === "en") return words[0];
  if (language === "zh") return words[2];
  if (language === "es-zh") return `${words[1]} / ${words[2]}`;
  return words[1];
}

export function translateVehicleTerm(value: string, language: DocumentLanguage): string {
  const words = VALUES[normalized(value)];
  return words ? select(words, language) : value;
}

export function translateVehicleLabel(value: string, language: DocumentLanguage): string {
  const key = normalized(value).replace(/\s*\([^)]*\)\s*$/, (suffix) => suffix.toLowerCase().includes("km") || suffix.toLowerCase().includes("hp") ? suffix : "");
  const words = LABELS[key];
  return words ? select(words, language) : value;
}

export function translateSpecificationLines(specs: Record<string, unknown>, language: DocumentLanguage): string {
  return Object.entries(specs)
    .filter(([key, value]) => value != null && String(value).trim() && !/price|precio|seller|selling|margin|profit|adjustment|cost|价格|成本|利润/i.test(key))
    .map(([key, value]) => `${translateVehicleLabel(key, language)}: ${translateVehicleTerm(String(value), language)}`)
    .join("\n");
}

export function translateSpecificationText(text: string, language: DocumentLanguage): string {
  return text.split(/\s*·\s*|\n/).map((part) => {
    const match = part.match(/^\s*([^:]+):\s*(.*)$/);
    return match ? `${translateVehicleLabel(match[1], language)}: ${translateVehicleTerm(match[2], language)}` : part.trim();
  }).filter(Boolean).join("\n");
}
