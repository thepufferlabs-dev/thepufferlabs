"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { useTheme } from "@/components/ThemeProvider";
import { supabase } from "@/lib/supabase";
import { showToast } from "@/components/ui/Toast";
import type { Database } from "@/lib/database.types";

type Section = "profile" | "purchases" | "premium";
type Purchase = Database["public"]["Tables"]["purchases"]["Row"];
type Subscription = Database["public"]["Tables"]["subscriptions"]["Row"];

const SIDEBAR_ITEMS: { id: Section; label: string; icon: React.ReactNode }[] = [
  {
    id: "profile",
    label: "Profile",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    id: "purchases",
    label: "Purchases",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
        <line x1="1" y1="10" x2="23" y2="10" />
      </svg>
    ),
  },
  {
    id: "premium",
    label: "Premium",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
  },
];

export default function AccountPage() {
  const { user, loading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

  const [activeSection, setActiveSection] = useState<Section>("profile");
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prevUserId = useRef<string | null>(null);

  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [purchasesLoading, setPurchasesLoading] = useState(false);

  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [now] = useState(() => Date.now());

  // Sync profile fields when user changes
  /* eslint-disable react-hooks/set-state-in-effect -- intentional: sync profile from auth user once */
  useEffect(() => {
    if (!user || user.id === prevUserId.current) return;
    prevUserId.current = user.id;
    const meta = user.user_metadata ?? {};
    setFullName(meta.full_name || meta.name || "");
    setAvatarUrl(meta.avatar_url || meta.picture || null);
  }, [user]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push(`${basePath}/`);
    }
  }, [user, loading, router, basePath]);

  const loadPurchases = useCallback(async () => {
    if (!user) return;
    setPurchasesLoading(true);
    const { data } = await supabase.from("purchases").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setPurchases((data as Purchase[]) ?? []);
    setPurchasesLoading(false);
  }, [user]);

  const loadSubscription = useCallback(async () => {
    if (!user) return;
    setSubscriptionLoading(true);
    const { data } = await supabase.from("subscriptions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1);
    setSubscription((data as Subscription[])?.[0] ?? null);
    setSubscriptionLoading(false);
  }, [user]);

  function handleSectionChange(section: Section) {
    setActiveSection(section);
    if (section === "purchases") loadPurchases();
    if (section === "premium") loadSubscription();
  }

  async function handleUpdateProfile() {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.auth.updateUser({
      data: { full_name: fullName },
    });
    if (error) {
      showToast(error.message, "error");
    } else {
      showToast("Profile updated!", "success");
    }
    setSaving(false);
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast("Image must be under 5MB", "error");
      return;
    }
    setAvatarUploading(true);
    const filePath = `${user.id}/avatar.png`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file, { upsert: true, contentType: file.type });

    if (uploadError) {
      showToast(uploadError.message, "error");
      setAvatarUploading(false);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(filePath);

    const { error: updateError } = await supabase.auth.updateUser({
      data: { avatar_url: publicUrl, pending_avatar_upload: null },
    });

    if (updateError) {
      showToast(updateError.message, "error");
    } else {
      setAvatarUrl(publicUrl);
      showToast("Avatar updated!", "success");
    }
    setAvatarUploading(false);
  }

  if (loading) {
    return (
      <main className="pt-24 pb-20 min-h-screen flex items-center justify-center">
        <div className="text-text-muted">Loading...</div>
      </main>
    );
  }

  if (!user) return null;

  const inputClass = "w-full rounded-lg border bg-navy-light px-4 py-3 text-sm text-text-primary placeholder:text-text-dim outline-none focus:border-teal/50 transition-colors";

  return (
    <main className="pt-24 pb-20 min-h-screen">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-text-primary mb-8">Account Settings</h1>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar */}
          <aside className="md:w-56 shrink-0">
            <nav className="flex md:flex-col gap-1">
              {SIDEBAR_ITEMS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleSectionChange(item.id)}
                  className={`flex items-center gap-3 px-4 py-3 text-sm rounded-lg transition-all cursor-pointer w-full text-left ${
                    activeSection === item.id ? "text-teal bg-teal/10 font-medium" : "text-text-muted hover:text-text-primary hover:bg-[var(--theme-white-alpha-5)]"
                  }`}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </nav>
          </aside>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Profile Section */}
            {activeSection === "profile" && (
              <div className="flex flex-col gap-8">
                {/* Avatar */}
                <div className="rounded-2xl border p-6" style={{ background: "var(--color-navy-light)", borderColor: "var(--theme-border)" }}>
                  <h2 className="text-lg font-semibold text-text-primary mb-4">Profile Picture</h2>
                  <div className="flex items-center gap-6">
                    <div className="relative">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="Avatar" className="w-20 h-20 rounded-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-20 h-20 rounded-full bg-teal/20 flex items-center justify-center text-teal text-xl font-bold">{(fullName || user.email || "U").charAt(0).toUpperCase()}</div>
                      )}
                      {avatarUploading && (
                        <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                          <div className="w-5 h-5 border-2 border-teal border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}
                    </div>
                    <div>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={avatarUploading}
                        className="rounded-lg border px-4 py-2 text-sm text-text-primary hover:bg-[var(--theme-white-alpha-5)] transition-colors cursor-pointer disabled:opacity-50"
                        style={{ borderColor: "var(--theme-border)" }}
                      >
                        Change Photo
                      </button>
                      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                      <p className="text-xs text-text-dim mt-2">PNG, JPG up to 5MB</p>
                    </div>
                  </div>
                </div>

                {/* Profile details */}
                <div className="rounded-2xl border p-6" style={{ background: "var(--color-navy-light)", borderColor: "var(--theme-border)" }}>
                  <h2 className="text-lg font-semibold text-text-primary mb-4">Personal Info</h2>
                  <div className="flex flex-col gap-4 max-w-md">
                    <div>
                      <label className="block text-xs font-medium text-text-muted mb-1.5">Full Name</label>
                      <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" className={inputClass} style={{ borderColor: "var(--theme-border)" }} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-text-muted mb-1.5">Email</label>
                      <input type="email" value={user.email ?? ""} disabled className={`${inputClass} opacity-60 cursor-not-allowed`} style={{ borderColor: "var(--theme-border)" }} />
                      <p className="text-[11px] text-text-dim mt-1">Email cannot be changed</p>
                    </div>
                    <button
                      onClick={handleUpdateProfile}
                      disabled={saving}
                      className="self-start rounded-lg bg-teal px-6 py-2.5 text-sm font-semibold text-btn-text transition-all hover:bg-teal-dark disabled:opacity-50 cursor-pointer"
                    >
                      {saving ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </div>

                {/* Theme preference */}
                <div className="rounded-2xl border p-6" style={{ background: "var(--color-navy-light)", borderColor: "var(--theme-border)" }}>
                  <h2 className="text-lg font-semibold text-text-primary mb-4">Appearance</h2>
                  <div className="flex items-center justify-between max-w-md">
                    <div>
                      <p className="text-sm text-text-primary">Theme</p>
                      <p className="text-xs text-text-muted mt-0.5">Choose your preferred appearance</p>
                    </div>
                    <div className="flex rounded-lg border overflow-hidden" style={{ borderColor: "var(--theme-border)" }}>
                      <button
                        onClick={() => theme !== "light" && toggleTheme()}
                        className={`flex items-center gap-2 px-4 py-2 text-sm transition-colors cursor-pointer ${
                          theme === "light" ? "bg-teal/10 text-teal font-medium" : "text-text-muted hover:text-text-primary"
                        }`}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="5" />
                          <line x1="12" y1="1" x2="12" y2="3" />
                          <line x1="12" y1="21" x2="12" y2="23" />
                          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                          <line x1="1" y1="12" x2="3" y2="12" />
                          <line x1="21" y1="12" x2="23" y2="12" />
                          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                        </svg>
                        Light
                      </button>
                      <button
                        onClick={() => theme !== "dark" && toggleTheme()}
                        className={`flex items-center gap-2 px-4 py-2 text-sm transition-colors cursor-pointer ${
                          theme === "dark" ? "bg-teal/10 text-teal font-medium" : "text-text-muted hover:text-text-primary"
                        }`}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
                        </svg>
                        Dark
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Purchases Section */}
            {activeSection === "purchases" && (
              <div className="rounded-2xl border p-6" style={{ background: "var(--color-navy-light)", borderColor: "var(--theme-border)" }}>
                <h2 className="text-lg font-semibold text-text-primary mb-4">Purchase History</h2>
                {purchasesLoading ? (
                  <div className="text-text-muted text-sm py-8 text-center">Loading purchases...</div>
                ) : purchases.length === 0 ? (
                  <div className="text-center py-12">
                    <svg
                      className="mx-auto mb-3 text-text-dim"
                      width="40"
                      height="40"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                      <line x1="1" y1="10" x2="23" y2="10" />
                    </svg>
                    <p className="text-sm text-text-muted">No purchases yet</p>
                    <p className="text-xs text-text-dim mt-1">Your purchase history will appear here</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b" style={{ borderColor: "var(--theme-border)" }}>
                          <th className="text-left py-3 px-2 text-text-muted font-medium">Date</th>
                          <th className="text-left py-3 px-2 text-text-muted font-medium">Amount</th>
                          <th className="text-left py-3 px-2 text-text-muted font-medium">Status</th>
                          <th className="text-left py-3 px-2 text-text-muted font-medium">Receipt</th>
                        </tr>
                      </thead>
                      <tbody>
                        {purchases.map((p) => (
                          <tr key={p.id} className="border-b last:border-0" style={{ borderColor: "var(--theme-border)" }}>
                            <td className="py-3 px-2 text-text-primary">{new Date(p.created_at).toLocaleDateString()}</td>
                            <td className="py-3 px-2 text-text-primary">
                              {(p.amount_cents / 100).toFixed(2)} {p.currency}
                            </td>
                            <td className="py-3 px-2">
                              <span
                                className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                  p.status === "paid"
                                    ? "bg-green-500/10 text-green-400"
                                    : p.status === "pending"
                                      ? "bg-yellow-500/10 text-yellow-400"
                                      : p.status === "refunded"
                                        ? "bg-blue-500/10 text-blue-400"
                                        : "bg-red-500/10 text-red-400"
                                }`}
                              >
                                {p.status}
                              </span>
                            </td>
                            <td className="py-3 px-2">
                              {p.receipt_url ? (
                                <a href={p.receipt_url} target="_blank" rel="noopener noreferrer" className="text-teal hover:underline text-xs">
                                  View
                                </a>
                              ) : (
                                <span className="text-text-dim text-xs">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Premium Section */}
            {activeSection === "premium" && (
              <div className="flex flex-col gap-6">
                <div className="rounded-2xl border p-6" style={{ background: "var(--color-navy-light)", borderColor: "var(--theme-border)" }}>
                  <h2 className="text-lg font-semibold text-text-primary mb-4">Premium Status</h2>
                  {subscriptionLoading ? (
                    <div className="text-text-muted text-sm py-8 text-center">Loading subscription...</div>
                  ) : subscription ? (
                    <div className="flex flex-col gap-4">
                      {/* Status badge */}
                      <div className="flex items-center gap-3">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${
                            subscription.status === "active" || subscription.status === "trialing"
                              ? "bg-green-500/10 text-green-400"
                              : subscription.status === "past_due"
                                ? "bg-yellow-500/10 text-yellow-400"
                                : "bg-red-500/10 text-red-400"
                          }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              subscription.status === "active" || subscription.status === "trialing" ? "bg-green-400" : subscription.status === "past_due" ? "bg-yellow-400" : "bg-red-400"
                            }`}
                          />
                          {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
                        </span>
                        <span className="text-xs text-text-dim uppercase tracking-wider">{subscription.interval} plan</span>
                      </div>

                      {/* Details grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                        <div className="rounded-lg border p-4" style={{ borderColor: "var(--theme-border)" }}>
                          <p className="text-xs text-text-dim mb-1">Current Period</p>
                          <p className="text-sm text-text-primary">
                            {new Date(subscription.current_period_start).toLocaleDateString()}
                            {subscription.current_period_end && ` - ${new Date(subscription.current_period_end).toLocaleDateString()}`}
                          </p>
                        </div>
                        {subscription.current_period_end && (
                          <div className="rounded-lg border p-4" style={{ borderColor: "var(--theme-border)" }}>
                            <p className="text-xs text-text-dim mb-1">Expires</p>
                            <p className="text-sm text-text-primary">{new Date(subscription.current_period_end).toLocaleDateString()}</p>
                            {new Date(subscription.current_period_end) > new Date() ? (
                              <p className="text-xs text-green-400 mt-1">{Math.ceil((new Date(subscription.current_period_end).getTime() - now) / (1000 * 60 * 60 * 24))} days remaining</p>
                            ) : (
                              <p className="text-xs text-red-400 mt-1">Expired</p>
                            )}
                          </div>
                        )}
                        {subscription.amount_cents != null && (
                          <div className="rounded-lg border p-4" style={{ borderColor: "var(--theme-border)" }}>
                            <p className="text-xs text-text-dim mb-1">Amount</p>
                            <p className="text-sm text-text-primary">
                              {(subscription.amount_cents / 100).toFixed(2)} {subscription.currency}
                            </p>
                          </div>
                        )}
                        {subscription.canceled_at && (
                          <div className="rounded-lg border p-4" style={{ borderColor: "var(--theme-border)" }}>
                            <p className="text-xs text-text-dim mb-1">Canceled On</p>
                            <p className="text-sm text-red-400">{new Date(subscription.canceled_at).toLocaleDateString()}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <svg
                        className="mx-auto mb-3 text-text-dim"
                        width="40"
                        height="40"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                      <p className="text-sm text-text-muted">No active subscription</p>
                      <p className="text-xs text-text-dim mt-1">Premium plans will be available soon</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
