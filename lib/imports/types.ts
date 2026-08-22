export type ImportSource = "made-in-china";

export type ImportedListingStatus = "pending_review" | "verified" | "rejected" | "needs_update";
export type SourceListingStatus = "available" | "unavailable" | "unknown";

export type ImportedListingImage = {
  original_url: string;
  haina_url?: string | null;
  image_type: "main" | "gallery" | "unknown";
  source: ImportSource;
};

export type ImportedListing = {
  id: string;
  source: ImportSource;
  source_url: string;
  source_product_id: string;
  category: string;
  subcategory: string;
  brand: string;
  original_brand?: string | null;
  model: string;
  title: string;
  description: string;
  condition: string;
  year: number | null;
  price: string | null;
  currency: string;
  price_type: string;
  moq: string | null;
  country: "China";
  supplier_name: string;
  supplier_type: string;
  supplier_location: string;
  manufacturer: string;
  images: ImportedListingImage[];
  specifications: Record<string, string>;
  availability: string;
  source_status: SourceListingStatus;
  shipping_information: string;
  warranty: string;
  source_verified: boolean;
  listing_status: ImportedListingStatus;
  imported_at: string;
  updated_at: string;
  duplicate_key: string;
  duplicate_of?: string | null;
  review_notes?: string | null;
};

export type ImportLog = {
  run_id: string;
  source: ImportSource;
  started_at: string;
  completed_at: string | null;
  queries: string[];
  pages_scanned: number;
  listings_found: number;
  listings_imported: number;
  duplicates: number;
  rejected: number;
  errors: string[];
};

export type ImportConfig = {
  source: ImportSource;
  enabled: boolean;
  categories: string[];
  brands: string[];
  auto_publish: boolean;
  queries: string[];
  max_pages_per_query: number;
  max_products_per_run: number;
  request_delay_ms: number;
};

export type ListingSearchFilters = {
  q?: string;
  category?: string;
  brand?: string;
  supplier?: string;
  source?: ImportSource | "";
  status?: ImportedListingStatus | "";
  minPrice?: string;
  maxPrice?: string;
};

