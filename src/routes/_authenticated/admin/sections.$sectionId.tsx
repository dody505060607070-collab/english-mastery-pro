import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Plus, Pencil, Trash2, Copy, ArrowRight, BookOpen } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { listUnits, saveUnit, deleteUnit, duplicateUnit } from "@/lib/admin-manage.functions";

export const Route = createFileRoute("/_authenticated/admin/sections/$sectionId")({
  component: SectionUnitsPage,
});

type UnitRow = Awaited<ReturnType<typeof listUnits>>["units"][number];

function SectionUnitsPage() {
  const { sectionId } = useParams({ from: "/_authenticated/admin/sections/$sectionId" });
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<UnitRow> | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-units", sectionId],
    queryFn: () => listUnits({ data: { sectionId } }),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-units", sectionId] });

  const remove = useMutation({
    mutationFn: (id: string) => deleteUnit({ data: { id } }),
    onSuccess: () => {
      toast.success("Unit deleted");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const duplicate = useMutation({
    mutationFn: (id: string) => duplicateUnit({ data: { id } }),
    onSuccess: () => {
      toast.success("Unit duplicated");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6" dir="ltr">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/admin/sections">
              <ArrowRight className="h-4 w-4 ml-1" />
              Levels
            </Link>
          </Button>
          <h1 className="text-xl font-black">{data?.section?.name ?? "Units"}</h1>
        </div>
        <Button onClick={() => setEditing({ title: "", description: "", is_active: true })}>
          <Plus className="h-4 w-4 ml-2" />
          New Unit
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (data?.units.length ?? 0) === 0 ? (
        <Card>
          <CardContent className="py-14 text-center text-muted-foreground font-bold">
            No units in this level yet
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {data!.units.map((u) => (
            <Card key={u.id} className="border-border/60">
              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="bg-primary/10 text-primary p-3 rounded-2xl">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-black truncate">{u.title}</p>
                    {!u.is_active && <Badge variant="outline">Inactive</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {u.contentCount} item • {u.publishedCount} published
                  </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" asChild>
                    <Link to="/admin/units/$unitId" params={{ unitId: u.id }}>
                      Content
                    </Link>
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditing(u)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => duplicate.mutate(u.id)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      if (confirm(`Delete unit "${u.title}"?`)) remove.mutate(u.id);
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

      {editing && (
        <UnitDialog
          unit={editing}
          sectionId={sectionId}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            invalidate();
          }}
        />
      )}
    </div>
  );
}

function UnitDialog({
  unit,
  sectionId,
  onClose,
  onSaved,
}: {
  unit: Partial<UnitRow>;
  sectionId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(unit.title ?? "");
  const [description, setDescription] = useState(unit.description ?? "");
  const [active, setActive] = useState(unit.is_active ?? true);

  const save = useMutation({
    mutationFn: () =>
      saveUnit({
        data: {
          ...(unit.id ? { id: unit.id } : {}),
          sectionId,
          title,
          description: description || null,
          is_active: active,
        },
      }),
    onSuccess: () => {
      toast.success("Saved");
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent dir="ltr">
        <DialogHeader>
          <DialogTitle className="font-black">{unit.id ? "Edit Unit" : "New Unit"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="font-bold">Unit Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Unit 1: Greetings" />
          </div>
          <div className="space-y-2">
            <Label className="font-bold">Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <div className="flex items-center justify-between rounded-xl border p-3">
            <Label className="font-bold">Active for students</Label>
            <Switch checked={active} onCheckedChange={setActive} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || !title.trim()}>
            {save.isPending && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
