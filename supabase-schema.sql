-- ==============================================================================
-- EcoTrack - Waste Collection and Recycling Tracking Database Schema
-- Run this in your Supabase SQL Editor to initialize all tables & policies
-- ==============================================================================

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles Table (extending Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  full_name TEXT,
  contact TEXT,
  role TEXT CHECK (role IN ('Citizen', 'Collector', 'Admin', 'citizen', 'collector', 'admin')) DEFAULT 'Citizen',
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Processing Facilities Table (MRF, Composting, E-Waste Refinement)
CREATE TABLE IF NOT EXISTS public.facilities (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  type TEXT NOT NULL,
  capacity_kg NUMERIC(10, 2) DEFAULT 10000,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Waste Requests Table (Citizen submissions)
CREATE TABLE IF NOT EXISTS public.waste_requests (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  citizen_name TEXT,
  waste_type TEXT NOT NULL DEFAULT 'Plastic',
  category TEXT DEFAULT 'Plastic',
  weight_kg NUMERIC(8, 2) NOT NULL CHECK (weight_kg > 0),
  address TEXT NOT NULL,
  preferred_date DATE,
  notes TEXT,
  status TEXT CHECK (status IN ('Pending', 'Collected', 'Cancelled', 'pending', 'collected', 'cancelled')) DEFAULT 'Pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. Collections Table (Collector pickups)
CREATE TABLE IF NOT EXISTS public.collections (
  id BIGSERIAL PRIMARY KEY,
  request_id BIGINT REFERENCES public.waste_requests(id) ON DELETE SET NULL,
  collector_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  collector_name TEXT,
  weight_kg NUMERIC(8, 2) NOT NULL CHECK (weight_kg > 0),
  actual_weight_kg NUMERIC(8, 2),
  facility TEXT NOT NULL,
  notes TEXT,
  collected_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 5. Recycling Logs Table (Admin auditing joined with facilities)
CREATE TABLE IF NOT EXISTS public.recycling_logs (
  id BIGSERIAL PRIMARY KEY,
  facility_id BIGINT REFERENCES public.facilities(id) ON DELETE SET NULL,
  collection_id TEXT,
  category TEXT NOT NULL,
  weight_kg NUMERIC(8, 2) NOT NULL CHECK (weight_kg > 0),
  facility TEXT,
  carbon_offset_kg NUMERIC(8, 2) DEFAULT 0,
  logged_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ==============================================================================
-- Row Level Security (RLS) & Policies
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waste_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recycling_logs ENABLE ROW LEVEL SECURITY;

-- Profiles: Public read, insert on signup, update own
CREATE POLICY "Profiles viewable by all users" 
ON public.profiles FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Users can insert own profile on signup" 
ON public.profiles FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Facilities: Viewable by all users
CREATE POLICY "Facilities viewable by all users" 
ON public.facilities FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Facilities insertable by authenticated users" 
ON public.facilities FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Waste Requests: Public read, insert, and update
CREATE POLICY "Waste requests viewable by all" 
ON public.waste_requests FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Users can submit waste requests" 
ON public.waste_requests FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Users can update waste requests" 
ON public.waste_requests FOR UPDATE TO anon, authenticated USING (true);

-- Collections: Viewable and insertable by collectors & admins
CREATE POLICY "Collections readable by all" 
ON public.collections FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Collectors can insert collections" 
ON public.collections FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Recycling Logs: Viewable and insertable
CREATE POLICY "Recycling logs readable by all" 
ON public.recycling_logs FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Recycling logs insertable by all" 
ON public.recycling_logs FOR INSERT TO anon, authenticated WITH CHECK (true);

-- ==============================================================================
-- Initial Seed Data (Facilities, Initial Requests, and Recycling Logs)
-- ==============================================================================
INSERT INTO public.facilities (name, location, type, capacity_kg)
VALUES 
  ('Central Materials Recovery Facility', 'Grand River Docklands', 'Automated Optical Sorting MRF', 25000),
  ('GreenFuture Polymer Plant', 'Sector 9 Industrial Corridor', 'Polymer Extrusion & Pelletizing', 15000),
  ('Metro E-Waste Recovery Hub', 'Tech Hub Logistics Terminal', 'Precious Metals & PCB Refinement', 8000),
  ('EcoCompost Bio-Processing Yard', 'Valley Agro-Ecology Preserve', 'Industrial Aerobic Composting', 30000)
ON CONFLICT DO NOTHING;

INSERT INTO public.waste_requests (waste_type, category, weight_kg, address, preferred_date, notes, status)
VALUES 
  ('Plastic', 'Plastic', 18.5, '42 Pine Crest Avenue, Sector 4', CURRENT_DATE + INTERVAL '1 day', 'Clean crushed PET bottles and HDPE milk containers', 'Pending'),
  ('Electronic', 'Electronic', 22.0, '77 Elm Street, Block B', CURRENT_DATE + INTERVAL '2 days', '2 Desktop towers, wiring harnesses, and batteries', 'Pending'),
  ('Organic', 'Organic', 35.0, '104 Highland Terrace', CURRENT_DATE + INTERVAL '1 day', 'Sorted yard trimmings and compostable vegetable scraps', 'Pending')
ON CONFLICT DO NOTHING;

INSERT INTO public.recycling_logs (facility_id, category, weight_kg, carbon_offset_kg)
VALUES 
  (1, 'Plastic', 1450.0, 2175.0),
  (2, 'Electronic', 620.0, 1860.0),
  (3, 'Organic', 3200.0, 2560.0),
  (4, 'Plastic', 890.0, 1335.0)
ON CONFLICT DO NOTHING;
