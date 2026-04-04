-- =====================================================
-- Enterprise-Grade User Identity & Authorization Schema
-- Supabase SQL Editor (Dashboard > SQL)
--
-- Supports: Email/Password, GitHub OAuth, Google OAuth
-- Pattern: RBAC (Role-Based Access Control) + Row Level Security
-- =====================================================

-- ─── ENUMS ──────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM ('user', 'premium', 'admin', 'super_admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.user_status AS ENUM ('active', 'inactive', 'suspended', 'banned');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.subscription_status AS ENUM ('trialing', 'active', 'past_due', 'canceled', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.identity_provider AS ENUM ('email', 'github', 'google');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.audit_action AS ENUM (
    'login', 'logout', 'register', 'password_reset',
    'profile_update', 'role_change', 'subscription_change',
    'premium_access', 'account_suspended', 'account_reactivated'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ─── 1. PROFILES — core identity, extends auth.users ────

CREATE TABLE IF NOT EXISTS public.profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- identity
  email           TEXT NOT NULL,
  full_name       TEXT,
  display_name    TEXT,
  avatar_url      TEXT,
  bio             TEXT,
  phone           TEXT,

  -- provider tracking (primary provider used to register)
  primary_provider public.identity_provider DEFAULT 'email',

  -- access control
  role            public.user_role    DEFAULT 'user',
  status          public.user_status  DEFAULT 'active',

  -- preferences (JSONB for flexibility — locale, theme, notifications, etc.)
  preferences     JSONB DEFAULT '{}'::JSONB,

  -- metadata from OAuth providers (raw payload for debugging/enrichment)
  provider_meta   JSONB DEFAULT '{}'::JSONB,

  -- timestamps
  email_verified_at TIMESTAMPTZ,
  last_sign_in_at   TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

-- Indexes for common query patterns via Supabase REST API
CREATE INDEX IF NOT EXISTS idx_profiles_email   ON public.profiles (email);
CREATE INDEX IF NOT EXISTS idx_profiles_role    ON public.profiles (role);
CREATE INDEX IF NOT EXISTS idx_profiles_status  ON public.profiles (status);


-- ─── 2. USER IDENTITIES — federated provider links ─────
-- One user can link multiple providers (GitHub + Google + email)

CREATE TABLE IF NOT EXISTS public.user_identities (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider        public.identity_provider NOT NULL,
  provider_uid    TEXT NOT NULL,           -- provider's user id (e.g. GitHub user id)
  provider_email  TEXT,
  provider_data   JSONB DEFAULT '{}'::JSONB,  -- full OAuth payload
  linked_at       TIMESTAMPTZ DEFAULT now(),

  UNIQUE (provider, provider_uid)
);

CREATE INDEX IF NOT EXISTS idx_user_identities_user_id ON public.user_identities (user_id);


-- ─── 3. SUBSCRIPTIONS — premium access tracking ────────

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_id         TEXT NOT NULL DEFAULT 'premium_monthly',
  status          public.subscription_status DEFAULT 'active',

  -- payment gateway references (Razorpay, Stripe, etc.)
  gateway         TEXT,                    -- 'razorpay' | 'stripe'
  gateway_subscription_id TEXT,
  gateway_customer_id     TEXT,

  -- billing
  amount_cents    INTEGER,                 -- amount in smallest currency unit (paise/cents)
  currency        TEXT DEFAULT 'INR',
  interval        TEXT DEFAULT 'month' CHECK (interval IN ('month', 'year', 'lifetime')),

  -- period
  trial_starts_at   TIMESTAMPTZ,
  trial_ends_at     TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ DEFAULT now(),
  current_period_end   TIMESTAMPTZ,
  canceled_at       TIMESTAMPTZ,

  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions (user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status  ON public.subscriptions (status);


-- ─── 4. AUDIT LOG — immutable event trail ──────────────

CREATE TABLE IF NOT EXISTS public.audit_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action          public.audit_action NOT NULL,
  ip_address      INET,
  user_agent      TEXT,
  metadata        JSONB DEFAULT '{}'::JSONB,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user_id    ON public.audit_log (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action     ON public.audit_log (action);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.audit_log (created_at DESC);


-- ─── 5. PRODUCTS — what you sell ───────────────────────

CREATE TABLE IF NOT EXISTS public.products (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            TEXT UNIQUE NOT NULL,
  name            TEXT NOT NULL,
  description     TEXT,
  price_cents     INTEGER NOT NULL,        -- in smallest currency unit
  currency        TEXT DEFAULT 'INR',
  is_active       BOOLEAN DEFAULT TRUE,
  metadata        JSONB DEFAULT '{}'::JSONB,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);


-- ─── 6. PURCHASES — transaction ledger ─────────────────

CREATE TABLE IF NOT EXISTS public.purchases (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id          UUID REFERENCES public.products(id) ON DELETE SET NULL,
  subscription_id     UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,

  -- payment gateway
  gateway             TEXT,
  gateway_order_id    TEXT,
  gateway_payment_id  TEXT,
  gateway_signature   TEXT,

  amount_cents        INTEGER NOT NULL,
  currency            TEXT DEFAULT 'INR',
  status              TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),

  receipt_url         TEXT,
  metadata            JSONB DEFAULT '{}'::JSONB,
  created_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_purchases_user_id ON public.purchases (user_id);
CREATE INDEX IF NOT EXISTS idx_purchases_status  ON public.purchases (status);


-- ═════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═════════════════════════════════════════════════════

ALTER TABLE public.profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases       ENABLE ROW LEVEL SECURITY;

-- ── profiles ──
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
    )
  );

-- ── user_identities ──
CREATE POLICY "Users can view own identities"
  ON public.user_identities FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own identities"
  ON public.user_identities FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── subscriptions ──
CREATE POLICY "Users can view own subscriptions"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- ── audit_log (read-only for own logs) ──
CREATE POLICY "Users can view own audit log"
  ON public.audit_log FOR SELECT
  USING (auth.uid() = user_id);

-- ── products (public read) ──
CREATE POLICY "Anyone can view active products"
  ON public.products FOR SELECT
  USING (is_active = TRUE);

-- ── purchases ──
CREATE POLICY "Users can view own purchases"
  ON public.purchases FOR SELECT
  USING (auth.uid() = user_id);


-- ═════════════════════════════════════════════════════
-- FUNCTIONS & TRIGGERS
-- ═════════════════════════════════════════════════════

-- ── Auto-create profile on sign-up (email or OAuth) ──

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  _provider public.identity_provider;
  _avatar   TEXT;
  _name     TEXT;
BEGIN
  -- Determine provider
  _provider := CASE
    WHEN NEW.raw_app_meta_data ->> 'provider' = 'github' THEN 'github'::public.identity_provider
    WHEN NEW.raw_app_meta_data ->> 'provider' = 'google' THEN 'google'::public.identity_provider
    ELSE 'email'::public.identity_provider
  END;

  -- Extract name (OAuth providers put it in different fields)
  _name := COALESCE(
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'name',
    NEW.raw_user_meta_data ->> 'user_name',
    split_part(NEW.email, '@', 1)
  );

  -- Extract avatar
  _avatar := COALESCE(
    NEW.raw_user_meta_data ->> 'avatar_url',
    NEW.raw_user_meta_data ->> 'picture'
  );

  -- Create profile
  INSERT INTO public.profiles (
    id, email, full_name, display_name, avatar_url,
    primary_provider, provider_meta,
    email_verified_at, last_sign_in_at
  ) VALUES (
    NEW.id,
    NEW.email,
    _name,
    _name,
    _avatar,
    _provider,
    COALESCE(NEW.raw_user_meta_data, '{}'::JSONB),
    CASE WHEN NEW.email_confirmed_at IS NOT NULL THEN NEW.email_confirmed_at ELSE NULL END,
    now()
  );

  -- Track linked identity
  INSERT INTO public.user_identities (user_id, provider, provider_uid, provider_email, provider_data)
  VALUES (
    NEW.id,
    _provider,
    COALESCE(NEW.raw_user_meta_data ->> 'provider_id', NEW.id::TEXT),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data, '{}'::JSONB)
  );

  -- Audit log
  INSERT INTO public.audit_log (user_id, action, metadata)
  VALUES (NEW.id, 'register', jsonb_build_object('provider', _provider::TEXT));

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


-- ── Update last_sign_in_at on login ──

CREATE OR REPLACE FUNCTION public.handle_user_login()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at THEN
    UPDATE public.profiles
    SET last_sign_in_at = NEW.last_sign_in_at, updated_at = now()
    WHERE id = NEW.id;

    INSERT INTO public.audit_log (user_id, action, metadata)
    VALUES (NEW.id, 'login', jsonb_build_object(
      'provider', COALESCE(NEW.raw_app_meta_data ->> 'provider', 'email')
    ));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_login ON auth.users;
CREATE TRIGGER on_auth_user_login
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_login();


-- ── Generic updated_at trigger ──

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS products_updated_at ON public.products;
CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


-- ═════════════════════════════════════════════════════
-- HELPER: Check if user has premium access
-- Use from client: supabase.rpc('has_premium_access')
-- ═════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.has_premium_access()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND status = 'active'
      AND (
        role IN ('premium', 'admin', 'super_admin')
        OR EXISTS (
          SELECT 1 FROM public.subscriptions
          WHERE user_id = auth.uid()
            AND status IN ('active', 'trialing')
            AND (current_period_end IS NULL OR current_period_end > now())
        )
      )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
