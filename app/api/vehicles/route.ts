import { NextResponse } from "next/server";
import { searchVehicles, type VehicleSearchParams } from "../../../lib/vehicles";

function oneOf<T extends string>(value: string | undefined, allowed: readonly T[]): T | undefined {
  return value && allowed.includes(value as T) ? (value as T) : undefined;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const params = Object.fromEntries(url.searchParams.entries());

  const searchParams: VehicleSearchParams = {
    q: params.q || undefined,
    brand: params.brand || undefined,
    model: params.model || undefined,
    type: params.type || undefined,
    fuel: params.fuel || undefined,
    color: params.color || undefined,
    minPrice: params.minPrice ? Number(params.minPrice) : undefined,
    maxPrice: params.maxPrice ? Number(params.maxPrice) : undefined,
    condition: oneOf(params.condition, ["new", "used"] as const),
    availability: oneOf(params.availability, ["available", "reserved", "sold"] as const),
    minYear: params.minYear ? Number(params.minYear) : undefined,
    maxYear: params.maxYear ? Number(params.maxYear) : undefined,
    minMileage: params.minMileage ? Number(params.minMileage) : undefined,
    maxMileage: params.maxMileage ? Number(params.maxMileage) : undefined,
    sort: oneOf(params.sort, ["latest", "price-asc", "price-desc"] as const),
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
