import {requireAdmin,apiError} from "../../../../../lib/admin-api";
import {adminGetQuote} from "../../../../../lib/crm";
import {listOperations} from "../../../../../lib/admin-store";
export async function GET(request:Request){try{await requireAdmin();const ref=new URL(request.url).searchParams.get("ref")||"";const [quote,operations]=await Promise.all([adminGetQuote(ref),listOperations(undefined,ref)]);if(!quote)return Response.json({error:"Order not found"},{status:404});return Response.json({ok:true,quote,operations});}catch(e){return apiError(e);}}
