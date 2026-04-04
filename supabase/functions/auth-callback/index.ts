import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const redirectTo =
    url.searchParams.get("redirect_to") ||
    Deno.env.get("SITE_URL") ||
    "https://thepufferlabs.com";

  if (!code) {
    const errorUrl = `${redirectTo}/#error=missing_code&error_description=No+authorization+code+provided`;
    return Response.redirect(errorUrl, 302);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { flowType: "pkce" },
    });

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      const errorUrl = `${redirectTo}/#error=auth_error&error_description=${encodeURIComponent(error.message)}`;
      return Response.redirect(errorUrl, 302);
    }

    const { session } = data;
    const hashParams = new URLSearchParams({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_in: String(session.expires_in),
      token_type: session.token_type,
      type: "signup",
    });

    return Response.redirect(`${redirectTo}/#${hashParams.toString()}`, 302);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const errorUrl = `${redirectTo}/#error=server_error&error_description=${encodeURIComponent(message)}`;
    return Response.redirect(errorUrl, 302);
  }
});
