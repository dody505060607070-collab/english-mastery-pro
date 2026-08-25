import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  Plus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Users,
  Layout,
  Copy,
  Loader2,
  Layers,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  listCoursesAdmin,
  saveCourse,
  deleteCourse,
  duplicateCourse,
  setCoursePublished,
} from "@/lib/courses-admin.functions";

export const Route = createFileRoute("/_authenticated/admin/courses/")({
  component: AdminCoursesPage,
});

const LEVELS = ["A1.1", "A1.2", "A2.1", "A2.2", "B1.1", "B1.2", "B2.1", "B2.2", "C1.1", "C1.2", "C2.1", "C2.2"];

type Draft = {
  id?: string;
  title: string;
  short_description: string;
  description: string;
  level: string;
  category: string;
  target_students: string;
  duration_text: string;
  thumbnail_url: string;
  price: number;
  discount: number;
  is_published: boolean;
};

const emptyDraft: Draft = {
  title: "",
  short_description: "",
  description: "",
  level: "A1.1",
  category: "",
  target_students: "",
  duration_text: "",
  thumbnail_url: "",
  price: 0,
  discount: 0,
  is_published: false,
};

function AdminCoursesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "published" | "draft">("all");
  const [level, setLevel] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ["admin-courses"],
    queryFn: () => listCoursesAdmin(),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-courses"] });

  const save = useMutation({
    mutationFn: () =>
      saveCourse({
        data: {
          ...(draft.id ? { id: draft.id } : {}),
          title: draft.title,
          short_description: draft.short_description || null,
          description: draft.description || null,
          level: draft.level || null,
          category: draft.category || null,
          target_students: draft.target_students || null,
          duration_text: draft.duration_text || null,
          thumbnail_url: draft.thumbnail_url || null,
          price: Number(draft.price) || 0,
          discount: Number(draft.discount) || 0,
          is_published: draft.is_published,
        },
      }),
    onSuccess: () => {
      toast.success(draft.id ? "Course updated" : "Course created");
      setOpen(false);
      setDraft(emptyDraft);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const publish = useMutation({
    mutationFn: (v: { id: string; is_published: boolean }) => setCoursePublished({ data: v }),
    onSuccess: () => {
      toast.success("Publish status updated");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteCourse({ data: { id } }),
    onSuccess: () => {
      toast.success("Course deleted");
      setConfirmDelete(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const dup = useMutation({
    mutationFn: (id: string) => duplicateCourse({ data: { id } }),
    onSuccess: () => {
      toast.success("Draft copy created");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = useMemo(
    () =>
      courses.filter((c) => {
        const okSearch = c.title.toLowerCase().includes(search.toLowerCase().trim());
        const okStatus =
          status === "all" || (status === "published" ? c.is_published : !c.is_published);
        const okLevel = level === "all" || c.level === level;
        return okSearch && okStatus && okLevel;
      }),
    [courses, search, status, level],
  );

  const openEdit = (c: (typeof courses)[number]) => {
    setDraft({
      id: c.id,
      title: c.title,
      short_description: c.short_description ?? "",
      description: c.description ?? "",
      level: c.level ?? "A1.1",
      category: c.category ?? "",
      target_students: c.target_students ?? "",
      duration_text: c.duration_text ?? "",
      thumbnail_url: c.thumbnail_url ?? "",
      price: Number(c.price ?? 0),
      discount: Number(c.discount ?? 0),
      is_published: !!c.is_published,
    });
    setOpen(true);
  };

  const finalPrice = Math.max(0, Number(draft.price || 0) - Number(draft.discount || 0));

  return (
    <div className="space-y-6 font-['Outfit']" dir="ltr">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Course Management</h1>
          <p className="text-sm text-muted-foreground">
            {courses.length} courses — {courses.filter((c) => c.is_published).length} published
          </p>
        </div>
        <Button
          className="rounded-xl gap-2"
          onClick={() => {
            setDraft(emptyDraft);
            setOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          New Course
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search for a course..."
            className="pr-10 rounded-xl"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
          <SelectTrigger className="w-full rounded-xl sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="font-['Outfit']">
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
          </SelectContent>
        </Select>
        <Select value={level} onValueChange={setLevel}>
          <SelectTrigger className="w-full rounded-xl sm:w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="font-['Outfit']">
            <SelectItem value="all">All Levels</SelectItem>
            {LEVELS.map((l) => (
              <SelectItem key={l} value={l}>
                {l}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed py-20 text-center">
          <BookOpen className="mx-auto mb-4 h-12 w-12 text-muted-foreground opacity-30" />
          <p className="text-muted-foreground">No matching courses.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((course) => (
            <Card key={course.id} className="overflow-hidden transition hover:shadow-lg">
              {course.thumbnail_url && (
                <img
                  src={course.thumbnail_url}
                  alt={`cover for course ${course.title}`}
                  loading="lazy"
                  className="h-32 w-full object-cover"
                />
              )}
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <Badge variant="secondary">{course.level ?? "—"}</Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="font-['Outfit']">
                      <DropdownMenuItem asChild>
                        <Link to="/admin/courses/$courseId/content" params={{ courseId: course.id }}>
                          <Layout className="ml-2 h-4 w-4" />
                          Manage Units & Lessons
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openEdit(course)}>
                        <Edit className="ml-2 h-4 w-4" />
                        Edit Course Data
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => dup.mutate(course.id)}>
                        <Copy className="ml-2 h-4 w-4" />
                        Duplicate Course
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => publish.mutate({ id: course.id, is_published: !course.is_published })}
                      >
                        {course.is_published ? (
                          <>
                            <EyeOff className="ml-2 h-4 w-4" /> Unpublish
                          </>
                        ) : (
                          <>
                            <Eye className="ml-2 h-4 w-4" /> Publish Course
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive" onClick={() => setConfirmDelete(course.id)}>
                        <Trash2 className="ml-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <CardTitle className="mt-2 line-clamp-1 text-lg">{course.title}</CardTitle>
                <CardDescription className="line-clamp-2 text-xs">
                  {course.short_description || course.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-lg bg-muted/60 p-2">
                    <div className="font-black">{course.units_count}</div>
                    <div className="text-muted-foreground">unit</div>
                  </div>
                  <div className="rounded-lg bg-muted/60 p-2">
                    <div className="font-black">{course.lessons_count}</div>
                    <div className="text-muted-foreground">lesson</div>
                  </div>
                  <div className="rounded-lg bg-muted/60 p-2">
                    <div className="font-black">{course.students_count}</div>
                    <div className="text-muted-foreground">students</div>
                  </div>
                </div>
                <div className="flex items-center justify-between border-t pt-3 text-sm">
                  <Badge variant={course.is_published ? "default" : "secondary"}>
                    {course.is_published ? "Published" : "Draft"}
                  </Badge>
                  <span className="font-bold text-primary">
                    {Number(course.price) === 0
                      ? "Free"
                      : `${Math.max(0, Number(course.price) - Number(course.discount ?? 0))} EGP`}
                  </span>
                </div>
                <Button asChild variant="outline" className="w-full rounded-xl gap-2">
                  <Link to="/admin/courses/$courseId/content" params={{ courseId: course.id }}>
                    <Layers className="h-4 w-4" />
                    Units & Lessons
                  </Link>
                </Button>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Users className="h-3 w-3" />
                  {course.students_count} subscribers
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create / edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto font-['Outfit']" dir="ltr">
          <DialogHeader>
            <DialogTitle>{draft.id ? "Edit Course" : "Add New Course"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Course Name *</Label>
              <Input
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                placeholder="e.g. English Basics"
              />
            </div>
            <div className="space-y-2">
              <Label>Short Description</Label>
              <Input
                value={draft.short_description}
                onChange={(e) => setDraft({ ...draft, short_description: e.target.value })}
                placeholder="One line shown on the course card"
              />
            </div>
            <div className="space-y-2">
              <Label>Full Description</Label>
              <Textarea
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                className="min-h-[110px]"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Level</Label>
                <Select value={draft.level} onValueChange={(v) => setDraft({ ...draft, level: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="font-['Outfit']">
                    {LEVELS.map((l) => (
                      <SelectItem key={l} value={l}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Input
                  value={draft.category}
                  onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                  placeholder="Grammar / Speaking ..."
                />
              </div>
              <div className="space-y-2">
                <Label>Target Group</Label>
                <Input
                  value={draft.target_students}
                  onChange={(e) => setDraft({ ...draft, target_students: e.target.value })}
                  placeholder="e.g. Grade 4 students"
                />
              </div>
              <div className="space-y-2">
                <Label>Course Duration</Label>
                <Input
                  value={draft.duration_text}
                  onChange={(e) => setDraft({ ...draft, duration_text: e.target.value })}
                  placeholder="e.g. 8 weeks"
                />
              </div>
              <div className="space-y-2">
                <Label>Price (EGP)</Label>
                <Input
                  type="number"
                  min={0}
                  value={draft.price}
                  onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Discount (EGP)</Label>
                <Input
                  type="number"
                  min={0}
                  value={draft.discount}
                  onChange={(e) => setDraft({ ...draft, discount: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="rounded-xl bg-muted/60 p-3 text-sm">
              Final Price: <span className="font-black text-primary">{finalPrice} EGP</span>
            </div>
            <div className="space-y-2">
              <Label>Cover Image Link</Label>
              <Input
                dir="ltr"
                value={draft.thumbnail_url}
                onChange={(e) => setDraft({ ...draft, thumbnail_url: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div className="flex items-center justify-between rounded-xl border p-3">
              <div>
                <Label>Publish Course</Label>
                <p className="text-xs text-muted-foreground">Drafts are not visible to students</p>
              </div>
              <Switch
                checked={draft.is_published}
                onCheckedChange={(v) => setDraft({ ...draft, is_published: v })}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              className="rounded-xl"
              disabled={save.isPending || !draft.title.trim()}
              onClick={() => save.mutate()}
            >
              {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : draft.id ? "Save Changes" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!confirmDelete} onOpenChange={(v) => !v && setConfirmDelete(null)}>
        <DialogContent className="font-['Outfit']" dir="ltr">
          <DialogHeader>
            <DialogTitle>Delete Course</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            The course and all its units and lessons will be deleted. This cannot be undone.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setConfirmDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="rounded-xl"
              disabled={remove.isPending}
              onClick={() => confirmDelete && remove.mutate(confirmDelete)}
            >
              {remove.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
