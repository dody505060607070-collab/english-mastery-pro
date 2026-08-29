import { BookOpen, CircleHelp } from "lucide-react";

import { InteractiveText } from "@/components/InteractiveText";

type ReadingSection = { title: string; text: string };

function readingSections(body: string): ReadingSection[] {
  return body
    .split(/\n(?=#{1,4}\s)/)
    .map((chunk) => {
      const match = chunk.trim().match(/^#{1,4}\s*([^\n]+)\n?([\s\S]*)$/);
      return match
        ? { title: match[1]?.trim() ?? "", text: match[2]?.trim() ?? "" }
        : { title: "Reading", text: chunk.trim() };
    })
    .filter((section) => section.text);
}

export function ReadingLesson({ body }: { body: string }) {
  const sections = readingSections(body);
  const passage = sections.find((section) => /^(text|reading|passage|story|article)$/i.test(section.title)) ?? sections[0];
  const activities = sections.filter((section) => section !== passage);

  if (!passage) return null;

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-2xl border border-primary/30 bg-card shadow-sm">
        <header className="flex items-center gap-3 border-b border-primary/20 bg-primary/10 px-4 py-3">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-card text-primary shadow-sm">
            <BookOpen className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[10px] font-black uppercase text-primary">Reading passage</p>
            <h3 className="text-base font-black">{passage.title || "Text"}</h3>
          </div>
        </header>
        <div className="px-5 py-5 md:px-7 md:py-6">
          <InteractiveText text={passage.text} className="text-[17px] leading-9 text-foreground" />
        </div>
      </section>

      {activities.map((section) => (
        <section key={section.title} className="rounded-2xl border border-border/70 bg-muted/25 p-4 md:p-5">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-black text-primary">
            <CircleHelp className="h-4 w-4" />
            {section.title}
          </h3>
          <InteractiveText text={section.text} className="text-[15px] leading-8 text-foreground/90" />
        </section>
      ))}
    </div>
  );
}