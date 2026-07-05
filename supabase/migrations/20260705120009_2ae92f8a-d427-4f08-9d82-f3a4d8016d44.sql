
-- =====================================================
-- ROLES
-- =====================================================
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- PROFILES
-- =====================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  username TEXT UNIQUE,
  email TEXT,
  phone TEXT,
  country TEXT,
  avatar_url TEXT,
  vip_level INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles self read" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Profiles self update" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Profiles self insert" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

-- =====================================================
-- WALLETS
-- =====================================================
CREATE TABLE public.wallets (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_deposits NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_withdrawals NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_rewards NUMERIC(14,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.wallets TO authenticated;
GRANT ALL ON public.wallets TO service_role;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Wallet self read" ON public.wallets FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- PAYMENT METHODS
-- =====================================================
CREATE TABLE public.payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  method_type TEXT NOT NULL, -- bank, jazzcash, easypaisa, usdt
  label TEXT NOT NULL,
  account_title TEXT,
  account_number TEXT,
  qr_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payment_methods TO authenticated;
GRANT ALL ON public.payment_methods TO service_role;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "PM read all signed-in" ON public.payment_methods FOR SELECT TO authenticated USING (true);
CREATE POLICY "PM admin write" ON public.payment_methods FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- DEPOSITS
-- =====================================================
CREATE TABLE public.deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payment_method_id UUID REFERENCES public.payment_methods(id),
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  reference TEXT,
  screenshot_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  admin_remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ
);
CREATE INDEX ON public.deposits (user_id, created_at DESC);
CREATE INDEX ON public.deposits (status);
GRANT SELECT, INSERT ON public.deposits TO authenticated;
GRANT ALL ON public.deposits TO service_role;
ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deposits self read" ON public.deposits FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Deposits self insert" ON public.deposits FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND status = 'pending');
CREATE POLICY "Deposits admin update" ON public.deposits FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- WITHDRAWALS
-- =====================================================
CREATE TABLE public.withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  method_type TEXT NOT NULL,
  account_title TEXT,
  account_number TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ
);
CREATE INDEX ON public.withdrawals (user_id, created_at DESC);
CREATE INDEX ON public.withdrawals (status);
GRANT SELECT, INSERT ON public.withdrawals TO authenticated;
GRANT ALL ON public.withdrawals TO service_role;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "WD self read" ON public.withdrawals FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "WD self insert" ON public.withdrawals FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND status = 'pending');
CREATE POLICY "WD admin update" ON public.withdrawals FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- TRANSACTIONS (ledger)
-- =====================================================
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL, -- deposit, withdrawal, reward, adjustment
  amount NUMERIC(14,2) NOT NULL,
  reference_id UUID,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.transactions (user_id, created_at DESC);
GRANT SELECT ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "TX self read" ON public.transactions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- NOTIFICATIONS
-- =====================================================
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.notifications (user_id, created_at DESC);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Notif self read" ON public.notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Notif self update" ON public.notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- =====================================================
-- ADMIN SETTINGS (single-row key/value)
-- =====================================================
CREATE TABLE public.settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.settings TO authenticated;
GRANT ALL ON public.settings TO service_role;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Settings read all" ON public.settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Settings admin write" ON public.settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.settings (key, value) VALUES
  ('min_withdrawal_deposit', '500'::jsonb),
  ('site_name', '"Premium Traders"'::jsonb)
ON CONFLICT DO NOTHING;

-- =====================================================
-- SEED PAYMENT METHODS
-- =====================================================
INSERT INTO public.payment_methods (method_type, label, account_title, account_number, sort_order) VALUES
  ('bank', 'Bank Transfer', 'Premium Traders', '0000-0000-0000-0000', 1),
  ('jazzcash', 'JazzCash', 'Premium Traders', '0300-0000000', 2),
  ('easypaisa', 'EasyPaisa', 'Premium Traders', '0345-0000000', 3),
  ('usdt', 'USDT (TRC20)', 'Premium Traders', 'TXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', 4);

-- =====================================================
-- SIGNUP TRIGGER: create profile + wallet + role
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, username)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1))
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.wallets (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- APPROVE DEPOSIT: credit wallet + create tx + notify
-- =====================================================
CREATE OR REPLACE FUNCTION public.admin_review_deposit(_deposit_id UUID, _approve BOOLEAN, _remarks TEXT DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  d RECORD;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT * INTO d FROM public.deposits WHERE id = _deposit_id FOR UPDATE;
  IF NOT FOUND OR d.status <> 'pending' THEN
    RAISE EXCEPTION 'Deposit not pending';
  END IF;

  IF _approve THEN
    UPDATE public.deposits SET status='approved', admin_remarks=_remarks, reviewed_at=now() WHERE id=_deposit_id;
    UPDATE public.wallets
      SET balance = balance + d.amount,
          total_deposits = total_deposits + d.amount,
          updated_at = now()
      WHERE user_id = d.user_id;
    INSERT INTO public.transactions (user_id, kind, amount, reference_id, note)
      VALUES (d.user_id, 'deposit', d.amount, d.id, 'Deposit approved');
    INSERT INTO public.notifications (user_id, title, body)
      VALUES (d.user_id, 'Deposit Approved', 'Your deposit of Rs.' || d.amount || ' has been approved.');
  ELSE
    UPDATE public.deposits SET status='rejected', admin_remarks=_remarks, reviewed_at=now() WHERE id=_deposit_id;
    INSERT INTO public.notifications (user_id, title, body)
      VALUES (d.user_id, 'Deposit Rejected', COALESCE(_remarks, 'Your deposit was rejected.'));
  END IF;
END;
$$;

-- =====================================================
-- APPROVE WITHDRAWAL: debit wallet + create tx + notify
-- =====================================================
CREATE OR REPLACE FUNCTION public.admin_review_withdrawal(_wid UUID, _approve BOOLEAN, _remarks TEXT DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  w RECORD;
  wallet_balance NUMERIC;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT * INTO w FROM public.withdrawals WHERE id = _wid FOR UPDATE;
  IF NOT FOUND OR w.status <> 'pending' THEN
    RAISE EXCEPTION 'Withdrawal not pending';
  END IF;

  IF _approve THEN
    SELECT balance INTO wallet_balance FROM public.wallets WHERE user_id = w.user_id FOR UPDATE;
    IF wallet_balance < w.amount THEN
      RAISE EXCEPTION 'Insufficient balance';
    END IF;
    UPDATE public.withdrawals SET status='approved', admin_remarks=_remarks, reviewed_at=now() WHERE id=_wid;
    UPDATE public.wallets
      SET balance = balance - w.amount,
          total_withdrawals = total_withdrawals + w.amount,
          updated_at = now()
      WHERE user_id = w.user_id;
    INSERT INTO public.transactions (user_id, kind, amount, reference_id, note)
      VALUES (w.user_id, 'withdrawal', -w.amount, w.id, 'Withdrawal approved');
    INSERT INTO public.notifications (user_id, title, body)
      VALUES (w.user_id, 'Withdrawal Approved', 'Your withdrawal of Rs.' || w.amount || ' has been approved.');
  ELSE
    UPDATE public.withdrawals SET status='rejected', admin_remarks=_remarks, reviewed_at=now() WHERE id=_wid;
    INSERT INTO public.notifications (user_id, title, body)
      VALUES (w.user_id, 'Withdrawal Rejected', COALESCE(_remarks, 'Your withdrawal was rejected.'));
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_review_deposit(UUID, BOOLEAN, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_review_withdrawal(UUID, BOOLEAN, TEXT) TO authenticated;
