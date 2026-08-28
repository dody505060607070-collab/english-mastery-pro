import { createFileRoute, Link } from "@tanstack/react-router";


import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, GraduationCap, Users, Star, ArrowLeft, ArrowRight, MessageCircle, Briefcase, Globe, Award, CheckCircle2, Phone, ShieldCheck, Wallet, Image as ImageIcon, Info, Sparkles, HelpCircle, MessageSquare, Zap, Flame, Layers } from "lucide-react";
import logoAsset from "@/assets/logo-transparent.png.asset.json";
import learningIllustration from "@/assets/learning-illustration.jpg";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSiteContent, pickText } from "@/lib/content";
import { useLang } from "@/lib/i18n";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const iconMap: Record<string, any> = {
  Book: BookOpen,
  MessageCircle: MessageCircle,
  GraduationCap: GraduationCap,
  Briefcase: Briefcase,
  Star: Star,
  Globe: Globe,
  Award: Award
};

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Blue Language | Home" },
      { name: "description", content: "The #1 platform for learning English in the Arab world with a modern interactive style." },
      { property: "og:title", content: "Blue Language" },
      { property: "og:description", content: "Learn English in a modern and interactive way" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const { lang, t } = useLang();
  const { data: siteContent } = useSiteContent();
  const T = (key: string, fallback: string) => pickText(siteContent?.[key], lang, fallback);
  // Features come ONLY from Admin → Site Content: deleting a key removes the item from the site.
  const features = [1, 2, 3, 4, 5, 6]
    .map((n) => ({
      title: pickText(siteContent?.[`home.feature${n}.title`], lang, ""),
      desc: pickText(siteContent?.[`home.feature${n}.desc`], lang, ""),
    }))
    .filter((f) => f.title.trim().length > 0);
  const whatsapp = T("contact.whatsapp", "+201035851426").replace(/[^\d]/g, "");
  const [selectedCourse, setSelectedCourse] = useState<any>(null);


  const { data: courses, isLoading: coursesLoading } = useQuery({
    queryKey: ["courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*, course_categories(name, icon)")
        .eq("is_published", true);
      if (error) throw error;
      return data;
    },
  });

  const { data: categories, isLoading: catsLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_categories")
        .select("*");
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20" dir={lang === "ar" ? "rtl" : "ltr"}>
      {/* Soft ambient wash */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute top-[20%] -right-[5%] w-[30%] h-[30%] bg-accent/10 rounded-full blur-[100px]" />
      </div>

      <header className="sticky top-0 z-50 w-full border-b bg-background/85 backdrop-blur-md">
        <div className="container flex h-20 items-center justify-between">
          <Link to="/" className="flex items-center gap-3 font-display font-black text-xl tracking-tight shrink-0">
            <img 
              src={logoAsset.url} 
              alt="Blue Language Logo" 
              className="h-12 md:h-14 w-auto object-contain" 
            />
            <span className="hidden sm:inline-block">Blue Language</span>
          </Link>

          
          <nav className="hidden lg:flex gap-8">
            <Link to="/" className="text-sm font-semibold hover:text-primary transition-colors relative group">
              {t("nav_home")}
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full" />
            </Link>
            <Link to="/courses" className="text-sm font-semibold hover:text-primary transition-colors relative group">
              {t("nav_courses")}
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full" />
            </Link>
            <Link to="/dashboard" className="text-sm font-semibold hover:text-primary transition-colors relative group">
              {t("nav_dashboard")}
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full" />
            </Link>
            <Link to="/profile" className="text-sm font-semibold hover:text-primary transition-colors relative group">
              {t("nav_profile")}
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full" />
            </Link>
            <Link to="/practice" className="text-sm font-semibold hover:text-primary transition-colors relative group">
              {t("nav_practice")}
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full" />
            </Link>
          </nav>
          
          <div className="flex items-center gap-2 md:gap-4">
            <Link to="/auth" className="hidden sm:block">
              <Button variant="ghost" className="font-bold">{t("nav_login")}</Button>
            </Link>
            <Link to="/auth">
              <Button className="font-bold shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all px-4 md:px-6 text-sm md:text-base">
                {t("nav_start")}
              </Button>
            </Link>
            {/* Mobile Menu Trigger */}
            <div className="lg:hidden flex items-center">
              <Button variant="ghost" size="icon" onClick={() => window.location.href='/courses'}>
                <BookOpen className="h-6 w-6" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative bg-warm border-b overflow-hidden">
          <div className="container relative z-10 py-16 md:py-24">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-center lg:text-start"
              >
                <span className="pill-badge mb-6">
                  <Sparkles className="h-3.5 w-3.5" /> A1 → C2 · Structured Path
                </span>
                <h1 className="text-4xl sm:text-5xl md:text-6xl font-black leading-[1.08] mb-5">
                  {T("home.hero.title", "Learn English")}{" "}
                  <span className="text-primary italic">{T("home.hero.subtitle", "in the right order")}</span>
                </h1>
                <p className="text-base md:text-lg text-muted-foreground mb-8 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                  {T("home.hero.description", "Every lesson guided, from A1 to C2 — grammar, vocabulary, reading and listening taught in the order the language actually builds.")}
                </p>
                <div className="flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-3">
                  <Link to="/auth" className="w-full sm:w-auto">
                    <Button size="lg" className="h-14 px-8 text-base font-bold w-full sm:w-auto bg-accent text-accent-foreground hover:bg-accent/90 shadow-[var(--shadow-lift)]">
                      {T("home.hero.cta", "Start Learning Free")}
                      <ArrowRight className="ms-2 h-5 w-5" />
                    </Button>
                  </Link>
                  <Link to="/placement-test" className="w-full sm:w-auto">
                    <Button size="lg" variant="outline" className="h-14 px-8 text-base font-bold w-full sm:w-auto border-2 bg-card hover:bg-secondary">
                      Test Your Level
                    </Button>
                  </Link>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.15, duration: 0.5 }}
                className="surface-lift p-6 md:p-8 relative"
              >
                <div className="eyebrow mb-4 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-primary inline-block" /> Inside the curriculum
                </div>
                <div className="flex items-center justify-between mb-4">
                  <span className="pill-badge">Grammar Track · B1</span>
                  <span className="text-xs font-bold text-muted-foreground">Unit 12 of 96</span>
                </div>
                <h3 className="text-xl md:text-2xl font-black mb-3">Past Simple — learned inside a story</h3>
                <p className="text-base leading-relaxed mb-5">
                  Last night, Maya <span className="text-primary font-bold underline decoration-accent decoration-2 underline-offset-4">found</span> an old letter hidden under the floorboards.
                </p>
                <div className="flex flex-wrap gap-2 mb-6">
                  <span className="px-4 py-2 rounded-full text-sm font-bold bg-primary/10 text-primary border border-primary/25">✓ found</span>
                  <span className="px-4 py-2 rounded-full text-sm font-semibold bg-secondary text-muted-foreground border">finded</span>
                  <span className="px-4 py-2 rounded-full text-sm font-semibold bg-secondary text-muted-foreground border">was finding</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {["A1", "A2", "B1", "B2"].map((lvl) => (
                    <span
                      key={lvl}
                      className={`text-center text-xs font-black py-2 rounded-lg border ${lvl === "B1" ? "bg-primary text-primary-foreground border-primary" : "bg-secondary text-muted-foreground"}`}
                    >
                      {lvl}
                    </span>
                  ))}
                </div>
                <img src={logoAsset.url} alt="Blue Language" className="absolute -top-8 -end-4 h-16 w-auto object-contain opacity-90 hidden md:block" />
              </motion.div>
            </div>

            {/* Stats row */}
            <div className="mt-14 md:mt-20 pt-10 border-t grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              {[
                { n: "1,200+", l: "words · A1–C2" },
                { n: "672", l: "guided lessons" },
                { n: "2,600+", l: "exercises" },
                { n: "96", l: "units" },
              ].map((s) => (
                <div key={s.l}>
                  <div className="font-display text-3xl md:text-4xl font-black text-primary">{s.n}</div>
                  <div className="text-xs md:text-sm text-muted-foreground mt-1">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </section>


        {/* Categories Section */}
        <section className="py-24 container relative">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-4">
            <div>
              <h2 className="text-3xl font-black mb-4">Explore Departments</h2>
              <p className="text-muted-foreground">Choose the path that suits your learning goals</p>
            </div>
            <Button variant="link" className="text-primary font-bold">View All Departments <ArrowRight className="ml-2 h-4 w-4" /></Button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 px-4 md:px-0">
            {categories?.map((cat, idx) => {
              const Icon = iconMap[cat.icon || 'Book'] || BookOpen;
              return (
                <motion.div
                  key={cat.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <Card className="glass group hover:border-primary/50 transition-all duration-500 cursor-pointer overflow-hidden border-border/40 relative">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-700" />
                    <CardContent className="p-8 flex flex-col items-center text-center relative z-10">
                      <div className="bg-primary/10 p-4 rounded-2xl group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-500 mb-6">
                        <Icon className="h-10 w-10" />
                      </div>
                      <h3 className="text-xl font-black mb-2">{cat.name}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">Learn {cat.name} skills using modern scientific methods</p>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </section>

        {/* Features / Why Us — fully driven by Admin → Site Content */}
        {features.length > 0 && (
        <section className="py-20 bg-muted/30 relative">
          <div className="container">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <motion.div
                initial={{ opacity: 0, x: 40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
              >
                <h2 className="text-2xl sm:text-4xl font-black mb-8 leading-tight">
                  Why <span className="text-primary">Blue Language</span>?
                </h2>
                <div className="space-y-4">
                  {features.map((feature, i) => {
                    const Icon = [CheckCircle2, Users, Award][i % 3] ?? CheckCircle2;
                    return (
                      <div key={i} className="flex gap-4 p-4 rounded-2xl bg-background/60 border border-border/40">
                        <div className="bg-primary/10 p-2 rounded-xl h-fit text-primary">
                          <Icon className="h-6 w-6" />
                        </div>
                        <div>
                          <h4 className="font-bold text-lg mb-1">{feature.title}</h4>
                          {feature.desc && <p className="text-muted-foreground">{feature.desc}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>

              <div className="relative">
                <img
                  src={learningIllustration}
                  alt="Online English lesson with a teacher on a laptop"
                  width={1024}
                  height={1024}
                  loading="lazy"
                  className="w-full rounded-[2rem] border border-border/40 shadow-xl object-cover"
                />
              </div>
            </div>
          </div>
        </section>
        )}


        {/* Course Details Dialog */}
        <Dialog open={!!selectedCourse} onOpenChange={(open) => !open && setSelectedCourse(null)}>
          <DialogContent className="max-w-2xl font-['Outfit']" dir="ltr">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black">{selectedCourse?.title}</DialogTitle>
              <DialogDescription>
                {selectedCourse?.course_categories?.name} • {selectedCourse?.level}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="aspect-video rounded-xl overflow-hidden bg-muted">
                {selectedCourse?.thumbnail_url ? (
                  <img src={selectedCourse.thumbnail_url} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-primary/5 text-primary/20">
                    <BookOpen size={64} />
                  </div>
                )}
              </div>
              <div className="space-y-4">
                <h4 className="text-lg font-bold flex items-center gap-2">
                  <Info className="h-5 w-5 text-primary" />
                  About the course
                </h4>
                <p className="text-muted-foreground leading-relaxed">{selectedCourse?.description}</p>
                <div className="p-4 rounded-xl bg-muted/50 border border-border/40">
                  <div className="text-xs text-muted-foreground mb-1">Level</div>
                  <div className="text-xl font-black">{selectedCourse?.level}</div>
                </div>

              </div>
            </div>
            <DialogFooter>
              <Button asChild className="w-full h-12 text-lg font-black">
                <a
                  href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(`I want to join: ${selectedCourse?.title ?? ""}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Contact us on WhatsApp
                </a>
              </Button>
            </DialogFooter>

          </DialogContent>
        </Dialog>

        {/* Featured Courses Section */}
        <section className="py-24 container relative">
          <div className="text-center mb-16">
            <h2 className="text-2xl md:text-4xl font-black mb-4 px-4">Blue Language</h2>
            <p className="text-muted-foreground text-sm md:text-base max-w-xl mx-auto px-4">Choose from a wide variety of courses designed to suit all levels</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 px-4 md:px-0">
            {courses?.map((course, idx) => (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
              >
                <Card 
                  className="overflow-hidden group hover:shadow-2xl transition-all duration-500 border-border/40 hover:-translate-y-2 cursor-pointer"
                  onClick={async () => {
                    const { data: { session } } = await supabase.auth.getSession();
                    if (!session) {
                      toast.error("Please sign in first to view course details");
                      window.location.href = '/auth';
                      return;
                    }
                    setSelectedCourse(course);
                  }}


                >
                  <div className="relative aspect-video bg-muted overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    {course.thumbnail_url ? (
                      <img 
                        src={course.thumbnail_url} 
                        alt={course.title} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      />
                    ) : (
                      <div className="w-full h-full bg-primary/5 flex items-center justify-center group-hover:scale-110 transition-transform duration-700">
                        <BookOpen className="w-16 h-16 text-primary/20" />
                      </div>
                    )}
                    <div className="absolute top-4 left-4 z-20">
                      <span className="bg-background/90 backdrop-blur text-primary text-[10px] font-black uppercase px-2 py-1 rounded shadow-sm">
                        {course.level}
                      </span>
                    </div>
                  </div>
                  <CardHeader>
                    <span className="text-xs font-bold text-primary">{course.course_categories?.name}</span>
                    <CardTitle className="text-xl font-black group-hover:text-primary transition-colors">{course.title}</CardTitle>
                    <CardDescription className="line-clamp-2 mt-2">{course.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-xs font-bold">
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2.5 py-1">
                        <Globe className="h-3.5 w-3.5" />
                        English / Arabic
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
                        <BookOpen className="h-3.5 w-3.5" />
                        {course.level}
                      </span>
                    </div>
                  </CardContent>
                  <CardFooter className="px-6 border-t mt-4 pt-4 pb-6 flex items-center justify-end">
                    <Button
                      className="font-bold"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCourse(course);
                      }}
                    >
                      View details
                    </Button>
                  </CardFooter>

                </Card>
              </motion.div>
            ))}
            {courses?.length === 0 && (
              <div className="col-span-full">
                <EmptyState 
                  title="No courses available yet!"
                  description="We are currently working on adding new and distinctive educational content. Please come back later to explore our new courses."
                  icon="book"
                  actionText="Contact Us"
                  onAction={() => window.location.href = '/contact'}
                />
              </div>
            )}
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 px-4">
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="container max-w-5xl bg-primary rounded-[3rem] p-12 md:p-20 text-center text-primary-foreground relative overflow-hidden shadow-2xl shadow-primary/30"
          >
            <div className="absolute top-0 left-0 w-64 h-64 bg-white/10 rounded-full -ml-32 -mt-32 blur-3xl" />
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-black/10 rounded-full -mr-32 -mb-32 blur-3xl" />
            
            <h2 className="text-3xl md:text-5xl font-black mb-6 relative z-10 px-4">
              {T("home.cta.title", "Ready to Start Your Journey?")}
            </h2>
            <p className="text-base md:text-xl opacity-90 mb-10 max-w-2xl mx-auto relative z-10 px-4">
              {T("home.cta.description", "Create your account and start learning English with a clear, guided plan.")}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center relative z-10">
              <Button size="lg" variant="secondary" className="h-14 px-8 text-lg font-black" asChild>
                <Link to="/auth">Create your account</Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-14 px-8 text-lg font-black bg-transparent border-white/30 hover:bg-white/10"
                asChild
              >
                <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer">
                  Chat on WhatsApp
                </a>
              </Button>
            </div>

          </motion.div>
        </section>

        {/* Community Q&A Section */}
        <section className="py-24 container relative">
          <div className="text-center mb-12 md:mb-16 space-y-4 px-4">
            <h2 className="text-3xl md:text-5xl font-black text-center">Frequently Asked Questions</h2>
            <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto text-center">Quick answers to your questions about your educational journey with us.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {[
              { q: "How do I start my first lesson?", a: "After logging in, go to the dashboard, choose the course you want, and click on the first lesson." },
              { q: "How can I track my progress?", a: "You can track your detailed performance and learning milestones through your personal dashboard at Blue Language." },
              { q: "How can I contact the teacher?", a: "You can ask your questions in the comments section under each lesson or contact us directly via WhatsApp." },
              { q: "Is there a group discount?", a: "Yes, we provide special discounts for groups and institutions. Please contact the sales team." },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <div className="glass p-8 rounded-3xl border-border/40 hover:border-primary/50 transition-all group">
                  <div className="flex items-start gap-4">
                    <div className="bg-primary/10 p-3 rounded-2xl text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                      <HelpCircle className="w-6 h-6" />
                    </div>
                    <div className="space-y-3">
                      <h4 className="text-xl font-bold">{item.q}</h4>
                      <p className="text-muted-foreground leading-relaxed">{item.a}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-16 text-center">
            <Link to="/faq">
              <Button variant="link" className="text-lg font-black text-primary gap-2">
                View All Questions
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
          </div>
        </section>

        {/* 3D Floating Decorations */}
        <div className="absolute top-[30%] left-10 hidden lg:block opacity-20 rotate-12 animate-float">
          <BookOpen className="w-32 h-32 text-primary" />
        </div>
        <div className="absolute top-[60%] right-10 hidden lg:block opacity-20 -rotate-12 animate-bounce-slow">
          <Sparkles className="w-32 h-32 text-accent" />
        </div>
        <div className="absolute bottom-[10%] left-20 hidden lg:block opacity-20 rotate-45 animate-float-delayed">
          <GraduationCap className="w-32 h-32 text-primary" />
        </div>
      </main>

      <footer className="bg-muted/50 border-t py-12">
        <div className="container grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 px-6 md:px-0">
          <div className="col-span-2">
            <div className="flex items-center gap-2 font-black text-2xl mb-6">
              <div className="bg-primary p-1.5 rounded-lg">
                <GraduationCap className="h-6 w-6 text-primary-foreground" />
              </div>
              <span className="text-xl md:text-2xl">Blue Language</span>
            </div>
            <p className="text-muted-foreground max-w-sm mb-6">
              The leading educational platform in the Arab world for teaching English at all levels and specialties.
            </p>
            <div className="flex gap-4">
              {['facebook', 'twitter', 'instagram', 'youtube'].map((social) => (
                <div key={social} className="w-10 h-10 rounded-full bg-background border flex items-center justify-center cursor-pointer hover:bg-primary hover:text-primary-foreground transition-all">
                  <span className="sr-only">{social}</span>
                  <Globe className="w-5 h-5" />
                </div>
              ))}
            </div>
          </div>
          <div>
            <h4 className="font-black mb-6">Quick Links</h4>
            <ul className="space-y-4 text-muted-foreground font-bold text-sm">
              <li><Link to="/" className="hover:text-primary transition-colors">Home</Link></li>
              <li><Link to="/dashboard" className="hover:text-primary transition-colors">Courses</Link></li>
              <li><Link to="/auth" className="hover:text-primary transition-colors">About Us</Link></li>
              <li><Link to="/contact" className="hover:text-primary transition-colors">Contact Us</Link></li>
              <li><Link to="/faq" className="hover:text-primary transition-colors">FAQ</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-black mb-6">Legal</h4>
            <ul className="space-y-4 text-muted-foreground font-bold text-sm">
              <li><Link to="/legal/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
              <li><Link to="/legal/terms" className="hover:text-primary transition-colors">Terms of Use</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-black mb-6">Connect With Us</h4>
            <ul className="space-y-4 text-muted-foreground font-bold text-sm">
              <li className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary" />
                <span>Cairo, Egypt</span>
              </li>
              <li className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-primary" />
                <span>{T("contact.phone", "+201035851426")}</span>
              </li>
            </ul>
          </div>
        </div>
        <div className="container border-t mt-12 pt-8 text-center text-sm text-muted-foreground font-bold">
          <p>© 2026 Blue Language. All rights reserved.</p>
        </div>
      </footer>

      {/* Tailwind Custom Animations */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
        @keyframes float-delayed {
          0%, 100% { transform: translateY(0) rotate(-3deg); }
          50% { transform: translateY(-15px) rotate(0deg); }
        }
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-float-delayed { animation: float-delayed 8s ease-in-out infinite; }
        .animate-bounce-slow { animation: bounce-slow 4s ease-in-out infinite; }
      `}} />
    </div>
  );
}
