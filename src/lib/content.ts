import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Lang } from "@/lib/i18n";

export type ContentValue = {
  ar?: unknown;
  en?: unknown;
  value?: unknown;
};
export type SiteContent = Record<string, ContentValue>;
export type ContentItem = Record<string, string>;

export function useSiteContent() {
  return useQuery({
    queryKey: ["site-content"],
    staleTime: 60_000,
    queryFn: async (): Promise<SiteContent> => {
      const { data, error } = await supabase.from("site_content").select("key, value");
      if (error) throw error;
      const map: SiteContent = {};
      for (const row of data ?? []) map[row.key] = row.value as ContentValue;
      return map;
    },
  });
}

export function pickText(v: ContentValue | undefined, lang: Lang, fallback = ""): string {
  if (!v) return fallback;
  const raw = v[lang] ?? v.ar ?? v.en ?? v.value;
  return typeof raw === "string" && raw.trim() ? raw : fallback;
}

export function pickList(v: ContentValue | undefined, lang: Lang): ContentItem[] {
  if (!v) return [];
  const raw = v[lang] ?? v.ar ?? v.en;
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (i): i is ContentItem => !!i && typeof i === "object" && !Array.isArray(i),
  ) as ContentItem[];
}
