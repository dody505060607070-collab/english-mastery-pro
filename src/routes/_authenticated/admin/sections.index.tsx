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
  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-sections"] });

  const { data: sections = [], isLoading } = useQuery({
    queryKey: ["admin-sections"],
    queryFn: () => listSections(),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteSection({ data: { id } }),
    onSuccess: () => {
      toast.success("تم حذف المستوى");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const duplicate = useMutation({
    mutationFn: (id: string) => duplicateSection({ data: { id } }),
    onSuccess: () => {
      toast.success("تم نسخ المستوى بوحداته ومحتواه (مخفي حتى تراجعه)");
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
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-muted-foreground font-bold">
          كل مستوى مستقل تماماً — لا يشترط إنهاء مستوى لفتح آخر. تحكّم هنا في الإظهار والقفل والترتيب والنسخ.
        </p>
        <Button onClick={() => setEditing({ name: "", description: "", is_visible: true, is_locked: false } as any)}>
          <Plus className="h-4 w-4 ml-2" />
          مستوى جديد
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
                      <p className="text-xs text-muted-foreground">{s.description || "بدون وصف"}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant={s.is_visible ? "secondary" : "outline"} className="gap-1">
                      {s.is_visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                      {s.is_visible ? "ظاهر" : "مخفي"}
                    </Badge>
                    <Badge variant={(s as any).is_locked ? "destructive" : "secondary"} className="gap-1">
                      {(s as any).is_locked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                      {(s as any).is_locked ? "مقفل" : "مفتوح"}
                    </Badge>
                  </div>
                </div>

                <div className="flex gap-4 text-xs font-bold text-muted-foreground">
                  <span>{s.unitCount} وحدة</span>
                  <span>{s.studentCount} طالب</span>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <Button size="sm" asChild>
                    <Link to="/admin/sections/$sectionId" params={{ sectionId: s.id }}>
                      الوحدات
                      <ArrowLeft className="h-4 w-4 mr-1" />
                    </Link>
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditing(s)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    title={s.is_visible ? "إخفاء" : "إظهار"}
                    onClick={() => toggle.mutate({ ...s, patch: { is_visible: !s.is_visible } })}
                  >
                    {s.is_visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    title={(s as any).is_locked ? "فتح للطلاب" : "قفل"}
                    onClick={() => toggle.mutate({ ...s, patch: { is_locked: !(s as any).is_locked } })}
                  >
                    {(s as any).is_locked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    title="نسخ المستوى"
                    disabled={duplicate.isPending}
                    onClick={() => duplicate.mutate(s.id)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" title="لأعلى" onClick={() => move(i, -1)}>
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" title="لأسفل" onClick={() => move(i, 1)}>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      if (confirm(`حذف المستوى "${s.name}"؟`)) remove.mutate(s.id);
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
      toast.success("تم الحفظ");
      qc.invalidateQueries({ queryKey: ["admin-sections"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent dir="rtl">
        <DialogHeader>
          <DialogTitle className="font-black">{section.id ? "تعديل المستوى" : "مستوى جديد"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="font-bold">اسم المستوى</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: B1.1" />
          </div>
          <div className="space-y-2">
            <Label className="font-bold">الوصف</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <div className="flex items-center justify-between rounded-xl border p-3">
            <Label className="font-bold">ظاهر للطلاب</Label>
            <Switch checked={visible} onCheckedChange={setVisible} />
          </div>
          <div className="flex items-center justify-between rounded-xl border p-3">
            <div>
              <Label className="font-bold">مقفل</Label>
              <p className="text-[11px] text-muted-foreground font-bold">الطلاب يرونه لكن لا يستطيعون الدخول</p>
            </div>
            <Switch checked={locked} onCheckedChange={setLocked} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            إلغاء
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || !name.trim()}>
            {save.isPending && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
            حفظ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
