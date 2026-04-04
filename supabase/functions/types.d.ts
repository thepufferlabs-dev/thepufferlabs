// Type declarations for Supabase Edge Functions (Deno runtime)

declare namespace Deno {
  function serve(handler: (req: Request) => Promise<Response> | Response): void;

  namespace env {
    function get(key: string): string | undefined;
  }
}

declare module "https://esm.sh/@supabase/supabase-js@2" {
  export { createClient } from "@supabase/supabase-js";
}
