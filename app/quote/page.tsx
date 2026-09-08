import Link from "next/link";
import {QuoteCopy} from "../quote-copy";
import {PageHero,SiteShell} from "../ui";
import {RequestForm,VehicleRequestForm} from "../request-form";
import {getVehicleBySlug} from "../../lib/vehicle-details";

export default async function Quote({searchParams}:{searchParams:Promise<{vehicle?:string}>}){
  const {vehicle:slug}=await searchParams;
  const vehicle=slug?getVehicleBySlug(slug):null;
  return <SiteShell>
    {!vehicle&&<PageHero kicker="PERSONAL EXPORT QUOTATION" title="Request a Quote" copy="Send the stock code or describe the vehicle you need and your destination."/>}
    <section className="section"><div className="container form-page">
      {vehicle&&<div className="quote-selection"><Link href={`/vehicles/${vehicle.slug}`}><QuoteCopy en="← Back to vehicle" es="← Volver al vehículo"/></Link><h1><QuoteCopy en="Request your vehicle quote" es="Solicita la cotización de tu vehículo"/></h1><p>{vehicle.title}</p><p><QuoteCopy en="Choose your destination, then tell us how to reach you." es="Elige el destino y dinos cómo contactarte."/></p></div>}
      {vehicle?<VehicleRequestForm vehicleSlug={vehicle.slug} vehicleTitle={vehicle.title} vehicleFuel={vehicle.fuel}/>:<RequestForm kind="quote"/>}
    </div></section>
  </SiteShell>
}
