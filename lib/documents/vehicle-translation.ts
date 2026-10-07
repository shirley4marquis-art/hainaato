import type { SpecificationLanguage } from "./types";

type Translation = readonly [english: string, spanish: string, chinese: string, russian: string];

const LABELS: Record<string, Translation> = {
  "stock id": ["Stock ID", "Código de inventario", "库存编号", "Номер в наличии"],
  "stock code": ["Stock ID", "Código de inventario", "库存编号", "Номер в наличии"],
  "inventory code": ["Stock ID", "Código de inventario", "库存编号", "Инвентарный номер"],
  "codigo de inventario": ["Stock ID", "Código de inventario", "库存编号", "Инвентарный номер"],
  "vehicle condition": ["Condition", "Estado", "车况", "Состояние"],
  condition: ["Condition", "Estado", "车况", "Состояние"],
  "exterior color": ["Exterior colour", "Color exterior", "外观颜色", "Цвет кузова"],
  "exterior colour": ["Exterior colour", "Color exterior", "外观颜色", "Цвет кузова"],
  color: ["Exterior colour", "Color exterior", "外观颜色", "Цвет кузова"],
  "interior color": ["Interior colour", "Color interior", "内饰颜色", "Цвет салона"],
  "interior colour": ["Interior colour", "Color interior", "内饰颜色", "Цвет салона"],
  engine: ["Engine", "Motor", "发动机", "Двигатель"],
  displacement: ["Engine displacement", "Cilindrada", "发动机排量", "Рабочий объём двигателя"],
  cilindrada: ["Engine displacement", "Cilindrada", "发动机排量", "Рабочий объём двигателя"],
  "engine displacement": ["Engine displacement", "Cilindrada", "发动机排量", "Рабочий объём двигателя"],
  fuel: ["Fuel / powertrain", "Combustible / motor", "燃料 / 动力", "Топливо / силовая установка"],
  combustible: ["Fuel / powertrain", "Combustible / motor", "燃料 / 动力", "Топливо / силовая установка"],
  "tipo de combustible": ["Fuel / powertrain", "Combustible / motor", "燃料 / 动力", "Топливо / силовая установка"],
  "fuel type": ["Fuel / powertrain", "Combustible / motor", "燃料 / 动力", "Тип топлива"],
  "energy type": ["Fuel / powertrain", "Combustible / motor", "燃料 / 动力", "Тип силовой установки"],
  transmission: ["Transmission", "Transmisión", "变速箱", "Коробка передач"],
  transmision: ["Transmission", "Transmisión", "变速箱", "Коробка передач"],
  "caja de cambios": ["Transmission", "Transmisión", "变速箱", "Коробка передач"],
  gearbox: ["Transmission", "Transmisión", "变速箱", "Коробка передач"],
  "drive type": ["Drivetrain", "Tracción", "驱动方式", "Тип привода"],
  traccion: ["Drivetrain", "Tracción", "驱动方式", "Тип привода"],
  drivetrain: ["Drivetrain", "Tracción", "驱动方式", "Тип привода"],
  mileage: ["Mileage (km)", "Kilometraje (km)", "里程 (km)", "Пробег (км)"],
  kilometraje: ["Mileage (km)", "Kilometraje (km)", "里程 (km)", "Пробег (км)"],
  odometer: ["Mileage (km)", "Kilometraje (km)", "里程 (km)", "Пробег (км)"],
  "mileage (km)": ["Mileage (km)", "Kilometraje (km)", "里程 (km)", "Пробег (км)"],
  capacity: ["Seating capacity", "Capacidad de pasajeros", "乘坐人数", "Количество мест"],
  seats: ["Seating capacity", "Capacidad de pasajeros", "乘坐人数", "Количество мест"],
  "passenger capacity": ["Seating capacity", "Capacidad de pasajeros", "乘坐人数", "Количество мест"],
  "body type": ["Body type", "Tipo de carrocería", "车身类型", "Тип кузова"],
  carroceria: ["Body type", "Tipo de carrocería", "车身类型", "Тип кузова"],
  body: ["Body type", "Tipo de carrocería", "车身类型", "Тип кузова"],
  "maximum power": ["Maximum power", "Potencia máxima", "最大功率", "Максимальная мощность"],
  "potencia maxima": ["Maximum power", "Potencia máxima", "最大功率", "Максимальная мощность"],
  "max power": ["Maximum power", "Potencia máxima", "最大功率", "Максимальная мощность"],
  horsepower: ["Power (hp)", "Potencia (hp)", "功率 (hp)", "Мощность (л. с.)"],
  "power (hp)": ["Power (hp)", "Potencia (hp)", "功率 (hp)", "Мощность (л. с.)"],
  "fuel consumption": ["Fuel consumption", "Consumo de combustible", "油耗", "Расход топлива"],
  "battery range": ["Electric range", "Autonomía eléctrica", "纯电续航", "Запас хода на электротяге"],
  "electric range": ["Electric range", "Autonomía eléctrica", "纯电续航", "Запас хода на электротяге"],
  "max speed": ["Maximum speed", "Velocidad máxima", "最高车速", "Максимальная скорость"],
  "maximum speed": ["Maximum speed", "Velocidad máxima", "最高车速", "Максимальная скорость"],
  "vehicle dimensions": ["Vehicle dimensions", "Dimensiones del vehículo", "车辆尺寸", "Габариты автомобиля"],
  dimensions: ["Dimensions", "Dimensiones", "尺寸", "Габариты"],
  "wheelbase (mm)": ["Wheelbase (mm)", "Distancia entre ejes (mm)", "轴距 (mm)", "Колёсная база (мм)"],
  "front suspension": ["Front suspension", "Suspensión delantera", "前悬架", "Передняя подвеска"],
  "rear suspension": ["Rear suspension", "Suspensión trasera", "后悬架", "Задняя подвеска"],
  "brake system": ["Brake system", "Sistema de frenos", "制动系统", "Тормозная система"],
  airbags: ["Airbags", "Airbags", "安全气囊", "Подушки безопасности"],
  "vehicle overview": ["Vehicle overview", "Descripción del vehículo", "车辆介绍", "Обзор автомобиля"],
  location: ["Vehicle location", "Ubicación del vehículo", "车辆所在地", "Местонахождение автомобиля"],
  availability: ["Availability", "Disponibilidad", "库存状态", "Наличие"],
  brand: ["Brand", "Marca", "品牌", "Марка"],
  make: ["Make", "Marca", "品牌", "Марка"],
  model: ["Model", "Modelo", "车型", "Модель"],
  year: ["Year", "Año", "年份", "Год выпуска"],
  "model year": ["Model year", "Año del modelo", "车型年份", "Модельный год"],
  steering: ["Steering", "Dirección", "方向盘", "Рулевое управление"],
  "steering position": ["Steering position", "Posición del volante", "方向盘位置", "Расположение руля"],
  doors: ["Doors", "Puertas", "车门", "Количество дверей"],
  "door count": ["Door count", "Número de puertas", "车门数", "Количество дверей"],
  registration: ["Registration date", "Fecha de registro", "登记日期", "Дата регистрации"],
  "registration date": ["Registration date", "Fecha de registro", "登记日期", "Дата регистрации"],
  "emission standard": ["Emission standard", "Norma de emisiones", "排放标准", "Экологический стандарт"],
  emissions: ["Emissions", "Emisiones", "排放", "Выбросы"],
  "battery capacity": ["Battery capacity", "Capacidad de la batería", "电池容量", "Ёмкость аккумулятора"],
  "max torque": ["Maximum torque", "Par máximo", "最大扭矩", "Максимальный крутящий момент"],
  "maximum torque": ["Maximum torque", "Par máximo", "最大扭矩", "Максимальный крутящий момент"],
  "cargo capacity": ["Cargo capacity", "Capacidad de carga", "载货量", "Грузоподъёмность"],
  "ground clearance": ["Ground clearance", "Altura libre al suelo", "离地间隙", "Дорожный просвет"],
  "curb weight": ["Curb weight", "Peso en vacío", "整备质量", "Снаряжённая масса"],
  "wheelbase": ["Wheelbase", "Distancia entre ejes", "轴距", "Колёсная база"],
  "other specifications": ["Other specifications", "Otras especificaciones", "其他规格", "Другие характеристики"],
};

const VALUES: Record<string, Translation> = {
  new: ["New", "Nuevo", "新车", "Новый"],
  used: ["Used", "Usado", "二手车", "С пробегом"],
  gasoline: ["Gasoline", "Gasolina", "汽油", "Бензин"],
  petrol: ["Gasoline", "Gasolina", "汽油", "Бензин"],
  diesel: ["Diesel", "Diésel", "柴油", "Дизель"],
  electric: ["Electric", "Eléctrico", "纯电动", "Электрический"],
  "pure electric": ["Electric", "Eléctrico", "纯电动", "Электрический"],
  hybrid: ["Hybrid", "Híbrido", "混合动力", "Гибрид"],
  "plug in hybrid": ["Plug-in hybrid", "Híbrido enchufable", "插电式混合动力", "Подключаемый гибрид"],
  "manual/automatic option": ["Manual or automatic", "Manual o automática", "手动或自动", "Механическая или автоматическая"],
  "8 speed automatic": ["8-speed automatic", "Automática de 8 velocidades", "8速自动变速箱", "8-ступенчатая автоматическая"],
  "8 speed automatic transmission": ["8-speed automatic", "Automática de 8 velocidades", "8速自动变速箱", "8-ступенчатая автоматическая"],
  automatic: ["Automatic", "Automática", "自动", "Автоматическая"],
  manual: ["Manual", "Manual", "手动", "Механическая"],
  cvt: ["CVT automatic", "Automática CVT", "CVT无级变速", "Вариатор CVT"],
  "front wheel drive": ["Front-wheel drive", "Tracción delantera", "前轮驱动", "Передний привод"],
  "rear wheel drive": ["Rear-wheel drive", "Tracción trasera", "后轮驱动", "Задний привод"],
  "all wheel drive": ["All-wheel drive", "Tracción total", "全轮驱动", "Полный привод"],
  "four wheel drive": ["Four-wheel drive", "Tracción 4×4", "四轮驱动", "Полный привод 4×4"],
  pickup: ["Pickup", "Camioneta", "皮卡", "Пикап"],
  sedan: ["Sedan", "Sedán", "轿车", "Седан"],
  suv: ["SUV", "SUV", "SUV", "Внедорожник"],
  "off road vehicle/suv": ["SUV", "SUV", "SUV", "Внедорожник"],
  "sport utility vehicle": ["SUV", "SUV", "SUV", "Внедорожник"],
  hatchback: ["Hatchback", "Hatchback", "掀背车", "Хэтчбек"],
  coupe: ["Coupe", "Coupé", "轿跑车", "Купе"],
  wagon: ["Wagon", "Familiar", "旅行车", "Универсал"],
  white: ["White", "Blanco", "白色", "Белый"],
  black: ["Black", "Negro", "黑色", "Чёрный"],
  silver: ["Silver", "Plateado", "银色", "Серебристый"],
  gray: ["Gray", "Gris", "灰色", "Серый"],
  grey: ["Gray", "Gris", "灰色", "Серый"],
  blue: ["Blue", "Azul", "蓝色", "Синий"],
  red: ["Red", "Rojo", "红色", "Красный"],
  green: ["Green", "Verde", "绿色", "Зелёный"],
  brown: ["Brown", "Marrón", "棕色", "Коричневый"],
  orange: ["Orange", "Naranja", "橙色", "Оранжевый"],
  yellow: ["Yellow", "Amarillo", "黄色", "Жёлтый"],
  available: ["Available", "Disponible", "在售", "В наличии"],
  reserved: ["Reserved", "Reservado", "已预订", "Зарезервирован"],
  sold: ["Sold", "Vendido", "已售", "Продан"],
};

function normalized(value: string) {
  return value.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

function select(words: Translation, language: SpecificationLanguage): string {
  if (language === "en") return words[0];
  if (language === "zh") return words[2];
  if (language === "ru") return words[3];
  if (language === "es-zh") return `${words[1]} / ${words[2]}`;
  return words[1];
}

export function translateVehicleTerm(value: string, language: SpecificationLanguage): string {
  const words = VALUES[normalized(value)];
  return words ? select(words, language) : value;
}

export function translateVehicleLabel(value: string, language: SpecificationLanguage): string {
  const key = normalized(value).replace(/\s*\([^)]*\)\s*$/, (suffix) => suffix.toLowerCase().includes("km") || suffix.toLowerCase().includes("hp") ? suffix : "");
  const words = LABELS[key];
  return words ? select(words, language) : value;
}

export function translateSpecificationLines(specs: Record<string, unknown>, language: SpecificationLanguage): string {
  return Object.entries(specs)
    .filter(([key, value]) => value != null && String(value).trim() && !/price|precio|seller|selling|margin|profit|adjustment|cost|价格|成本|利润|цена|стоимость|продавец|маржа|прибыль|корректиров/i.test(key))
    .map(([key, value]) => `${translateVehicleLabel(key, language)}: ${translateVehicleTerm(String(value), language)}`)
    .join("\n");
}

export function translateSpecificationText(text: string, language: SpecificationLanguage): string {
  return text.split(/\s*·\s*|\n/).map((part) => {
    const match = part.match(/^\s*([^:]+):\s*(.*)$/);
    return match ? `${translateVehicleLabel(match[1], language)}: ${translateVehicleTerm(match[2], language)}` : part.trim();
  }).filter(Boolean).join("\n");
}
