-- Supabase / PostgreSQL schema for SinoVanta
-- Tables: brands, categories, vehicles, vehicle_images, quotes, sourcing_requests, admin_users

create extension if not exists "pgcrypto";

-- Brands
create table if not exists brands (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  origin_region text,
  created_at timestamptz not null default now()
);

-- Categories
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  created_at timestamptz not null default now()
);

-- Vehicles
create table if not exists vehicles (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid references brands(id) on delete set null,
  brand_name text not null,
  model text,
  generation text,
  trim text,
  model_year integer,
  condition text,
  market text,
  category_id uuid references categories(id) on delete set null,
  body_type text,
  fuel_type text,
  engine text,
  engine_cc text,
  horsepower text,
  torque text,
  transmission text,
  drive_type text,
  battery_capacity text,
  electric_range text,
  charging_speed text,
  fuel_consumption text,
  seats integer,
  doors integer,
  length_mm integer,
  width_mm integer,
  height_mm integer,
  wheelbase_mm integer,
  ground_clearance_mm integer,
  curb_weight_kg integer,
  cargo_capacity_l integer,
  exterior_colours text[],
  interior_colours text[],
  safety_features jsonb,
  technology_features jsonb,
  overview text,
  price_currency text,
  price_exw numeric,
  price_fob numeric,
  price_cif numeric,
  availability text,
  origin text,
  departure_port text,
  shipping_availability jsonb,
  image_count integer default 0,
  images text[],
  videos text[],
  specification_source text,
  demo boolean default false,
  created_at timestamptz not null default now(),
  last_updated timestamptz not null default now()
);

create index if not exists vehicles_brand_model_idx on vehicles(brand_name, model);
create index if not exists vehicles_category_idx on vehicles(category_id);
create index if not exists vehicles_availability_idx on vehicles(availability);

-- Vehicle images table (optional - normalized)
create table if not exists vehicle_images (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid references vehicles(id) on delete cascade,
  url text not null,
  type text,
  alt text,
  is_hero boolean default false,
  display_order integer default 0,
  created_at timestamptz not null default now()
);

-- Quote requests
create table if not exists quotes (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text,
  country text,
  city text,
  vehicle_id uuid references vehicles(id) on delete set null,
  vehicle_text text,
  model_year text,
  trim text,
  preferred_colour text,
  quantity integer default 1,
  shipping_destination text,
  preferred_shipping_method text,
  budget text,
  additional_requirements text,
  status text default 'received',
  created_at timestamptz not null default now()
);

-- Sourcing / "Find Any Car" requests
create table if not exists sourcing_requests (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text,
  make text,
  model text,
  year text,
  trim text,
  new_or_used text,
  colour text,
  budget text,
  country text,
  destination_port text,
  quantity integer default 1,
  message text,
  status text default 'received',
  created_at timestamptz not null default now()
);

-- Admin users (for basic auth integration)
create table if not exists admin_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  full_name text,
  role text default 'admin',
  password_hash text,
  created_at timestamptz not null default now()
);

-- Simple audit/logs table (optional)
create table if not exists admin_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references admin_users(id) on delete set null,
  action text not null,
  details jsonb,
  created_at timestamptz not null default now()
);

-- Populate categories if empty (safe to re-run)
insert into categories (name, slug)
select * from (values
  ('Sedans','sedans'),
  ('SUVs','suvs'),
  ('Electric Vehicles','electric-vehicles'),
  ('Hybrid Vehicles','hybrid-vehicles'),
  ('Plug-in Hybrid Vehicles','plug-in-hybrid-vehicles'),
  ('Pickups','pickups'),
  ('MPVs','mpvs'),
  ('Minivans','minivans'),
  ('Commercial Vehicles','commercial-vehicles'),
  ('Sports Cars','sports-cars'),
  ('Premium & Luxury','premium-luxury')
) as c(name, slug)
where not exists (select 1 from categories where slug=c.slug);
