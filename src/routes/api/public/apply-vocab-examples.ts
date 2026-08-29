import { createFileRoute } from "@tanstack/react-router";
import { readFileSync } from "fs";

export const Route = createFileRoute("/api/public/apply-vocab-examples")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = request.headers.get("x-cron-secret");
        if (!secret || secret !== process.env["LOVABLE_CRON_SECRET"]) {
          return new Response("Unauthorized", { status: 401 });
        }
        const updates = JSON.parse(readFileSync("/tmp/vocab/updates.json", "utf8")) as {
          id: string;
          example: string;
          example_ar: string;
        }[];
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        let ok = 0;
        const errs: string[] = [];
        for (const u of updates) {
          const { error } = await supabaseAdmin
            .from("vocabulary")
            .update({ example: u.example, example_ar: u.example_ar })
            .eq("id", u.id);
          if (error) errs.push(u.id);
          else ok++;
        }
        return Response.json({ total: updates.length, ok, failed: errs.length, errs: errs.slice(0, 10) });
      },
    },
  },
});
