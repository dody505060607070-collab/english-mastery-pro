import { useLocation } from "@tanstack/react-router";
import { useSiteContent, pickText } from "@/lib/content";

/** Small floating WhatsApp button. Hidden while a student is inside a lesson/video/exercise. */
export function WhatsAppFab() {
  const location = useLocation();
  const { data } = useSiteContent();

  const hiddenPrefixes = [
    "/learn/",
    "/quiz/",
    "/course/",
    "/practice/",
    "/placement-test",
    "/live",
    "/recordings",
    "/admin",
  ];
  if (hiddenPrefixes.some((p) => location.pathname.startsWith(p))) return null;

  const raw = pickText(data?.["contact.whatsapp"], "ar", "");
  const number = raw.replace(/[^0-9]/g, "");
  if (!number) return null;

  return (
    <a
      href={`https://wa.me/${number}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="WhatsApp"
      className="fixed left-4 bottom-4 z-40 h-11 w-11 rounded-full bg-[#25D366] text-white shadow-lg shadow-black/20 flex items-center justify-center hover:scale-105 transition-transform"
    >
      <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current" aria-hidden="true">
        <path d="M17.47 14.38c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.95 1.17-.17.2-.35.22-.65.07-.3-.15-1.27-.47-2.42-1.49-.9-.8-1.5-1.79-1.67-2.09-.17-.3-.02-.47.13-.62.15-.15.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.21-.24-.58-.49-.5-.67-.5h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.49 0 1.47 1.07 2.89 1.22 3.09.15.2 2.1 3.34 5.1 4.56 2.99 1.22 3.32 1 3.92.94.6-.05 1.94-.79 2.21-1.56.27-.77.27-1.42.2-1.56-.08-.15-.28-.22-.58-.37zM12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.39 1.26 4.82L2 22l5.4-1.41a9.85 9.85 0 0 0 4.64 1.18h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2z" />
      </svg>
    </a>
  );
}
