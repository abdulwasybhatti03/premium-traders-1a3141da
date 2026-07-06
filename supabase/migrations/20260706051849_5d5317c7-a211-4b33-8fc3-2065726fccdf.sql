
-- ============ VIP TIERS ============
CREATE TABLE public.vip_tiers (
  level INT PRIMARY KEY,
  name TEXT NOT NULL,
  min_deposit NUMERIC(14,2) NOT NULL DEFAULT 0,
  daily_bonus_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  color TEXT NOT NULL DEFAULT '#D4AF37',
  perks JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.vip_tiers TO authenticated, anon;
GRANT ALL ON public.vip_tiers TO service_role;
ALTER TABLE public.vip_tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "VIP tiers read all" ON public.vip_tiers FOR SELECT USING (true);
CREATE POLICY "VIP tiers admin write" ON public.vip_tiers FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

INSERT INTO public.vip_tiers (level, name, min_deposit, daily_bonus_percent, color, perks) VALUES
  (0, 'Starter',   0,       0,  '#94A3B8', '["Access to platform","Daily OTP reward"]'::jsonb),
  (1, 'Bronze',    5000,    2,  '#CD7F32', '["+2% daily bonus","Priority support"]'::jsonb),
  (2, 'Silver',    25000,   5,  '#C0C0C0', '["+5% daily bonus","Faster withdrawals"]'::jsonb),
  (3, 'Gold',      100000,  8,  '#D4AF37', '["+8% daily bonus","VIP badge","Exclusive updates"]'::jsonb),
  (4, 'Platinum',  500000,  12, '#E5E4E2', '["+12% daily bonus","Dedicated manager"]'::jsonb),
  (5, 'Diamond',   1000000, 18, '#B9F2FF', '["+18% daily bonus","White-glove service"]'::jsonb);

-- ============ DAILY OTPs ============
CREATE TABLE public.daily_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  reward_percent NUMERIC(5,2) NOT NULL DEFAULT 20,
  active_date DATE NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date,
  expires_at TIMESTAMPTZ NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX daily_otps_active_date_idx ON public.daily_otps(active_date);
CREATE INDEX daily_otps_expires_idx ON public.daily_otps(expires_at DESC);
GRANT SELECT ON public.daily_otps TO authenticated;
GRANT ALL ON public.daily_otps TO service_role;
ALTER TABLE public.daily_otps ENABLE ROW LEVEL SECURITY;
-- Users can read that an OTP exists (metadata) but the code should be entered by them
CREATE POLICY "OTP admin all" ON public.daily_otps FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "OTP read expiry" ON public.daily_otps FOR SELECT TO authenticated USING (true);

-- ============ OTP CLAIMS ============
CREATE TABLE public.otp_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  otp_id UUID NOT NULL REFERENCES public.daily_otps(id) ON DELETE CASCADE,
  amount NUMERIC(14,2) NOT NULL,
  vip_level INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, otp_id)
);
CREATE INDEX otp_claims_user_idx ON public.otp_claims(user_id, created_at DESC);
GRANT SELECT ON public.otp_claims TO authenticated;
GRANT ALL ON public.otp_claims TO service_role;
ALTER TABLE public.otp_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Claims self read" ON public.otp_claims FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

-- ============ VIP refresh ============
CREATE OR REPLACE FUNCTION public.refresh_vip_level(_user_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total NUMERIC;
  new_level INT;
  old_level INT;
  tier_name TEXT;
BEGIN
  SELECT COALESCE(SUM(amount),0) INTO total FROM public.deposits
    WHERE user_id = _user_id AND status = 'approved';
  SELECT level, name INTO new_level, tier_name FROM public.vip_tiers
    WHERE min_deposit <= total ORDER BY level DESC LIMIT 1;
  IF new_level IS NULL THEN new_level := 0; END IF;

  SELECT vip_level INTO old_level FROM public.profiles WHERE id = _user_id;
  IF new_level <> COALESCE(old_level, 0) THEN
    UPDATE public.profiles SET vip_level = new_level, updated_at = now() WHERE id = _user_id;
    IF new_level > COALESCE(old_level, 0) THEN
      INSERT INTO public.notifications (user_id, title, body)
      VALUES (_user_id, 'VIP Upgraded 🎉', 'Congratulations! You are now ' || tier_name || ' (Level ' || new_level || ').');
    END IF;
  END IF;
  RETURN new_level;
END;
$$;

-- ============ Admin create OTP ============
CREATE OR REPLACE FUNCTION public.admin_create_daily_otp(_code TEXT, _reward_percent NUMERIC DEFAULT 20, _hours_valid INT DEFAULT 24)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id UUID;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF _code IS NULL OR length(trim(_code)) < 4 THEN
    RAISE EXCEPTION 'OTP code must be at least 4 characters';
  END IF;

  INSERT INTO public.daily_otps (code, reward_percent, active_date, expires_at, created_by)
  VALUES (
    upper(trim(_code)),
    _reward_percent,
    (now() AT TIME ZONE 'UTC')::date,
    now() + make_interval(hours => _hours_valid),
    auth.uid()
  )
  ON CONFLICT (active_date) DO UPDATE SET
    code = EXCLUDED.code,
    reward_percent = EXCLUDED.reward_percent,
    expires_at = EXCLUDED.expires_at,
    created_by = EXCLUDED.created_by
  RETURNING id INTO new_id;

  -- Broadcast a notification to all users
  INSERT INTO public.notifications (user_id, title, body)
  SELECT id, 'Daily Reward Available 🎁',
    'Today''s reward code is active. Claim ' || _reward_percent || '% of your approved deposits.'
  FROM public.profiles;

  RETURN new_id;
END;
$$;

-- ============ Claim OTP ============
CREATE OR REPLACE FUNCTION public.claim_daily_otp(_code TEXT)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o RECORD;
  uid UUID := auth.uid();
  total_dep NUMERIC;
  bonus NUMERIC;
  reward NUMERIC;
  user_vip INT;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO o FROM public.daily_otps
    WHERE upper(trim(code)) = upper(trim(_code)) AND expires_at > now()
    ORDER BY created_at DESC LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired OTP code';
  END IF;

  IF EXISTS (SELECT 1 FROM public.otp_claims WHERE user_id = uid AND otp_id = o.id) THEN
    RAISE EXCEPTION 'You have already claimed today''s reward';
  END IF;

  SELECT COALESCE(SUM(amount),0) INTO total_dep FROM public.deposits
    WHERE user_id = uid AND status = 'approved';
  IF total_dep <= 0 THEN
    RAISE EXCEPTION 'You need at least one approved deposit to claim rewards';
  END IF;

  SELECT vip_level INTO user_vip FROM public.profiles WHERE id = uid;
  user_vip := COALESCE(user_vip, 0);
  SELECT daily_bonus_percent INTO bonus FROM public.vip_tiers WHERE level = user_vip;
  bonus := COALESCE(bonus, 0);

  reward := round(total_dep * (o.reward_percent + bonus) / 100.0, 2);

  INSERT INTO public.otp_claims (user_id, otp_id, amount, vip_level)
    VALUES (uid, o.id, reward, user_vip);

  UPDATE public.wallets
    SET balance = balance + reward,
        total_rewards = total_rewards + reward,
        updated_at = now()
    WHERE user_id = uid;

  INSERT INTO public.transactions (user_id, kind, amount, reference_id, note)
    VALUES (uid, 'reward', reward, o.id, 'Daily OTP reward (' || (o.reward_percent + bonus) || '%)');

  INSERT INTO public.notifications (user_id, title, body)
    VALUES (uid, 'Reward Credited 💰',
      'Rs. ' || reward || ' has been added to your wallet from today''s reward.');

  RETURN reward;
END;
$$;

-- ============ Update admin_review_deposit to refresh VIP ============
CREATE OR REPLACE FUNCTION public.admin_review_deposit(_deposit_id uuid, _approve boolean, _remarks text DEFAULT NULL::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
    PERFORM public.refresh_vip_level(d.user_id);
  ELSE
    UPDATE public.deposits SET status='rejected', admin_remarks=_remarks, reviewed_at=now() WHERE id=_deposit_id;
    INSERT INTO public.notifications (user_id, title, body)
      VALUES (d.user_id, 'Deposit Rejected', COALESCE(_remarks, 'Your deposit was rejected.'));
  END IF;
END;
$$;
