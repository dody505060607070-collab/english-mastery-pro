import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, GraduationCap } from "lucide-react";

import {
  listTeacherPermissions,
  setTeacherPermissions,
  CAPABILITY_LABELS,
} from "@/lib/teacher-perms.functions";

export const Route = createFileRoute("/_authenticated/admin/teachers")({
  component: TeacherPermissionsPage,
  head: () => ({
    meta: [
      { title: "Teacher Permissions | Admin" },
      { name: "description", content: "Choose exactly what each teacher can manage on the platform." },
    ],
  }),
});

function TeacherPermissionsPage() {
  const qc = useQueryClient();
  const fetchList = useServerFn(listTeacherPermissions);
  const savePerms = useServerFn(setTeacherPermissions);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-teacher-perms"],
    queryFn: () => fetchList(),
  });

  const mutation = useMutation({
    mutationFn: (vars: { userId: string; caps: string[] }) => savePerms({ data: vars }),
    onSuccess: () => {
      toast.success("Permissions saved");
      qc.invalidateQueries({ queryKey: ["admin-teacher-perms"] });
      qc.invalidateQueries({ queryKey: ["my-capabilities"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not save"),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const teachers = data?.teachers ?? [];

  const toggle = (userId: string, caps: string[], cap: string, on: boolean) => {
    const next = on ? Array.from(new Set([...caps, cap])) : caps.filter((c) => c !== cap);
    mutation.mutate({ userId, caps: next });
  };

  return (
    <div className="space-y-6 font-['Outfit']" dir="ltr">
      <div>
        <h1 className="text-2xl font-black">Teacher Permissions</h1>
        <p className="text-muted-foreground text-sm">
          Admins have full control. Here you decide, per teacher, which parts of the curriculum and
          platform they are allowed to manage.
        </p>
      </div>

      {teachers.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No teachers yet. Add a teacher from <b>Permissions</b> first.
          </CardContent>
        </Card>
      )}

      {teachers.map((t) => (
        <Card key={t.id}>
          <CardHeader className="pb-3 flex-row items-center justify-between gap-3">
            <CardTitle className="text-base flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-primary" />
              {t.full_name || "Teacher"}
              <span className="text-xs font-normal text-muted-foreground">{t.phone}</span>
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{t.caps.length} allowed</Badge>
              {!t.customised && <Badge variant="outline">default</Badge>}
              <Button
                size="sm"
                variant="outline"
                className="rounded-lg"
                disabled={mutation.isPending}
                onClick={() => mutation.mutate({ userId: t.id, caps: [] })}
              >
                Revoke all
              </Button>
              <Button
                size="sm"
                className="rounded-lg"
                disabled={mutation.isPending}
                onClick={() => mutation.mutate({ userId: t.id, caps: data?.capabilities ?? [] })}
              >
                Allow all
              </Button>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {CAPABILITY_LABELS.map((c) => {
              const on = t.caps.includes(c.id);
              return (
                <div
                  key={c.id}
                  className="flex items-start justify-between gap-3 rounded-xl border p-3"
                >
                  <div>
                    <p className="font-bold text-sm">{c.label}</p>
                    <p className="text-xs text-muted-foreground">{c.hint}</p>
                  </div>
                  <Switch
                    checked={on}
                    disabled={mutation.isPending}
                    onCheckedChange={(v) => toggle(t.id, t.caps, c.id, v)}
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
