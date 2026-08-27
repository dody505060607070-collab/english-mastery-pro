import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, BookMarked, CheckCircle2, Loader2, NotebookPen, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { listMyWords, deleteMyWord, updateMyWord } from "@/lib/learning.functions";
import { SpeakButton } from "@/components/InteractiveText";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/my-words")({
  head: () => ({
    meta: [
      { title: "My Dictionary — Saved Words" },
      { name: "description", content: "Review the English words you have saved with translation, pronunciation and examples." },
      { property: "og:title", content: "My Dictionary — Saved Words" },
      {
        property: "og:description",
        content: "Review the English words you have saved with translation, pronunciation and examples.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MyWordsPage,
});

type Tab = "all" | "starred" | "mastered";

function MyWordsPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("all");
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const { data = [], isLoading } = useQuery({ queryKey: ["my-words"], queryFn: () => listMyWords() });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["my-words"] });

  const remove = useMutation({
    mutationFn: (id: string) => deleteMyWord({ data: { id } }),
    onSuccess: () => {
      toast.success("Deleted");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: (vars: { id: string; starred?: boolean; mastered?: boolean; notes?: string | null }) =>
      updateMyWord({ data: vars }),
    onSuccess: () => invalidate(),
    onError: (e: Error) => toast.error(e.message),
  });

  const counts = {
    all: data.length,
    starred: data.filter((w) => w.starred).length,
    mastered: data.filter((w) => w.mastered).length,
  };
  const list = data.filter((w) => (tab === "all" ? true : tab === "starred" ? w.starred : w.mastered));

  const tabs: { key: Tab; label: string }[] = [
    { key: "all", label: "All words" },
    { key: "starred", label: "Starred" },
    { key: "mastered", label: "Mastered" },
  ];

  return (
    <div className="min-h-screen bg-background font-['Outfit'] p-4 pb-24" dir="ltr">
      <div className="mx-auto max-w-2xl space-y-5">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/dashboard">
              <ArrowRight className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-black">My Dictionary</h1>
            <p className="text-sm text-muted-foreground">{data.length} saved words</p>
          </div>
          <Button variant="outline" size="sm" asChild className="ml-auto rounded-xl">
            <Link to="/dictionary">Dictionary</Link>
          </Button>
        </div>

        <div className="flex gap-2 rounded-2xl bg-muted/60 p-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                "flex-1 rounded-xl px-3 py-2 text-sm font-bold transition",
                tab === t.key ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label} <span className="text-xs opacity-70">({counts[t.key]})</span>
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
          </div>
        ) : list.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-16 text-center text-muted-foreground">
              <BookMarked className="h-10 w-10" />
              <p>
                {tab === "all"
                  ? "You haven't saved any word yet. Double-tap any word inside lessons, or search the dictionary to add it here."
                  : tab === "starred"
                    ? "No starred words yet. Tap the star on a word to review it later."
                    : "No mastered words yet. Mark a word as mastered once you know it well."}
              </p>
              <Button asChild className="mt-2 rounded-xl">
                <Link to="/dictionary">Open Dictionary</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {list.map((w) => (
              <Card key={w.id} className={cn("transition", w.mastered && "border-emerald-500/40 bg-emerald-500/5")}>
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <WordTitle word={w.word} />
                        <SpeakButton text={w.word} />
                      </div>
                      <HighlightRow word={w.word} />
                      {w.part_of_speech && (
                        <span className="inline-block rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold text-muted-foreground" dir="ltr">
                          {w.part_of_speech}
                        </span>
                      )}
                      {w.translation && <p className="font-bold">{w.translation}</p>}
                      {w.phonetic && (
                        <p dir="ltr" className="text-xs text-muted-foreground">
                          {w.phonetic}
                        </p>
                      )}
                      {w.example && (
                        <p dir="ltr" className="text-sm italic text-muted-foreground">
                          {w.example}
                        </p>
                      )}
                      {w.example_ar && <p className="text-xs text-muted-foreground">{w.example_ar}</p>}
                      {w.notes && (
                        <p className="rounded-lg bg-amber-500/10 px-2 py-1 text-xs text-amber-700 dark:text-amber-300">{w.notes}</p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        title={w.starred ? "Unstar" : "Star for review"}
                        onClick={() => update.mutate({ id: w.id, starred: !w.starred })}
                      >
                        <Star className={cn("h-4 w-4", w.starred ? "fill-amber-400 text-amber-500" : "text-muted-foreground")} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title={w.mastered ? "Mark as learning" : "Mark as mastered"}
                        onClick={() => update.mutate({ id: w.id, mastered: !w.mastered })}
                      >
                        <CheckCircle2 className={cn("h-4 w-4", w.mastered ? "text-emerald-600" : "text-muted-foreground")} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Personal note"
                        onClick={() => {
                          setNoteFor(noteFor === w.id ? null : w.id);
                          setNoteText(w.notes ?? "");
                        }}
                      >
                        <NotebookPen className="h-4 w-4 text-muted-foreground" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => remove.mutate(w.id)} disabled={remove.isPending}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  {noteFor === w.id && (
                    <div className="space-y-2">
                      <Textarea
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        placeholder="Write your own note about this word…"
                        className="rounded-xl"
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="rounded-xl"
                          disabled={update.isPending}
                          onClick={() => {
                            update.mutate({ id: w.id, notes: noteText.trim() || null });
                            setNoteFor(null);
                          }}
                        >
                          Save note
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setNoteFor(null)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

