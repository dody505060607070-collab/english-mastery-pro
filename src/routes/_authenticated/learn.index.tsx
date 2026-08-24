import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { BookOpen, Loader2, Trophy, CheckCircle2, Layers, Lock } from "lucide-react";
import { z } from "zod";

import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { getLevels, getLevelUnits } from "@/lib/curriculum.functions";
import { contentMeta, contentColor } from "@/lib/content-types";
import { cn } from "@/lib/utils";

const searchSchema = z.object({ level: z.string().optional() });

export const Route = createFileRoute("/_authenticated/learn/")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Study Units | Blue Language Academy" },
      { name: "description", content: "Choose any language level directly and track your eight units and progress." },
      { property: "og:title", content: "Study Units" },
      { property: "og:description", content: "Choose your level from A1.1 to C1 and enter its units directly." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LearnPage,
});

function LearnPage() {
  const navigate = useNavigate({ from: "/learn" });
  const { level } = Route.useSearch();

  const { data: levelsData, isLoading: loadingLevels } = useQuery({
    queryKey: ["levels"],
    queryFn: () => getLevels(),
  });

  const levels = levelsData?.levels ?? [];
  const activeId = level ?? levelsData?.myLevelId ?? levels[0]?.id ?? null;

  const { data, isLoading } = useQuery({
    queryKey: ["level-units", activeId],
    queryFn: () => getLevelUnits({ data: { sectionId: activeId as string } }),
    enabled: !!activeId,
  });

  if (loadingLevels) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  if (levels.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center p-6" dir="ltr">
        <Layers className="h-12 w-12 text-muted-foreground" />
        <h1 className="text-2xl font-black">No levels available currently</h1>
        <Button asChild>
          <Link to="/dashboard">Back to Dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6 font-['Outfit']" dir="ltr">
      <div className="space-y-3">
        <div className="text-left">
          <h1 className="text-2xl font-black">Study Units</h1>
          <p className="text-sm text-muted-foreground font-bold">
            Choose any level directly — levels are independent of each other.
          </p>
        </div>

        <div className="-mx-4 px-4 md:mx-0 md:px-0 overflow-x-auto no-scrollbar">
          <div className="flex gap-2 w-max md:w-full md:flex-wrap pb-1">
            {levels.map((l) => {
              const isActive = l.id === activeId;
              return (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => navigate({ search: { level: l.id } })}
                  className={cn(
                    "shrink-0 rounded-2xl border px-4 py-2 text-sm font-black transition-all flex items-center gap-1.5",
                    isActive
                      ? "bg-primary text-primary-foreground border-primary shadow-md"
                      : "bg-card border-border/70 hover:border-primary/50",
                  )}
                >
                  {l.locked && <Lock className="h-3.5 w-3.5" />}
                  {l.name}
                  <span className={cn("text-[10px] font-bold", isActive ? "opacity-80" : "text-muted-foreground")}>
                    {l.unitCount}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {isLoading || !data ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : data.locked ? (
        <Card>
          <CardContent className="py-14 text-center space-y-3">
            <Lock className="h-10 w-10 mx-auto text-muted-foreground" />
            <p className="font-black text-lg">Level {data.section.name} is Locked</p>
            <p className="text-sm text-muted-foreground font-bold">
              Contact academy management to unlock this level for your account.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="bg-gradient-to-r from-primary/10 to-transparent border-primary/20">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="text-left">
                  <p className="text-xs font-bold text-primary mb-1">Selected Level</p>
                  <h2 className="text-2xl font-black">{data.section.name}</h2>
                  {data.section.description && (
                    <p className="text-xs text-muted-foreground font-bold">{data.section.description}</p>
                  )}
                </div>
                <div className="text-center">
                  <p className="text-3xl font-black text-primary">{data.overallProgress}%</p>
                  <p className="text-xs font-bold text-muted-foreground">Progress Percentage</p>
                </div>
              </div>
              <Progress value={data.overallProgress} className="h-3" />
              <p className="text-xs font-bold text-muted-foreground text-left">
                You have completed {data.completedCount} out of {data.totalContents} learning elements in this level
              </p>
            </CardContent>
          </Card>

          <div className="grid gap-3">
            {data.units.length === 0 && (
              <Card>
                <CardContent className="py-14 text-center font-bold text-muted-foreground">
                  No units have been added to this level yet
                </CardContent>
              </Card>
            )}

            {data.units.map((u, i) => (
              <motion.div
                key={u.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <Link to="/learn/$unitId" params={{ unitId: u.id }}>
                  <Card className="border-border/60 hover:border-primary/50 hover:shadow-lg transition-all">
                    <CardContent className="p-5 space-y-3">
                      <div className="flex items-start gap-4">
                        <div
                          className={`p-3 rounded-2xl ${
                            u.progress === 100 ? "bg-emerald-500/10 text-emerald-600" : "bg-primary/10 text-primary"
                          }`}
                        >
                          {u.progress === 100 ? <Trophy className="h-5 w-5" /> : <BookOpen className="h-5 w-5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-lg truncate">{u.title}</p>
                          {u.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2">{u.description}</p>
                          )}
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {u.types.map((t) => {
                              const m = contentMeta(t);
                              const col = contentColor(t);
                              return (
                                <span
                                  key={t}
                                  className={cn(
                                    "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold",
                                    col.soft,
                                  )}
                                >
                                  <m.icon className="h-3 w-3" />
                                  {m.label}
                                </span>
                              );
                            })}
                          </div>

                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xl font-black">{u.progress}%</p>
                          <p className="text-[11px] text-muted-foreground font-bold flex items-center gap-1 justify-end">
                            <CheckCircle2 className="h-3 w-3" />
                            {u.completed}/{u.total}
                          </p>
                        </div>
                      </div>
                      <Progress value={u.progress} className="h-2" />
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
