"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { showToast } from "@/components/ui/Toast";

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

/** Upload pending base64 avatar to storage, then update user metadata with the public URL */
async function uploadPendingAvatar(user: User) {
  const meta = user.user_metadata ?? {};
  if (!meta.pending_avatar_upload || !meta.avatar_url?.startsWith("data:")) return;

  try {
    // Convert base64 data URL to Blob
    const res = await fetch(meta.avatar_url);
    const blob = await res.blob();
    const filePath = `${user.id}/avatar.png`;

    const { error } = await supabase.storage.from("avatars").upload(filePath, blob, { upsert: true, contentType: "image/png" });

    if (!error) {
      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(filePath);

      // Replace base64 with public URL and clear pending flag
      await supabase.auth.updateUser({
        data: { avatar_url: publicUrl, pending_avatar_upload: null },
      });
    }
  } catch {
    // Silent fail — avatar stays as base64 until next sign-in
  }
}

/** Sync OAuth demographics into the profiles table on each sign-in */
async function syncProfile(user: User) {
  const meta = user.user_metadata ?? {};

  // Upload pending avatar first so we get the storage URL
  await uploadPendingAvatar(user);

  // Re-read metadata in case avatar URL was updated
  const { data } = await supabase.auth.getUser();
  const freshMeta = data?.user?.user_metadata ?? meta;

  const avatar = freshMeta.avatar_url || freshMeta.picture || null;
  const name = freshMeta.full_name || freshMeta.name || freshMeta.user_name || null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from("profiles") as any)
    .update({
      full_name: name,
      display_name: name,
      avatar_url: avatar,
    })
    .eq("id", user.id);
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Handle auth errors in URL hash (e.g. expired email confirmation links)
    if (typeof window !== "undefined") {
      const hash = window.location.hash;
      if (hash.includes("error=")) {
        const params = new URLSearchParams(hash.substring(1));
        const errorDesc = params.get("error_description");
        if (errorDesc) {
          showToast(errorDesc.replace(/\+/g, " "), "error");
        }
        // Clean up the URL
        window.history.replaceState(null, "", window.location.pathname);
      }
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // Sync profile demographics on sign-in / token refresh
      if (session?.user && (event === "SIGNED_IN" || event === "TOKEN_REFRESHED")) {
        syncProfile(session.user);

        // Clean up auth hash from URL after successful sign-in
        if (typeof window !== "undefined" && window.location.hash.includes("access_token")) {
          window.history.replaceState(null, "", window.location.pathname);
          showToast("Email verified! Welcome to The Puffer Labs.", "success");
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signOut() {
    await supabase.auth.signOut({ scope: "global" });
    setUser(null);
    setSession(null);
  }

  return <AuthContext.Provider value={{ user, session, loading, signOut }}>{children}</AuthContext.Provider>;
}
