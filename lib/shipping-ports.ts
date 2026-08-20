// Customer-facing destination choices. Codes follow UN/LOCODE where a
// commonly used code is available; labels use the port names customers see
// on carrier documents. "Other / not sure" remains available because final
// carrier routing can use a nearby terminal or inland destination.
export type ShippingPort = { name: string; code?: string };
export type ShippingCountry = { country: string; iso2: string; ports: ShippingPort[] };

export const SHIPPING_COUNTRIES: ShippingCountry[] = [
  {country:"Venezuela",iso2:"VE",ports:[{name:"Puerto Cabello",code:"VEPBL"},{name:"La Guaira",code:"VELAG"},{name:"Maracaibo",code:"VEMAR"},{name:"Guanta",code:"VEGUT"}]},
  {country:"Colombia",iso2:"CO",ports:[{name:"Cartagena",code:"COCTG"},{name:"Buenaventura",code:"COBUN"},{name:"Barranquilla",code:"COBAQ"},{name:"Santa Marta",code:"COSMR"}]},
  {country:"United States",iso2:"US",ports:[{name:"Los Angeles, CA",code:"USLAX"},{name:"Long Beach, CA",code:"USLGB"},{name:"New York / New Jersey",code:"USNYC"},{name:"Savannah, GA",code:"USSAV"},{name:"Houston, TX",code:"USHOU"},{name:"Miami, FL",code:"USMIA"},{name:"Baltimore, MD",code:"USBAL"}]},
  {country:"Mexico",iso2:"MX",ports:[{name:"Manzanillo",code:"MXZLO"},{name:"Veracruz",code:"MXVER"},{name:"Lázaro Cárdenas",code:"MXLZC"},{name:"Altamira",code:"MXATM"}]},
  {country:"Panama",iso2:"PA",ports:[{name:"Balboa",code:"PABLB"},{name:"Manzanillo International Terminal",code:"PAMIT"},{name:"Colón",code:"PACOL"},{name:"Cristóbal",code:"PACTB"}]},
  {country:"Ecuador",iso2:"EC",ports:[{name:"Guayaquil",code:"ECGYE"},{name:"Posorja",code:"ECPSJ"},{name:"Manta",code:"ECMEC"}]},
  {country:"Peru",iso2:"PE",ports:[{name:"Callao",code:"PECLL"},{name:"Paita",code:"PEPAI"},{name:"Matarani",code:"PEMRI"}]},
  {country:"Chile",iso2:"CL",ports:[{name:"San Antonio",code:"CLSAI"},{name:"Valparaíso",code:"CLVAP"},{name:"Iquique",code:"CLIQQ"},{name:"Antofagasta",code:"CLANF"}]},
  {country:"Brazil",iso2:"BR",ports:[{name:"Santos",code:"BRSSZ"},{name:"Rio de Janeiro",code:"BRRIO"},{name:"Paranaguá",code:"BRPNG"},{name:"Itajaí",code:"BRITJ"}]},
  {country:"Argentina",iso2:"AR",ports:[{name:"Buenos Aires",code:"ARBUE"},{name:"Zárate",code:"ARZAE"},{name:"Rosario",code:"ARROS"}]},
  {country:"Uruguay",iso2:"UY",ports:[{name:"Montevideo",code:"UYMVD"},{name:"Nueva Palmira",code:"UYNVP"}]},
  {country:"Dominican Republic",iso2:"DO",ports:[{name:"Caucedo",code:"DOCAU"},{name:"Haina",code:"DOHAI"},{name:"Santo Domingo",code:"DOSDQ"}]},
  {country:"Jamaica",iso2:"JM",ports:[{name:"Kingston",code:"JMKIN"},{name:"Montego Bay",code:"JMMBJ"}]},
  {country:"Trinidad and Tobago",iso2:"TT",ports:[{name:"Port of Spain",code:"TTPOS"},{name:"Point Lisas",code:"TTPTS"}]},
  {country:"United Arab Emirates",iso2:"AE",ports:[{name:"Jebel Ali",code:"AEJEA"},{name:"Khalifa Port",code:"AEKHL"},{name:"Sharjah",code:"AESHJ"}]},
  {country:"Saudi Arabia",iso2:"SA",ports:[{name:"Jeddah Islamic Port",code:"SAJED"},{name:"King Abdulaziz Port, Dammam",code:"SADMM"}]},
  {country:"Oman",iso2:"OM",ports:[{name:"Sohar",code:"OMSOH"},{name:"Salalah",code:"OMSLL"},{name:"Duqm",code:"OMDQM"}]},
  {country:"South Africa",iso2:"ZA",ports:[{name:"Durban",code:"ZADUR"},{name:"Cape Town",code:"ZACPT"},{name:"Gqeberha (Port Elizabeth)",code:"ZAPLZ"}]},
  {country:"Nigeria",iso2:"NG",ports:[{name:"Lagos (Apapa)",code:"NGLOS"},{name:"Tin Can Island",code:"NGTIN"},{name:"Onne",code:"NGONN"}]},
  {country:"Ghana",iso2:"GH",ports:[{name:"Tema",code:"GHTEM"},{name:"Takoradi",code:"GHTKD"}]},
  {country:"Kenya",iso2:"KE",ports:[{name:"Mombasa",code:"KEMBA"},{name:"Lamu",code:"KELAU"}]},
  {country:"Tanzania",iso2:"TZ",ports:[{name:"Dar es Salaam",code:"TZDAR"},{name:"Tanga",code:"TZTGT"}]},
  {country:"Russia",iso2:"RU",ports:[{name:"Vladivostok",code:"RUVVO"},{name:"Novorossiysk",code:"RUNVS"},{name:"Saint Petersburg",code:"RULED"}]},
  {country:"Georgia",iso2:"GE",ports:[{name:"Poti",code:"GEPTI"},{name:"Batumi",code:"GEBUS"}]},
  {country:"Philippines",iso2:"PH",ports:[{name:"Manila",code:"PHMNL"},{name:"Batangas",code:"PHBTG"},{name:"Cebu",code:"PHCEB"}]},
].sort((a,b)=>a.country.localeCompare(b.country));

