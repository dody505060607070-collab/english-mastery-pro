import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Search, Ban, CheckCircle2, Trash2, Pencil, UserPlus, Shield, Layers } from "lucide-react";
import { StudentLevelAccessDialog } from "@/components/admin/StudentLevelAccessDialog";


import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StorageAvatar } from "@/components/StorageAvatar";
import {
  listStudents,
  listSections,
  setStudentBlocked,
  deleteStudent,
  updateStudent,
  setUserRole,
  createStudentByAdmin,
} from "@/lib/admin-manage.functions";

export const Route = createFileRoute("/_authenticated/admin/students")({
  component: StudentsPage,
});

type Student = Awaited<ReturnType<typeof listStudents>>[number];

function StudentsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [sectionId, setSectionId] = useState("all");
  const [status, setStatus] = useState<"all" | "active" | "blocked">("all");
  const [editing, setEditing] = useState<Student | null>(null);
  const [deleting, setDeleting] = useState<Student | null>(null);
  const [accessFor, setAccessFor] = useState<Student | null>(null);
  const [creating, setCreating] = useState(false);


  const sectionsQuery = useQuery({ queryKey: ["admin-sections"], queryFn: () => listSections() });
  const studentsQuery = useQuery({
    queryKey: ["admin-students", search, sectionId, status],
    queryFn: () => listStudents({ data: { search, sectionId, status } }),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-students"] });
    qc.invalidateQueries({ queryKey: ["admin-stats"] });
  };

  const blockMutation = useMutation({
    mutationFn: (v: { userId: string; blocked: boolean }) => setStudentBlocked({ data: v }),
    onSuccess: (_d, v) => {
      toast.success(v.blocked ? "Student blocked" : "Block removed");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (userId: string) => deleteStudent({ data: { userId } }),
    onSuccess: () => {
      toast.success("Student deleted");
      setDeleting(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const students = studentsQuery.data ?? [];
  const sections = sectionsQuery.data ?? [];

  return (
    <div className="space-y-6" dir="ltr">
      <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or phone number"
            className="pr-10 h-11"
          />
        </div>
        <Select value={sectionId} onValueChange={setSectionId}>
          <SelectTrigger className="h-11 lg:w-56">
            <SelectValue placeholder="All sections" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sections</SelectItem>
            {sections.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
          <SelectTrigger className="h-11 lg:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="blocked">Blocked</SelectItem>
          </SelectContent>
        </Select>
        <Button className="h-11" onClick={() => setCreating(true)}>
          <UserPlus className="h-4 w-4 ml-2" />
          New Student
        </Button>
      </div>

      {studentsQuery.isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : students.length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center text-muted-foreground font-bold">
            No students match the search
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {students.map((s) => (
            <Card key={s.id} className="border-border/60">
              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                <StorageAvatar path={s.avatar_url} name={s.full_name} className="h-14 w-14" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-black truncate">{s.full_name || "No name"}</p>
                    {s.is_blocked ? <Badge variant="destructive">Blocked</Badge> : null}
                    {s.roles
                      .filter((r) => r !== "student")
                      .map((r) => (
                        <Badge key={r} variant="secondary">
                          {r}
                        </Badge>
                      ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {s.phone || "—"} • {(s as any).sections?.name ?? "No section"}
                    {s.grade ? ` • ${s.grade}` : ""}
                    {(s as any).units?.title ? ` • ${(s as any).units.title}` : ""}
                  </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" variant="outline" onClick={() => setEditing(s)}>
                    <Pencil className="h-4 w-4 ml-1" />
                    Edit
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setAccessFor(s)}>
                    <Layers className="h-4 w-4 ml-1" />
                    Levels
                  </Button>

                  <Button
                    size="sm"
                    variant={s.is_blocked ? "secondary" : "outline"}
                    onClick={() => blockMutation.mutate({ userId: s.id, blocked: !s.is_blocked })}
                  >
                    {s.is_blocked ? (
                      <CheckCircle2 className="h-4 w-4 ml-1" />
                    ) : (
                      <Ban className="h-4 w-4 ml-1" />
                    )}
                    {s.is_blocked ? "Unblock" : "Block"}
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => setDeleting(s)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <StudentLevelAccessDialog
        student={accessFor}
        sections={sections as any}
        onClose={() => setAccessFor(null)}
      />


      {editing && (
        <EditStudentDialog
          student={editing}
          sections={sections}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            invalidate();
          }}
        />
      )}

      {creating && (
        <CreateStudentDialog
          sections={sections}
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            invalidate();
          }}
        />
      )}

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent dir="ltr">
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently delete student?</AlertDialogTitle>
            <AlertDialogDescription>
              The account of {deleting?.full_name} and all their data will be deleted and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleting && deleteMutation.mutate(deleting.id)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function EditStudentDialog({
  student,
  sections,
  onClose,
  onSaved,
}: {
  student: Student;
  sections: { id: string; name: string }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [fullName, setFullName] = useState(student.full_name ?? "");
  const [grade, setGrade] = useState(student.grade ?? "");
  const [sectionId, setSectionId] = useState(student.section_id ?? "");
  const [role, setRole] = useState(student.roles[0] ?? "student");

  const save = useMutation({
    mutationFn: async () => {
      await updateStudent({
        data: {
          userId: student.id,
          fullName,
          grade: grade || null,
          sectionId: sectionId || null,
        },
      });
      if (role !== (student.roles[0] ?? "student")) {
        await setUserRole({ data: { userId: student.id, role: role as never } });
      }
    },
    onSuccess: () => {
      toast.success("Student data saved");
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent dir="ltr">
        <DialogHeader>
          <DialogTitle className="font-black">Edit Student Data</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="font-bold">Name</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="font-bold">Section</Label>
            <Select value={sectionId} onValueChange={setSectionId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose Section" />
              </SelectTrigger>
              <SelectContent>
                {sections.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="font-bold">Grade / Class</Label>
            <Input value={grade} onChange={(e) => setGrade(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="font-bold flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" /> Role
            </Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["student", "teacher", "admin"].map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreateStudentDialog({
  sections,
  onClose,
  onSaved,
}: {
  sections: { id: string; name: string }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({ fullName: "", phone: "", password: "", sectionId: "", grade: "" });

  const create = useMutation({
    mutationFn: () =>
      createStudentByAdmin({
        data: {
          fullName: form.fullName,
          phone: form.phone,
          password: form.password,
          sectionId: form.sectionId,
          grade: form.grade || null,
        },
      }),
    onSuccess: () => {
      toast.success("Student account created");
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent dir="ltr">
        <DialogHeader>
          <DialogTitle className="font-black">Add New Student</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="font-bold">Full Name</Label>
            <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label className="font-bold">Phone Number</Label>
            <Input
              inputMode="numeric"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label className="font-bold">Password</Label>
            <Input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label className="font-bold">Section</Label>
            <Select value={form.sectionId} onValueChange={(v) => setForm({ ...form, sectionId: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Choose Section" />
              </SelectTrigger>
              <SelectContent>
                {sections.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="font-bold">Grade / Class (optional)</Label>
            <Input value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => create.mutate()} disabled={create.isPending}>
            {create.isPending && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
