import type { Metadata } from "next";
import Link from "next/link";
import { PageHero, SiteShell } from "../ui";

const SITE_URL = "https://www.nindgeauto.com";

export const metadata: Metadata = {
  title: "Importar autos de China a Sudamérica",
  description:
    "Guía para comprar e importar autos nuevos y usados de China a Venezuela, Colombia, Perú, Chile, Ecuador, Bolivia, Argentina, Brasil, Uruguay y Paraguay.",
  alternates: { canonical: "/importar-autos-china-sudamerica" },
  openGraph: {
    type: "website",
    locale: "es_VE",
    alternateLocale: ["es_CO", "es_PE", "es_CL", "es_EC", "es_AR", "pt_BR"],
    url: "/importar-autos-china-sudamerica",
    title: "Importar autos de China a Sudamérica",
    description: "Vehículos, inspección, documentos y logística desde China hacia los principales puertos de Sudamérica.",
  },
};

const markets = [
  ["Venezuela", "Puerto Cabello, La Guaira, Maracaibo y Guanta"],
  ["Colombia", "Cartagena, Buenaventura, Barranquilla y Santa Marta"],
  ["Perú", "Callao, Paita y Matarani"],
  ["Chile", "San Antonio, Valparaíso e Iquique"],
  ["Ecuador", "Guayaquil y Manta"],
  ["Bolivia", "Tránsito mediante puertos de Chile o Perú"],
  ["Argentina", "Buenos Aires y Zárate"],
  ["Brasil", "Santos, Paranaguá e Itajaí"],
  ["Uruguay", "Montevideo"],
  ["Paraguay", "Tránsito regional hasta destino"],
] as const;

const faq = [
  ["¿Qué incluye una cotización?", "El vehículo seleccionado, inspección, documentación de exportación y transporte internacional según el puerto de destino."],
  ["¿Puedo solicitar fotos e inspección?", "Sí. Confirmamos la unidad, revisamos su condición y compartimos evidencia antes de coordinar el embarque."],
  ["¿El precio incluye impuestos de importación?", "La cotización indica su alcance. Aranceles, impuestos y nacionalización en destino se confirman según las reglas vigentes de cada país."],
  ["¿Cómo empiezo?", "Selecciona un vehículo o comparte marca, modelo, presupuesto, país y puerto de destino para recibir una cotización."],
] as const;

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Service",
      name: "Importación de vehículos de China a Sudamérica",
      provider: { "@id": `${SITE_URL}/#organization` },
      areaServed: markets.map(([name]) => ({ "@type": "Country", name })),
      serviceType: "Sourcing, inspección y exportación internacional de vehículos",
      url: `${SITE_URL}/importar-autos-china-sudamerica`,
    },
    {
      "@type": "FAQPage",
      mainEntity: faq.map(([name, text]) => ({
        "@type": "Question",
        name,
        acceptedAnswer: { "@type": "Answer", text },
      })),
    },
  ],
};

export default function SouthAmericaImportPage() {
  return (
    <SiteShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <PageHero
        kicker="EXPORTACIÓN A SUDAMÉRICA"
        title="Importa vehículos de China con un proceso claro"
        copy="Accede a vehículos nuevos y usados, inspección profesional, documentos de exportación y coordinación logística hacia tu país y puerto de destino."
      />
      <section className="section">
        <article className="container legal">
          <h2>Un solo proceso desde la selección hasta el embarque</h2>
          <p>
            HainaAuto ayuda a compradores particulares, concesionarios e importadores a seleccionar vehículos en China,
            verificar su condición y preparar la documentación necesaria para el transporte internacional.
          </p>
          <p>
            Consulta el <Link href="/vehicles">inventario disponible</Link>, revisa el vehículo y solicita una cotización
            indicando país, puerto, cantidad y presupuesto. El equipo confirma disponibilidad y alcance antes de cualquier pago.
          </p>

          <h2>Destinos atendidos en Sudamérica</h2>
          <ul>
            {markets.map(([country, ports]) => <li key={country}><strong>{country}:</strong> {ports}.</li>)}
          </ul>

          <h2>Flujo de compra y exportación</h2>
          <ol>
            <li>Selecciona una unidad o comparte las características que necesitas.</li>
            <li>Recibe precio, disponibilidad, fotos y alcance preliminar de la exportación.</li>
            <li>Confirma inspección, contrato, documentación y condiciones de pago.</li>
            <li>Coordinamos preparación, embarque y entrega de documentos de transporte.</li>
            <li>Tu agente local gestiona aduana, impuestos, registro y nacionalización en destino.</li>
          </ol>

          <h2>Preguntas frecuentes</h2>
          {faq.map(([question, answer]) => <section key={question}><h3>{question}</h3><p>{answer}</p></section>)}

          <p>
            <Link className="btn primary" href="/quote">Solicitar cotización</Link>{" "}
            <Link className="btn ghost" href="/export-process">Ver el proceso completo</Link>
          </p>
        </article>
      </section>
    </SiteShell>
  );
}
