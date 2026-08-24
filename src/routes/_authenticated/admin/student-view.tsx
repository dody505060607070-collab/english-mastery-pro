import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, EyeOff, Loader2, Lock, PlaySquare } from "lucide-react";

import { getStudentView } from "@/lib/student-view.functions";

export const Route = createFileRoute("/_authenticated/admin/student-view")({
  component: StudentViewPage,
  head: () => ({
    meta: [
      { title: "Student View | Admin" },
      { name: "description", content: "Preview what students of each level can see on the platform." },
    ],
  }),
});

function StudentViewPage() {
  const [sectionId, setSectionId] = useState<string | null>(null);
  const fetchView = useServerFn(getStudentView);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-student-view", sectionId],
    queryFn: () => fetchView({ data: { sectionId } }),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const levels = data?.levels ?? [];

  return (
    <div className="space-y-6 font-['Outfit']" dir="ltr">
      <div>
        <h1 className="text-2xl font-black">Student View</h1>
        <p className="text-muted-foreground text-sm">
          See exactly what a student assigned to a level can open on the platform.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {levels.map((l) => (
          <Button
            key={l.id}
            size="sm"
            variant={(data?.sectionId ?? null) === l.id ? "default" : "outline"}
            className="rounded-xl font-bold"
            onClick={() => setSectionId(l.id)}
          >
            {l.name}
            {(!l.is_visible || l.is_locked) && <Lock className="h-3 w-3 ml-2" />}
          </Button>
        ))}
        {levels.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No levels yet — add them in <Link to="/admin/sections" className="text-primary font-bold">Levels & Units</Link>.
          </p>
        )}
      </div>

      {data?.level && (
        <>
          {data.blocked && (
            <Card className="border-destructive/40 bg-destructive/5">
              <CardContent className="py-4 flex items-center gap-3 text-sm font-bold text-destructive">
                <EyeOff className="h-4 w-4" />
                This level is hidden or locked — students see nothing here.
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Eye className="h-4 w-4 text-primary" />
                Visible units ({data.units.length})
                {!!data.hiddenUnits && (
                  <Badge variant="secondary" className="ml-2">{data.hiddenUnits} hidden</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.units.length === 0 && (
                <p className="text-sm text-muted-foreground">Students in this level see no units yet.</p>
              )}
              {data.units.map((u) => (
                <div key={u.id} className="rounded-xl border p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-bold">{u.title}</p>
                    <div className="flex items-center gap-2">
                      {!!u.hiddenContents && (
                        <Badge variant="secondary">{u.hiddenContents} hidden</Badge>
                      )}
                      <Button size="sm" variant="outline" className="rounded-lg" asChild>
                        <Link to="/learn/$unitId" params={{ unitId: u.id }}>Open as student</Link>
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {u.contents.map((c) => {
                      const m = contentMeta(c.content_type);
                      const col = contentColor(c.content_type);
                      return (
                        <span
                          key={c.id}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold",
                            col.soft,
                          )}
                        >
                          <m.icon className="h-3.5 w-3.5" />
                          {c.title}
                        </span>
                      );
                    })}
                    {u.contents.length === 0 && (
                      <span className="text-xs text-muted-foreground">No published content.</span>
                    )}
                  </div>

                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <PlaySquare className="h-4 w-4 text-primary" />
                Visible recordings ({data.recordings.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.recordings.length === 0 && (
                <p className="text-sm text-muted-foreground">No published recordings for this level.</p>
              )}
              {data.recordings.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-3 rounded-xl border p-3 text-sm">
                  <span className="font-bold">{r.title}</span>
                  <Badge variant="outline">{r.section_id ? "This level" : "All levels"}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
