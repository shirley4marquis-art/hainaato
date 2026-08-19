import type {Metadata} from "next";

export const metadata:Metadata={
  title:"Carros nuevos de China para Venezuela",
  description:"Catálogo de carros nuevos chinos para Venezuela: eléctricos, híbridos, SUV, sedanes y camionetas con precios de referencia y soporte completo de exportación.",
  alternates:{canonical:"/new-cars"},
};

export default function NewCarsLayout({children}:{children:React.ReactNode}){return children;}
