import type {Metadata} from "next";
import {GetInTouchSection} from "../contact-section";
import {PageHero,SiteShell} from "../ui";
export const metadata:Metadata={title:"Contacto para importar autos de China",description:"Contacta al equipo de exportación de HainaAuto para cotizar vehículos, inspección y transporte desde China hacia Venezuela y Sudamérica.",alternates:{canonical:"/contact"}};
export default function Contact(){return <SiteShell><PageHero kicker="CONTACT HAINAAUTO" title="Talk to our export team" copy="Share the vehicle, budget and destination you have in mind. Our team normally responds within one business day."/><GetInTouchSection/></SiteShell>}
