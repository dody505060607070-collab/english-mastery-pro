import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Layers,
  ArrowLeft,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Copy,
  ChevronUp,
  ChevronDown,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  listSections,
  saveSection,
  deleteSection,
  duplicateSection,
  reorderSections,
} from "@/lib/admin-manage.functions";

export const Route = createFileRoute("/_authenticated/admin/sections/")({
  component: SectionsPage,
});

type Section = Awaited<ReturnType<typeof listSections>>[number];

function SectionsPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<Section> | null>(null);
  const [deleting, setDeleting] = useState<Section | null>(null);
  const [deleteTyped, setDeleteTyped] = useState("");
  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-sections"] });

  const { data: sections = [], isLoading } = useQuery({
    queryKey: ["admin-sections"],
    queryFn: () => listSections(),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteSection({ data: { id } }),
    onSuccess: () => {
      toast.success("Level deleted");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const duplicate = useMutation({
    mutationFn: (id: string) => duplicateSection({ data: { id } }),
    onSuccess: () => {
      toast.success("Level duplicated with its units and content (hidden until you review it)");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: (s: Section & { patch: { is_visible?: boolean; is_locked?: boolean } }) =>
      saveSection({ data: { id: s.id, name: s.name, description: s.description, ...s.patch } }),
    onSuccess: () => invalidate(),
    onError: (e: Error) => toast.error(e.message),
  });

  const reorder = useMutation({
    mutationFn: (items: { id: string; order_index: number }[]) => reorderSections({ data: { items } }),
    onSuccess: () => invalidate(),
    onError: (e: Error) => toast.error(e.message),
  });

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= sections.length) return;
    const a = sections[index]!;
    const b = sections[target]!;
    reorder.mutate([
      { id: a.id, order_index: b.order_index },
      { id: b.id, order_index: a.order_index },
    ]);
  };

  return (
    <div className="space-y-6" dir="ltr">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-muted-foreground font-bold">
          Each level is completely independent — finishing one level is not required to unlock another. Control visibility, locking, order, and duplication here.
        </p>
        <Button onClick={() => setEditing({ name: "", description: "", is_visible: true, is_locked: false } as any)}>
          <Plus className="h-4 w-4 ml-2" />
          New Level
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {sections.map((s, i) => (
            <Card key={s.id} className="border-border/60 hover:border-primary/40 transition-colors">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 text-primary p-2.5 rounded-2xl">
                      <Layers className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-black text-lg">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{s.description || "No description"}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant={s.is_visible ? "secondary" : "outline"} className="gap-1">
                      {s.is_visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                      {s.is_visible ? "Visible" : "Hidden"}
                    </Badge>
                    <Badge variant={(s as any).is_locked ? "destructive" : "secondary"} className="gap-1">
                      {(s as any).is_locked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                      {(s as any).is_locked ? "Locked" : "Open"}
                    </Badge>
                  </div>
                </div>

                <div className="flex gap-4 text-xs font-bold text-muted-foreground">
                  <span>{s.unitCount} unit</span>
                  <span>{s.studentCount} student</span>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <Button size="sm" asChild>
                    <Link to="/admin/sections/$sectionId" params={{ sectionId: s.id }}>
                      Units
                      <ArrowLeft className="h-4 w-4 mr-1" />
                    </Link>
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditing(s)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    title={s.is_visible ? "Hide" : "Show"}
                    onClick={() => toggle.mutate({ ...s, patch: { is_visible: !s.is_visible } })}
                  >
                    {s.is_visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    title={(s as any).is_locked ? "Open for students" : "Lock"}
                    onClick={() => toggle.mutate({ ...s, patch: { is_locked: !(s as any).is_locked } })}
                  >
                    {(s as any).is_locked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    title="Duplicate Level"
                    disabled={duplicate.isPending}
                    onClick={() => duplicate.mutate(s.id)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" title="Up" onClick={() => move(i, -1)}>
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" title="Down" onClick={() => move(i, 1)}>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      setDeleteTyped("");
                      setDeleting(s);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {editing && <SectionDialog section={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function SectionDialog({ section, onClose }: { section: Partial<Section>; onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState(section.name ?? "");
  const [description, setDescription] = useState(section.description ?? "");
  const [visible, setVisible] = useState(section.is_visible ?? true);
  const [locked, setLocked] = useState<boolean>(((section as any).is_locked as boolean) ?? false);

  const save = useMutation({
    mutationFn: () =>
      saveSection({
        data: {
          ...(section.id ? { id: section.id } : {}),
          name,
          description: description || null,
          is_visible: visible,
          is_locked: locked,
        },
      }),
    onSuccess: () => {
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["admin-sections"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent dir="ltr">
        <DialogHeader>
          <DialogTitle className="font-black">{section.id ? "Edit Level" : "New Level"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="font-bold">Level Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Example: B1.1" />
          </div>
          <div className="space-y-2">
            <Label className="font-bold">Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <div className="flex items-center justify-between rounded-xl border p-3">
            <Label className="font-bold">Visible to students</Label>
            <Switch checked={visible} onCheckedChange={setVisible} />
          </div>
          <div className="flex items-center justify-between rounded-xl border p-3">
            <div>
              <Label className="font-bold">Locked</Label>
              <p className="text-[11px] text-muted-foreground font-bold">Students can see it but cannot enter</p>
            </div>
            <Switch checked={locked} onCheckedChange={setLocked} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || !name.trim()}>
            {save.isPending && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
