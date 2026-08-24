import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, BookMarked, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { listMyWords, deleteMyWord } from "@/lib/learning.functions";
import { SpeakButton } from "@/components/InteractiveText";

export const Route = createFileRoute("/_authenticated/my-words")({
  head: () => ({
    meta: [
      { title: "قاموسي — كلماتي المحفوظة" },
      { name: "description", content: "راجع الكلمات الإنجليزية التي حفظتها مع الترجمة والنطق والأمثلة." },
      { property: "og:title", content: "قاموسي — كلماتي المحفوظة" },
      {
        property: "og:description",
        content: "راجع الكلمات الإنجليزية التي حفظتها مع الترجمة والنطق والأمثلة.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MyWordsPage,
});

function MyWordsPage() {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({ queryKey: ["my-words"], queryFn: () => listMyWords() });

  const remove = useMutation({
    mutationFn: (id: string) => deleteMyWord({ data: { id } }),
    onSuccess: () => {
      toast.success("تم الحذف");
      qc.invalidateQueries({ queryKey: ["my-words"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="min-h-screen bg-background font-['Cairo'] p-4 pb-24" dir="rtl">
      <div className="mx-auto max-w-2xl space-y-5">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/dashboard">
              <ArrowRight className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-black">قاموسي</h1>
            <p className="text-sm text-muted-foreground">{data.length} كلمة محفوظة</p>
          </div>
          <Button variant="outline" size="sm" asChild className="mr-auto rounded-xl">
            <Link to="/dictionary">القاموس</Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
          </div>
        ) : data.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-16 text-center text-muted-foreground">
              <BookMarked className="h-10 w-10" />
              <p>لم تحفظ أي كلمة بعد. اضغط مرتين على أي كلمة داخل الدروس، أو ابحث في القاموس لإضافتها هنا.</p>
              <Button asChild className="mt-2 rounded-xl">
                <Link to="/dictionary">افتح القاموس</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {data.map((w) => (
              <Card key={w.id}>
                <CardContent className="flex items-start gap-3 p-4">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span dir="ltr" className="text-lg font-black">
                        {w.word}
                      </span>
                      <SpeakButton text={w.word} />
                    </div>
                    {w.part_of_speech && (
                      <span className="inline-block rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold text-muted-foreground" dir="ltr">
                        {w.part_of_speech}
                      </span>
                    )}
                    {w.translation && <p className="font-bold">{w.translation}</p>}
                    {w.phonetic && (
                      <p dir="ltr" className="text-xs text-muted-foreground">
                        {w.phonetic}
                      </p>
                    )}
                    {w.example && (
                      <p dir="ltr" className="text-sm italic text-muted-foreground">
                        {w.example}
                      </p>
                    )}
                    {w.example_ar && <p className="text-xs text-muted-foreground">{w.example_ar}</p>}
                    <p className="text-[11px] text-muted-foreground/70">
                      أُضيفت {new Date(w.created_at).toLocaleDateString("ar-EG")}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => remove.mutate(w.id)}
                    disabled={remove.isPending}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
