import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { User } from "lucide-react";

const cache = new Map<string, string>();

export function useAvatarUrl(path?: string | null) {
  const [url, setUrl] = useState<string | null>(path && path.startsWith("http") ? path : null);

  useEffect(() => {
    let active = true;
    if (!path) {
      setUrl(null);
      return;
    }
    if (path.startsWith("http") || path.startsWith("data:")) {
      setUrl(path);
      return;
    }
    const cached = cache.get(path);
    if (cached) {
      setUrl(cached);
      return;
    }
    supabase.storage
      .from("avatars")
      .createSignedUrl(path, 60 * 60)
      .then(({ data }) => {
        if (!active || !data?.signedUrl) return;
        cache.set(path, data.signedUrl);
        setUrl(data.signedUrl);
      });
    return () => {
      active = false;
    };
  }, [path]);

  return url;
}

export function StorageAvatar({
  path,
  name,
  className,
}: {
  path?: string | null;
  name?: string | null;
  className?: string;
}) {
  const url = useAvatarUrl(path);
  const initials = (name || "").trim().slice(0, 1).toUpperCase();

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black shrink-0",
        className,
      )}
    >
      {url ? (
        <img src={url} alt={name || "avatar"} className="h-full w-full object-cover" loading="lazy" />
      ) : initials ? (
        <span>{initials}</span>
      ) : (
        <User className="h-1/2 w-1/2 opacity-60" />
      )}
    </div>
  );
}
