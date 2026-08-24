import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Radio, VideoOff, Video, PlaySquare } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getLiveSessions } from "@/lib/live.functions";
import { detectPlatform, embedUrl, platformLabel, watchUrl } from "@/lib/stream";

export const Route = createFileRoute("/_authenticated/live")({
  head: () => ({
    meta: [
      { title: "Live Courses | Blue Language Academy" },
      { name: "description", content: "Watch live English classes directly within the platform via YouTube or TikTok." },
      { property: "og:title", content: "Live Sessions - Interactive Learning" },
      { property: "og:description", content: "Interactive live sessions to learn English." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LivePage,
});

function LivePage() {
  const { data, isLoading } = useQuery({
    queryKey: ["live-sessions"],
    queryFn: () => getLiveSessions(),
    refetchInterval: 60_000,
  });

  return (
    <div className="min-h-screen p-4 md:p-8 font-['Cairo']" dir="ltr">
      <div className="max-w-4xl mx-auto space-y-6 text-left">
        <header className="space-y-1 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-black flex items-center gap-2">
              <Radio className="h-7 w-7 text-destructive" />
              Live Courses
            </h1>
            <p className="text-muted-foreground font-medium text-left">Watch live broadcasts directly on the site without leaving the platform.</p>
          </div>
          <Button variant="outline" className="gap-2" asChild>
            <Link to="/recordings">
              <PlaySquare className="h-4 w-4" /> Lecture Recordings
            </Link>
          </Button>
        </header>

        {isLoading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
          </div>
        ) : !data || data.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-20 flex flex-col items-center gap-3 text-center">
              <VideoOff className="h-12 w-12 text-muted-foreground" />
              <p className="text-lg font-black">No Live Sessions Available Now</p>
              <p className="text-sm text-muted-foreground">
                The class link will appear here automatically once the live broadcast begins.
              </p>
            </CardContent>
          </Card>
        ) : (
          data.map((s: any) => {
            const platform = (s.platform as string) || detectPlatform(s.meeting_url);
            const embed = embedUrl(s.meeting_url);
            const link = watchUrl(s.meeting_url);
            return (
              <Card key={s.id} className="overflow-hidden border-destructive/30">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className="bg-destructive text-destructive-foreground">Live Now</Badge>
                    <Badge variant="outline">
                      {platformLabel[platform as keyof typeof platformLabel] ?? platform}
                    </Badge>
                    {s.sections?.name && <Badge variant="secondary">{s.sections.name}</Badge>}
                  </div>
                  <h2 className="text-lg font-black">{s.title}</h2>
                  {s.description && (
                    <p className="text-sm text-muted-foreground whitespace-pre-line">{s.description}</p>
                  )}

                  {embed ? (
                    <div
                      className={`w-full overflow-hidden rounded-xl bg-black ${
                        platform === "tiktok" ? "aspect-[9/16] max-w-sm mx-auto" : "aspect-video"
                      }`}
                    >
                      <iframe
                        src={embed}
                        title={s.title}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture; fullscreen"
                        allowFullScreen
                      />
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground text-center">
                      This broadcast does not support in-site viewing. Please open it using the button below.
                    </div>
                  )}

                  <Button size="lg" variant={embed ? "outline" : "default"} className="w-full font-black gap-2 h-12" asChild>
                    <a href={link} target="_blank" rel="noopener noreferrer">
                      <Video className="h-5 w-5" /> Watch on{" "}
                      {platformLabel[platform as keyof typeof platformLabel] ?? platform}
                    </a>
                  </Button>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
