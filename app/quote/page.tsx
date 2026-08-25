import {PageHero,SiteShell} from "../ui";
import {RequestForm,VehicleRequestForm} from "../request-form";
import {getVehicleBySlug} from "../../lib/vehicle-details";

export default async function Quote({searchParams}:{searchParams:Promise<{vehicle?:string}>}){
  const {vehicle:slug}=await searchParams;
  const vehicle=slug?getVehicleBySlug(slug):null;
  return <SiteShell>
    {!vehicle&&<PageHero kicker="PERSONAL EXPORT QUOTATION" title="Request a Quote" copy="Send the stock code or describe the vehicle you need and your destination."/>}
    <section className="section"><div className="container form-page">
      {vehicle?<VehicleRequestForm vehicleSlug={vehicle.slug} vehicleTitle={vehicle.title} bodyType={vehicle.bodyType}/>:<RequestForm kind="quote"/>}
    </div></section>
  </SiteShell>
}
