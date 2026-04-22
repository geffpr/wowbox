-- ================================================================
-- WOWBOX — SUPABASE SETUP SCRIPT
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard)
-- ================================================================

-- ────────────────────────────────────────────────
-- 1. PROFILES (extends auth.users)
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role          TEXT NOT NULL CHECK (role IN ('admin', 'partner')),
  name          TEXT,
  business_name TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can read all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Auto-create profile after signup (optional trigger)
-- CREATE OR REPLACE FUNCTION public.handle_new_user()
-- RETURNS trigger AS $$
-- BEGIN
--   INSERT INTO public.profiles(id, role)
--   VALUES (NEW.id, 'partner');
--   RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql SECURITY DEFINER;
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ────────────────────────────────────────────────
-- 2. BOXES
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.boxes (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT NOT NULL,
  slug        TEXT UNIQUE,
  tagline     TEXT,
  description TEXT,
  price       NUMERIC(10,2) NOT NULL,
  image_url   TEXT,
  category    TEXT,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.boxes ENABLE ROW LEVEL SECURITY;

-- Public read for active boxes
CREATE POLICY "Anyone can read active boxes"
  ON public.boxes FOR SELECT
  USING (is_active = TRUE);

-- Admin full access
CREATE POLICY "Admins manage boxes"
  ON public.boxes FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ────────────────────────────────────────────────
-- 3. EXPERIENCES
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.experiences (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  box_id      UUID REFERENCES public.boxes(id) ON DELETE SET NULL,
  partner_id  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  name        TEXT NOT NULL,
  description TEXT,
  duration    TEXT,
  location    TEXT,
  image_url   TEXT,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.experiences ENABLE ROW LEVEL SECURITY;

-- Public read active experiences
CREATE POLICY "Anyone can read active experiences"
  ON public.experiences FOR SELECT
  USING (is_active = TRUE);

-- Partners manage own experiences
CREATE POLICY "Partners manage own experiences"
  ON public.experiences FOR ALL
  USING (auth.uid() = partner_id);

-- Admins manage all
CREATE POLICY "Admins manage all experiences"
  ON public.experiences FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ────────────────────────────────────────────────
-- 4. ORDERS
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.orders (
  id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name      TEXT NOT NULL,
  customer_email     TEXT NOT NULL,
  customer_phone     TEXT,
  gift_message       TEXT,
  box_id             UUID REFERENCES public.boxes(id) ON DELETE SET NULL,
  amount             NUMERIC(10,2) NOT NULL,
  currency           TEXT DEFAULT 'ZAR',
  payment_reference  TEXT UNIQUE,
  payment_status     TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending','paid','failed','refunded')),
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (create order before payment)
CREATE POLICY "Anyone can create orders"
  ON public.orders FOR INSERT
  WITH CHECK (TRUE);

-- Anyone can read their own order (by ref — used post-payment)
CREATE POLICY "Read order by reference"
  ON public.orders FOR SELECT
  USING (TRUE);   -- tighten this in production with email-based checks

-- Anyone can update order they created (for payment status update from client)
CREATE POLICY "Update order payment status"
  ON public.orders FOR UPDATE
  USING (TRUE);   -- use webhook + service role in production

-- Admins full access
CREATE POLICY "Admins manage orders"
  ON public.orders FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ────────────────────────────────────────────────
-- 5. VOUCHERS
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.vouchers (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code          TEXT UNIQUE NOT NULL,
  order_id      UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  box_id        UUID REFERENCES public.boxes(id) ON DELETE SET NULL,
  experience_id UUID REFERENCES public.experiences(id) ON DELETE SET NULL,
  status        TEXT DEFAULT 'active' CHECK (status IN ('active','redeemed','expired','cancelled')),
  redeemed_at   TIMESTAMPTZ,
  expires_at    TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 year'),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;

-- Anyone can read vouchers (needed for customer lookup + partner redemption)
CREATE POLICY "Anyone can read vouchers"
  ON public.vouchers FOR SELECT
  USING (TRUE);

-- Anyone can insert (created server-side after payment)
CREATE POLICY "Anyone can create vouchers"
  ON public.vouchers FOR INSERT
  WITH CHECK (TRUE);

-- Partners can update voucher status (redeem)
CREATE POLICY "Partners can redeem vouchers"
  ON public.vouchers FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('partner','admin'))
  );

-- Admins full access
CREATE POLICY "Admins manage vouchers"
  ON public.vouchers FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ────────────────────────────────────────────────
-- 6. SEED DATA (optional — remove for production)
-- ────────────────────────────────────────────────
INSERT INTO public.boxes (name, slug, tagline, description, price, category, is_active) VALUES
  ('Cape Winelands Escape',     'cape-winelands-escape',     'Sip, savour & unwind',         'A curated wine-tasting experience across the beautiful Cape Winelands. Visit 3 award-winning estates and enjoy a gourmet cheese platter.', 1250.00, 'Food & Wine', TRUE),
  ('Spa Day Retreat',           'spa-day-retreat',           'Relax, restore & rejuvenate',  'A full-day spa experience at a luxury wellness centre of your choice. Includes massage, facial, and access to thermal pools.', 995.00,  'Wellness',    TRUE),
  ('Safari Sundowner',          'safari-sundowner',          'Wild at heart',                'Watch the African sunset from a game reserve. Includes a guided game drive, sundowner drinks, and boma dinner.', 2200.00, 'Nature',      TRUE),
  ('Adrenaline Rush',           'adrenaline-rush',           'Live on the edge',             'Choose from skydiving, bungee jumping, or shark cage diving. One epic experience, unforgettable memories.', 1800.00, 'Adventure',   TRUE),
  ('Romantic Escape',           'romantic-escape',           'Made for two',                 'A private sunset cruise, fine dining, and a couples massage. Perfect for anniversaries, proposals, or just because.', 2800.00, 'Romance',     TRUE),
  ('Family Fun Day',            'family-fun-day',            'Adventures for the whole crew','A day of fun for up to 4 people — choose from theme parks, go-karting, or outdoor adventure parks.',               1600.00, 'Family',      TRUE)
ON CONFLICT (slug) DO NOTHING;

-- ────────────────────────────────────────────────
-- 7. CREATE YOUR ADMIN USER
-- ────────────────────────────────────────────────
-- Step 1: Create user in Supabase Auth Dashboard (Authentication → Users → Invite user)
--         Email: admin@wowbox.co.za  (or your email)
--
-- Step 2: After the user confirms their email, run:
-- INSERT INTO public.profiles (id, role, name)
-- VALUES ('<paste-user-uuid-here>', 'admin', 'Admin');
--
-- That's it! You can now log in at wowbox.co.za/admin

-- ────────────────────────────────────────────────
-- DONE ✓
-- ────────────────────────────────────────────────
