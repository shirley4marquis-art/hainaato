import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  Anchor,
  ClipboardCheck,
  CreditCard,
  FileSignature,
  FileText,
  MailCheck,
  PackageCheck,
  Ship,
  ShieldCheck,
  Truck,
  UserRound,
} from "lucide-react";
import { SiteShell } from "../ui";

export const metadata: Metadata = {
  title: "Vehicle Export Process from China",
  description:
    "Step-by-step guide to request a formal CIF quotation, sign the sales contract, pay the 40% deposit, ship from China, and complete the final 60% payment before release.",
  alternates: { canonical: "/export-process" },
};

const quoteSteps = [
  {
    icon: UserRound,
    title: "Send buyer details",
    es: "Usted nos envia sus datos para preparar la cotizacion.",
    detail: "Full name, email address, destination port in Venezuela, vehicle model, and quantity.",
  },
  {
    icon: FileText,
    title: "Formal CIF quotation",
    es: "Le enviamos la cotizacion formal para revisar vehiculo, precio CIF, puerto y condiciones.",
    detail: "The quotation confirms the unit, CIF price by default, destination port, validity period, and any explicitly stated FOB terms if requested.",
  },
  {
    icon: FileSignature,
    title: "Sales contract",
    es: "Si esta de acuerdo, preparamos el contrato de compraventa.",
    detail: "The contract identifies the buyer, seller, vehicle, payment structure, destination, and release conditions.",
  },
  {
    icon: CreditCard,
    title: "40% initial payment",
    es: "Despues de revisar y firmar el contrato, realiza el 40% inicial para confirmar la unidad.",
    detail: "This reserves the vehicle and allows us to start export preparation, inspection, and file processing in China.",
  },
  {
    icon: Ship,
    title: "Export and shipping",
    es: "Nosotros preparamos la documentacion y coordinamos el embarque hacia Venezuela.",
    detail: "We coordinate China-side paperwork, port handling, booking, loading, and shipping milestones.",
  },
  {
    icon: Anchor,
    title: "60% before release",
    es: "El 60% restante se paga despues del envio, cuando la camioneta llegue a su puerto de destino, antes de su liberacion.",
    detail: "The final balance is paid before the vehicle is released at destination according to the signed contract.",
  },
] as const;

const documents = [
  ["Buyer details", "Full name, email, phone or WhatsApp, destination port, and quantity."],
  ["Vehicle confirmation", "Model, transmission, fuel type, color preference, and any required configuration."],
  ["Quotation approval", "Written confirmation that the CIF price, port, payment terms, and timeline are accepted."],
  ["Contract documents", "Signed sales contract plus payment confirmation for the initial 40%."],
] as const;

const timeline = [
  ["1", "Quotation request", "Client sends data and target vehicle."],
  ["2", "CIF quote issued", "Vehicle, price, port, and terms are confirmed."],
  ["3", "Contract signed", "Buyer reviews and signs the purchase contract."],
  ["4", "40% paid", "Unit is confirmed and export work begins."],
  ["5", "China export", "Inspection, documents, port handling, and shipping."],
  ["6", "Arrival notice", "Vehicle reaches the destination port."],
  ["7", "60% paid", "Final balance is paid before release."],
] as const;

export default function ExportProcess() {
  return (
    <SiteShell>
      <section className="export-process-hero">
        <div className="container export-process-hero-grid">
          <div>
            <span>EXPORT PROCESS</span>
            <h1>How to Import a Vehicle from China</h1>
            <p>
              A clear sequence for buying a vehicle through HainaAuto: quotation, contract, 40% confirmation
              payment, export from China, shipment to Venezuela, and final 60% payment before release.
            </p>
            <div className="export-process-actions">
              <Link href="/quote">Start quotation</Link>
              <Link href="/vehicles">Choose vehicle</Link>
            </div>
          </div>
          <div className="export-process-visual" aria-label="Export process overview">
            <Image
              src="/images/contact-export-desk.png"
              alt="HainaAuto export desk coordinating vehicle shipment documents"
              width={900}
              height={650}
              priority
            />
            <div>
              <b>CIF Venezuela</b>
              <span>Quote {"->"} Contract {"->"} 40% {"->"} Ship {"->"} 60% {"->"} Release</span>
            </div>
          </div>
        </div>
      </section>

      <section className="export-process-section">
        <div className="container export-process-intro">
          <div>
            <span>MESSAGE TEMPLATE</span>
            <h2>What we tell the customer after they choose a vehicle</h2>
          </div>
          <article>
            <p>
              Perfecto, Señor. El siguiente paso es prepararle una cotizacion formal con todos los detalles de la
              JAC automatica y el precio CIF hasta su puerto en Venezuela.
            </p>
            <p>
              Para prepararle la cotizacion, envienos por favor: nombre completo, correo electronico, puerto de
              destino en Venezuela y cantidad de vehiculos.
            </p>
            <strong>Una vez tengamos esos datos, procedemos con su cotizacion formal.</strong>
          </article>
        </div>
      </section>

      <section className="export-process-section export-process-flow-band">
        <div className="container">
          <header className="export-process-heading">
            <span>STEP BY STEP</span>
            <h2>Complete Purchase and Export Flow</h2>
            <p>Each step has a clear purpose, so the buyer knows exactly what is needed before money moves.</p>
          </header>
          <div className="export-process-flow">
            {quoteSteps.map(({ icon: Icon, title, es, detail }, index) => (
              <article key={title}>
                <div className="export-process-step-number">{String(index + 1).padStart(2, "0")}</div>
                <span className="export-process-step-icon"><Icon size={20} /></span>
                <div>
                  <h3>{title}</h3>
                  <p lang="es">{es}</p>
                  <small>{detail}</small>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="export-process-section">
        <div className="container export-process-split">
          <div>
            <span>REQUIRED INFORMATION</span>
            <h2>What the buyer should send first</h2>
            <p>
              These details allow us to prepare a formal quotation instead of a rough estimate. Without the port and
              quantity, CIF pricing cannot be confirmed properly.
            </p>
            <Link href="/quote">Send details now</Link>
          </div>
          <div className="export-process-docs">
            {documents.map(([title, copy]) => (
              <article key={title}>
                <ClipboardCheck size={18} />
                <div>
                  <h3>{title}</h3>
                  <p>{copy}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="export-process-section export-process-timeline-band">
        <div className="container">
          <header className="export-process-heading">
            <span>SEQUENCE VIEW</span>
            <h2>From Inquiry to Port Release</h2>
          </header>
          <div className="export-process-timeline">
            {timeline.map(([num, title, copy]) => (
              <article key={title}>
                <b>{num}</b>
                <h3>{title}</h3>
                <p>{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="export-process-section">
        <div className="container export-process-assurance">
          <article>
            <MailCheck size={22} />
            <h3>Formal quote first</h3>
            <p>The buyer reviews the vehicle, CIF price, destination port, and conditions before contract signing.</p>
          </article>
          <article>
            <ShieldCheck size={22} />
            <h3>Contract before deposit</h3>
            <p>The 40% initial payment is made only after the contract has been prepared, reviewed, and signed.</p>
          </article>
          <article>
            <Truck size={22} />
            <h3>Export handled in China</h3>
            <p>We coordinate preparation, documents, China port work, and shipment toward Venezuela.</p>
          </article>
          <article>
            <PackageCheck size={22} />
            <h3>Balance before release</h3>
            <p>The remaining 60% is paid after shipment arrival at destination, before the vehicle is released.</p>
          </article>
        </div>
      </section>
    </SiteShell>
  );
}
