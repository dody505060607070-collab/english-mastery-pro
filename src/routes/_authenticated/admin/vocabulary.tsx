import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileText, Search, Volume2, Plus, Pencil, Trash2, Sparkles, Loader2 } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import {
  listVocabulary,
  saveVocabulary,
  deleteVocabulary,
  enrichWord,
  type AdminWord,
} from "@/lib/vocabulary-admin.functions";

export const Route = createFileRoute("/_authenticated/admin/vocabulary")({
  component: AdminVocabulary,
});

type Draft = Partial<AdminWord>;

function AdminVocabulary() {
  const qc = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [editing, setEditing] = useState<Draft | null>(null);
  const { speak } = useTextToSpeech();

  const { data: words = [], isLoading } = useQuery({
    queryKey: ["admin-vocabulary"],
    queryFn: () => listVocabulary(),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteVocabulary({ data: { id } }),
    onSuccess: () => {
      toast.success("Word deleted");
      qc.invalidateQueries({ queryKey: ["admin-vocabulary"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const q = searchTerm.trim().toLowerCase();
  const filtered = words.filter(
    (w) => !q || w.word.toLowerCase().includes(q) || (w.translation ?? "").toLowerCase().includes(q),
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 font-['Outfit']" dir="ltr">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div>
          <h1 className="text-2xl font-black">Dictionary Management</h1>
          <p className="text-muted-foreground text-sm">
            {words.length} words — add words, translations, and pronunciation for students.
          </p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search for a word..."
              className="pr-10 rounded-xl"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button className="rounded-xl gap-2" onClick={() => setEditing({ word: "", translation: "" })}>
            <Plus className="h-4 w-4" />
            Add Word
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">Word</TableHead>
              <TableHead className="text-right">Translation</TableHead>
              <TableHead className="text-right">Category</TableHead>
              <TableHead className="text-right">Pronunciation</TableHead>
              <TableHead className="text-right">Example</TableHead>
              <TableHead className="w-[110px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [1, 2, 3, 4, 5].map((i) => (
                <TableRow key={i}>
                  <TableCell colSpan={6}>
                    <div className="h-10 w-full bg-muted animate-pulse rounded" />
                  </TableCell>
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-14 text-center text-muted-foreground">
                  <FileText className="mx-auto mb-2 h-6 w-6" />
                  No words yet — click "Add Word".
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-bold text-primary" dir="ltr">
                    {item.word}
                  </TableCell>
                  <TableCell>{item.translation}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">
                      {item.category || "General"}
                    </Badge>
                  </TableCell>
                  <TableCell dir="ltr" className="text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={() => speak(item.word)}
                        aria-label={`Pronounce ${item.word}`}
                      >
                        <Volume2 className="h-4 w-4 text-primary" />
                      </Button>
                      <span>{item.phonetic || "—"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[220px] truncate text-xs text-muted-foreground">
                    {item.example_ar || "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setEditing(item)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => {
                          if (confirm(`Delete word "${item.word}"?`)) remove.mutate(item.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {editing && <WordDialog draft={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function WordDialog({ draft, onClose }: { draft: Draft; onClose: () => void }) {
  const qc = useQueryClient();
  const [word, setWord] = useState(draft.word ?? "");
  const [translation, setTranslation] = useState(draft.translation ?? "");
  const [phonetic, setPhonetic] = useState(draft.phonetic ?? "");
  const [phoneticUk, setPhoneticUk] = useState(draft.phonetic_uk ?? "");
  const [category, setCategory] = useState(draft.category ?? "");
  const [exampleAr, setExampleAr] = useState(draft.example_ar ?? "");
  const [premium, setPremium] = useState(draft.is_premium ?? false);

  const enrich = useMutation({
    mutationFn: () => enrichWord({ data: { word: word.trim() } }),
    onSuccess: (d) => {
      if (d.translation) setTranslation(d.translation);
      if (d.phonetic) setPhonetic(d.phonetic);
      if (d.phonetic_uk) setPhoneticUk(d.phonetic_uk);
      if (d.category) setCategory(d.category);
      if (d.example_ar) setExampleAr(d.example_ar);
      toast.success("Data filled automatically");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const save = useMutation({
    mutationFn: () =>
      saveVocabulary({
        data: {
          ...(draft.id ? { id: draft.id } : {}),
          word: word.trim(),
          translation: translation.trim(),
          phonetic: phonetic.trim() || null,
          phonetic_uk: phoneticUk.trim() || null,
          category: category.trim() || null,
          example_ar: exampleAr.trim() || null,
          is_premium: premium,
        },
      }),
    onSuccess: () => {
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["admin-vocabulary"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent dir="ltr" className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-black">{draft.id ? "Edit Word" : "New Word"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="font-bold">Word (English)</Label>
            <div className="flex gap-2">
              <Input dir="ltr" value={word} onChange={(e) => setWord(e.target.value)} placeholder="apple" />
              <Button
                type="button"
                variant="outline"
                className="gap-1 shrink-0"
                disabled={!word.trim() || enrich.isPending}
                onClick={() => enrich.mutate()}
              >
                {enrich.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Auto-fill
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="font-bold">Translation</Label>
            <Input value={translation} onChange={(e) => setTranslation(e.target.value)} placeholder="Apple" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="font-bold">Pronunciation US</Label>
              <Input dir="ltr" value={phonetic} onChange={(e) => setPhonetic(e.target.value)} placeholder="/ˈæp.əl/" />
            </div>
            <div className="space-y-2">
              <Label className="font-bold">Pronunciation UK</Label>
              <Input
                dir="ltr"
                value={phoneticUk}
                onChange={(e) => setPhoneticUk(e.target.value)}
                placeholder="/ˈæp.l̩/"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="font-bold">Category</Label>
            <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="food" />
          </div>
          <div className="space-y-2">
            <Label className="font-bold">Example (Arabic)</Label>
            <Input value={exampleAr} onChange={(e) => setExampleAr(e.target.value)} placeholder="Arabic example sentence" />
          </div>
          <div className="flex items-center justify-between rounded-xl border p-3">
            <Label className="font-bold">Premium Word</Label>
            <Switch checked={premium} onCheckedChange={setPremium} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || !word.trim() || !translation.trim()}>
            {save.isPending && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
