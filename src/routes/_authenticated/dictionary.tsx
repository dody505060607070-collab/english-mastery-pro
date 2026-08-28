import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { SaveWordBookmark } from "@/components/SaveWordBookmark";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowRight, BookMarked, Loader2, Plus, Search, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { lookupEntry, suggestWords, recentWords, type DictEntry } from "@/lib/dictionary.functions";
import { saveMyWord } from "@/lib/learning.functions";
import { SpeakButton, speak } from "@/components/InteractiveText";

export const Route = createFileRoute("/_authenticated/dictionary")({
  head: () => ({
    meta: [
      { title: "English Dictionary — Meaning, Pronunciation & Examples" },
      {
        name: "description",
        content: "Search for any English word and get its meaning, pronunciation, examples and synonyms.",
      },
      { property: "og:title", content: "English Dictionary — Meaning, Pronunciation & Examples" },
      {
        property: "og:description",
        content: "Search for any English word and get its meaning, pronunciation, examples and synonyms.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DictionaryPage,
});

const POS_AR: Record<string, string> = {
  noun: "noun",
  verb: "verb",
  adjective: "adjective",
  adverb: "adverb",
  preposition: "preposition",
  pronoun: "pronoun",
  conjunction: "conjunction",
  interjection: "interjection",
};

function DictionaryPage() {
  const [term, setTerm] = useState("");
  const [debounced, setDebounced] = useState("");
  const [entry, setEntry] = useState<DictEntry | null>(null);
  const [showSuggest, setShowSuggest] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(term.trim()), 250);
    return () => clearTimeout(t);
  }, [term]);

  const { data: suggestions = [] } = useQuery({
    queryKey: ["dict-suggest", debounced],
    queryFn: () => suggestWords({ data: { q: debounced } }),
    enabled: debounced.length >= 2,
  });

  const { data: recent = [] } = useQuery({ queryKey: ["dict-recent"], queryFn: () => recentWords() });

  const lookup = useMutation({
    mutationFn: (word: string) => lookupEntry({ data: { word } }),
    onSuccess: (d) => {
      setEntry(d);
      setShowSuggest(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const save = useMutation({
    mutationFn: () => {
      if (!entry) throw new Error("No word to save");
      const sense = entry.senses[0];
      const ex = sense?.examples[0];
      return saveMyWord({
        data: {
          word: entry.word,
          translation: entry.translation,
          ...(entry.phonetic ? { phonetic: entry.phonetic } : {}),
          ...(ex?.en ? { example: ex.en } : {}),
          ...(ex?.ar ? { example_ar: ex.ar } : {}),
          ...(sense?.part_of_speech ? { part_of_speech: sense.part_of_speech } : {}),
        },
      });
    },
    onSuccess: () => toast.success("Added to my dictionary"),
    onError: (e: Error) => toast.error(e.message),
  });

  const search = (word: string) => {
    const w = word.trim();
    if (!w) return;
    setTerm(w);
    lookup.mutate(w);
  };

  return (
    <div className="min-h-screen bg-background font-['Outfit'] p-4 pb-28" dir="ltr">
      <div className="mx-auto max-w-2xl space-y-5">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/dashboard">
              <ArrowRight className="h-5 w-5" />
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-black">Dictionary</h1>
            <p className="text-sm text-muted-foreground">Meaning, pronunciation, examples, synonyms and forms</p>
          </div>
          <Button variant="outline" size="sm" asChild className="rounded-xl gap-1">
            <Link to="/my-words">
              <BookMarked className="h-4 w-4" />
              My Words
            </Link>
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              search(term);
            }}
            className="flex gap-2"
          >
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={inputRef}
                dir="ltr"
                value={term}
                onChange={(e) => {
                  setTerm(e.target.value);
                  setShowSuggest(true);
                }}
                onFocus={() => setShowSuggest(true)}
                placeholder="Type an English word…"
                className="pr-10 h-12 rounded-2xl text-left"
                aria-label="Search for an English word"
              />
            </div>
            <Button type="submit" className="h-12 rounded-2xl px-5" disabled={lookup.isPending}>
              {lookup.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
            </Button>
          </form>

          {showSuggest && suggestions.length > 0 && (
            <Card className="absolute z-20 mt-2 w-full overflow-hidden">
              <CardContent className="p-1">
                {suggestions.map((s) => (
                  <button
                    key={s.word}
                    type="button"
                    onClick={() => search(s.word)}
                    className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-right hover:bg-muted"
                  >
                    <span dir="ltr" className="font-bold">
                      {s.word}
                    </span>
                    <span className="text-sm text-muted-foreground">{s.translation}</span>
                  </button>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Result */}
        {lookup.isPending && (
          <div className="flex justify-center py-14">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
          </div>
        )}

        {!lookup.isPending && entry && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <Card className="relative overflow-hidden rounded-3xl">
              <CardContent className="space-y-2 p-5">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 dir="ltr" className="font-serif text-3xl font-bold tracking-tight">
                        {entry.word}
                      </h2>
                      <SpeakButton text={entry.word} className="h-9 w-9" />
                    </div>
                    {entry.phonetic && (
                      <p dir="ltr" className="text-sm font-medium text-primary">
                        /{entry.phonetic.replace(/^\/|\/$/g, "")}/
                      </p>
                    )}
                  </div>
                  {!entry.notFound && (
                    <SaveWordBookmark
                      word={entry.word}
                      translation={entry.translation}
                      phonetic={entry.phonetic}
                      example={entry.senses?.[0]?.examples?.[0]?.en ?? null}
                    />
                  )}
                </div>
                <p dir="rtl" className="text-sm font-bold text-muted-foreground">
                  {entry.translation}
                </p>

                {entry.notFound && (
                  <p className="text-sm text-muted-foreground">
                    We couldn't recognize this word.
                    {entry.suggestion && (
                      <>
                        {" "}Did you mean{" "}
                        <button
                          type="button"
                          dir="ltr"
                          className="font-bold text-primary underline"
                          onClick={() => search(entry.suggestion!)}
                        >
                          {entry.suggestion}
                        </button>
                        ?
                      </>
                    )}
                  </p>
                )}

                <Button
                  onClick={() => save.mutate()}
                  disabled={save.isPending || entry.notFound}
                  className="w-full rounded-xl gap-2"
                >
                  {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Add to My Dictionary
                </Button>
              </CardContent>
            </Card>

            {entry.senses.map((s, i) => (
              <Card key={i}>
                <CardContent className="space-y-3 p-5">
                  <Badge variant="secondary" className="rounded-full">
                    <span dir="ltr">{s.part_of_speech}</span>
                    {POS_AR[s.part_of_speech.toLowerCase()] ? ` — ${POS_AR[s.part_of_speech.toLowerCase()]}` : ""}
                  </Badge>
                  {s.definition_en && (
                    <p dir="ltr" className="text-sm text-muted-foreground">
                      {s.definition_en}
                    </p>
                  )}
                  {s.definition_ar && <p className="font-semibold">{s.definition_ar}</p>}
                  {s.examples.length > 0 && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        {s.examples.map((ex, j) => (
                          <div key={j} className="rounded-xl bg-muted/50 p-3">
                            <div className="flex items-start gap-2">
                              <button
                                type="button"
                                onClick={() => speak(ex.en)}
                                aria-label="Listen to the example"
                                className="mt-0.5 text-primary"
                              >
                                <Sparkles className="h-4 w-4" />
                              </button>
                              <p dir="ltr" className="flex-1 text-sm italic">
                                {ex.en}
                              </p>
                            </div>
                            {ex.ar && <p className="mt-1 text-sm text-muted-foreground">{ex.ar}</p>}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            ))}

            {entry.forms.length > 0 && (
              <Card>
                <CardContent className="space-y-2 p-5">
                  <h3 className="font-bold">Forms & Conjugations</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {entry.forms.map((f) => (
                      <div key={f.label} className="rounded-lg bg-muted/50 p-2 text-sm">
                        <span className="text-muted-foreground">{f.label}: </span>
                        <span dir="ltr" className="font-bold">
                          {f.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {(entry.synonyms.length > 0 || entry.antonyms.length > 0) && (
              <Card>
                <CardContent className="space-y-3 p-5">
                  {entry.synonyms.length > 0 && (
                    <div>
                      <h3 className="mb-2 font-bold">Similar Words</h3>
                      <div className="flex flex-wrap gap-2">
                        {entry.synonyms.map((w) => (
                          <Badge
                            key={w}
                            variant="outline"
                            className="cursor-pointer rounded-full"
                            onClick={() => search(w)}
                          >
                            <span dir="ltr">{w}</span>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {entry.antonyms.length > 0 && (
                    <div>
                      <h3 className="mb-2 font-bold">Opposite Words</h3>
                      <div className="flex flex-wrap gap-2">
                        {entry.antonyms.map((w) => (
                          <Badge
                            key={w}
                            variant="outline"
                            className="cursor-pointer rounded-full"
                            onClick={() => search(w)}
                          >
                            <span dir="ltr">{w}</span>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {!entry && !lookup.isPending && recent.length > 0 && (
          <Card>
            <CardContent className="space-y-3 p-5">
              <h3 className="font-bold">Recently Searched Words</h3>
              <div className="flex flex-wrap gap-2">
                {recent.map((w) => (
                  <Badge
                    key={w.word}
                    variant="secondary"
                    className="cursor-pointer rounded-full"
                    onClick={() => search(w.word)}
                  >
                    <span dir="ltr">{w.word}</span>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
