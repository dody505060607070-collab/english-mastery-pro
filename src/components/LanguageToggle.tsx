import { Languages } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useLang } from "@/lib/i18n";

export function LanguageToggle() {
  const { lang, setLang } = useLang();
  const next = lang === "en" ? "ar" : "en";

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="fixed end-4 top-4 z-[70] gap-1.5 bg-background/95 shadow-md backdrop-blur"
      onClick={() => setLang(next)}
      aria-label={next === "ar" ? "Switch to Arabic" : "Switch to English"}
      title={next === "ar" ? "العربية" : "English"}
    >
      <Languages className="h-4 w-4" />
      {next === "ar" ? "العربية" : "EN"}
    </Button>
  );
}