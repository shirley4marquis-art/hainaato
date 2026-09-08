import { redirect } from "next/navigation";

// The local inventory is the single source of vehicle details and quote links.
export default async function NewCars({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    if (typeof value === "string") params.set(key, value);
  }
  params.set("condition", "new");
  redirect(`/vehicles?${params.toString()}`);
}
