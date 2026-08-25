import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "ar" | "en";

const dict = {
  nav_home: { ar: "الرئيسية", en: "Home" },
  nav_courses: { ar: "الدورات", en: "Courses" },
  nav_dashboard: { ar: "لوحة التحكم", en: "Dashboard" },
  nav_profile: { ar: "الملف الشخصي", en: "Profile" },
  nav_practice: { ar: "التدريب", en: "Practice" },
  nav_login: { ar: "دخول", en: "Sign in" },
  nav_start: { ar: "ابدأ الآن", en: "Get started" },
  footer_quick_links: { ar: "روابط سريعة", en: "Quick links" },
  footer_legal: { ar: "قانوني", en: "Legal" },
  footer_contact: { ar: "تواصل معنا", en: "Contact us" },
  footer_privacy: { ar: "سياسة الخصوصية", en: "Privacy policy" },
  footer_terms: { ar: "شروط الاستخدام", en: "Terms of use" },
  footer_about_us: { ar: "من نحن", en: "About us" },
  footer_faq: { ar: "الأسئلة الشائعة", en: "FAQ" },
  footer_home: { ar: "الرئيسية", en: "Home" },
  course_students: { ar: "طالب", en: "students" },
  course_lang_ar: { ar: "بالعربية", en: "In Arabic" },
  course_free: { ar: "مجاناً", en: "Free" },
  course_egp: { ar: "ج.م", en: "EGP" },
  course_subscribe: { ar: "اشترك الآن", en: "Subscribe now" },
  view_all_faq: { ar: "عرض كافة الأسئلة", en: "View all questions" },
  categories_view_all: { ar: "عرض جميع الأقسام", en: "View all categories" },
  cta_register_now: { ar: "سجل حسابك الآن", en: "Create your account" },
  cta_talk_advisor: { ar: "تحدث مع مستشار", en: "Talk to an advisor" },
  stats_rating: { ar: "تقييم 4.9/5", en: "Rated 4.9/5" },
  stats_active_students: { ar: "طالب نشط حالياً", en: "active students" },
} as const;

export type DictKey = keyof typeof dict;

interface LangContextValue {
  lang: Lang;
  dir: "rtl" | "ltr";
  setLang: (l: Lang) => void;
  t: (k: DictKey) => string;
}

const LanguageContext = createContext<LangContextValue>({
  lang: "en",
  dir: "rtl",
  setLang: () => {},
  t: (k) => dict[k].ar,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    try {
      window.localStorage.setItem("app-lang", "en");
    } catch {
      /* ignore */
    }
  }, []);


  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);

  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      window.localStorage.setItem("app-lang", l);
    } catch {
      /* ignore */
    }
  };

  const value: LangContextValue = {
    lang,
    dir: lang === "ar" ? "rtl" : "ltr",
    setLang,
    t: (k) => dict[k][lang],
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLang() {
  return useContext(LanguageContext);
}
