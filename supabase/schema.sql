create extension if not exists "pgcrypto";

create table if not exists venues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null,
  landmark text,
  google_maps_url text,
  hourly_rate numeric(10, 2) not null default 400,
  business_hours text not null,
  payment_method text not null default 'GCash',
  cancellation_policy text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists courts (
  id bigint generated always as identity primary key,
  venue_id uuid references venues(id) on delete cascade,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists faq_entries (
  id bigint generated always as identity primary key,
  venue_id uuid references venues(id) on delete cascade,
  question text not null,
  answer text not null,
  sort_order integer not null default 0
);

create table if not exists bookings (
  id bigint generated always as identity primary key,
  booking_reference text not null unique,
  venue_id uuid references venues(id) on delete cascade,
  court_id bigint references courts(id) on delete restrict,
  reservation_name text not null,
  contact_number text not null,
  play_date date not null,
  start_time time not null,
  duration_hours integer not null check (duration_hours between 1 and 6),
  status text not null check (status in ('pending', 'booked', 'rebooked', 'cancelled')),
  payment_proof_url text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists booking_requests (
  id bigint generated always as identity primary key,
  reservation_name text not null,
  contact_number text not null,
  play_date date not null,
  court_id bigint references courts(id) on delete restrict,
  start_time time not null,
  duration_hours integer not null check (duration_hours between 1 and 6),
  notes text,
  accepted_terms boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

alter table booking_requests enable row level security;

create policy "public can create booking requests"
on booking_requests
for insert
to anon, authenticated
with check (accepted_terms = true);
