import { SiteShell } from "../../ui";
import { QuoteSuccessClient } from "./success-client";

export default async function QuoteSuccessPage({searchParams}:{searchParams:Promise<{ref?:string;token?:string}>}) {
  const {ref="",token=""}=await searchParams;
  return <SiteShell><QuoteSuccessClient quoteRef={ref} token={token}/></SiteShell>;
}
