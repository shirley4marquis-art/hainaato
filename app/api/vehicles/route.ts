import { NextResponse } from "next/server";
import { searchVehicles } from "../../../lib/vehicles";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const params = Object.fromEntries(url.searchParams.entries());

  const searchParams: any = {
    q: params.q || undefined,
    brand: params.brand || undefined,
    model: params.model || undefined,
    type: params.type || undefined,
    fuel: params.fuel || undefined,
    color: params.color || undefined,
    minPrice: params.minPrice ? Number(params.minPrice) : undefined,
    maxPrice: params.maxPrice ? Number(params.maxPrice) : undefined,
    condition: params.condition as any,
    availability: params.availability as any,
    minYear: params.minYear ? Number(params.minYear) : undefined,
    maxYear: params.maxYear ? Number(params.maxYear) : undefined,
    minMileage: params.minMileage ? Number(params.minMileage) : undefined,
    maxMileage: params.maxMileage ? Number(params.maxMileage) : undefined,
    sort: params.sort as any,
    page: params.page ? Number(params.page) : 1,
    pageSize: params.pageSize ? Number(params.pageSize) : 24,
  };

  try {
    const result = searchVehicles(searchParams);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
