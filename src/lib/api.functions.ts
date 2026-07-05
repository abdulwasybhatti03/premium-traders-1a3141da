import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// ---------- Read own profile + wallet ----------
export const getMe = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: profile }, { data: wallet }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("wallets").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);
    const isAdmin = (roles ?? []).some((r) => r.role === "admin");
    return { profile, wallet, isAdmin };
  });

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { full_name?: string; username?: string; phone?: string; country?: string; avatar_url?: string }) =>
    z.object({
      full_name: z.string().max(120).optional(),
      username: z.string().max(60).optional(),
      phone: z.string().max(30).optional(),
      country: z.string().max(60).optional(),
      avatar_url: z.string().url().max(500).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("profiles").update({ ...data, updated_at: new Date().toISOString() }).eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Payment methods ----------
export const listPaymentMethods = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("payment_methods").select("*").eq("is_active", true).order("sort_order");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// ---------- Deposits ----------
export const listMyDeposits = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("deposits").select("*, payment_methods(label,method_type)")
      .eq("user_id", context.userId).order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createDeposit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { payment_method_id: string; amount: number; reference?: string; screenshot_url?: string }) =>
    z.object({
      payment_method_id: z.string().uuid(),
      amount: z.number().positive().max(10_000_000),
      reference: z.string().max(200).optional(),
      screenshot_url: z.string().url().max(500).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error, data: row } = await context.supabase.from("deposits").insert({
      user_id: context.userId,
      payment_method_id: data.payment_method_id,
      amount: data.amount,
      reference: data.reference,
      screenshot_url: data.screenshot_url,
      status: "pending",
    }).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

// ---------- Withdrawals ----------
export const listMyWithdrawals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("withdrawals").select("*")
      .eq("user_id", context.userId).order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { amount: number; method_type: string; account_title: string; account_number: string }) =>
    z.object({
      amount: z.number().positive().max(10_000_000),
      method_type: z.string().min(1).max(30),
      account_title: z.string().min(1).max(120),
      account_number: z.string().min(1).max(120),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    // eligibility check: total approved deposits >= min
    const { supabase, userId } = context;
    const [{ data: wallet }, { data: setting }, { data: approved }] = await Promise.all([
      supabase.from("wallets").select("balance").eq("user_id", userId).maybeSingle(),
      supabase.from("settings").select("value").eq("key", "min_withdrawal_deposit").maybeSingle(),
      supabase.from("deposits").select("amount").eq("user_id", userId).eq("status", "approved"),
    ]);
    const min = Number(setting?.value ?? 500);
    const totalApproved = (approved ?? []).reduce((s, r) => s + Number(r.amount), 0);
    if (totalApproved < min) throw new Error(`Minimum approved deposit of Rs.${min} is required before withdrawal.`);
    if (!wallet || Number(wallet.balance) < data.amount) throw new Error("Insufficient wallet balance.");

    const { error, data: row } = await supabase.from("withdrawals").insert({
      user_id: userId,
      amount: data.amount,
      method_type: data.method_type,
      account_title: data.account_title,
      account_number: data.account_number,
      status: "pending",
    }).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

// ---------- Transactions ----------
export const listMyTransactions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("transactions").select("*")
      .eq("user_id", context.userId).order("created_at", { ascending: false }).limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// ---------- Notifications ----------
export const listMyNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("notifications").select("*")
      .eq("user_id", context.userId).order("created_at", { ascending: false }).limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const markAllNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase.from("notifications").update({ read: true })
      .eq("user_id", context.userId).eq("read", false);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Admin ----------
async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!data) throw new Error("Forbidden");
}

export const adminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const s = context.supabase;
    const [users, dep, wd, pend] = await Promise.all([
      s.from("profiles").select("id", { count: "exact", head: true }),
      s.from("deposits").select("amount, status"),
      s.from("withdrawals").select("amount, status"),
      s.from("deposits").select("id", { count: "exact", head: true }).eq("status", "pending"),
    ]);
    const deposits = dep.data ?? [];
    const withdrawals = wd.data ?? [];
    const sum = (rows: any[], st?: string) => rows.filter((r) => !st || r.status === st).reduce((a, b) => a + Number(b.amount), 0);
    return {
      totalUsers: users.count ?? 0,
      pendingDeposits: pend.count ?? 0,
      totalDeposits: sum(deposits, "approved"),
      totalWithdrawals: sum(withdrawals, "approved"),
      pendingWithdrawals: withdrawals.filter((w) => w.status === "pending").length,
    };
  });

export const adminListDeposits = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { status?: string } | undefined) =>
    z.object({ status: z.string().optional() }).optional().parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    let q = context.supabase.from("deposits").select("*, profiles(email, full_name, username)").order("created_at", { ascending: false }).limit(200);
    if (data?.status) q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const adminReviewDeposit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; approve: boolean; remarks?: string }) =>
    z.object({ id: z.string().uuid(), approve: z.boolean(), remarks: z.string().max(500).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.rpc("admin_review_deposit", {
      _deposit_id: data.id, _approve: data.approve, _remarks: data.remarks,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminListWithdrawals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { status?: string } | undefined) =>
    z.object({ status: z.string().optional() }).optional().parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    let q = context.supabase.from("withdrawals").select("*, profiles(email, full_name, username)").order("created_at", { ascending: false }).limit(200);
    if (data?.status) q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const adminReviewWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; approve: boolean; remarks?: string }) =>
    z.object({ id: z.string().uuid(), approve: z.boolean(), remarks: z.string().max(500).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.rpc("admin_review_withdrawal", {
      _wid: data.id, _approve: data.approve, _remarks: data.remarks,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminListUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("profiles").select("id, full_name, username, email, phone, country, vip_level, status, created_at")
      .order("created_at", { ascending: false }).limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });
