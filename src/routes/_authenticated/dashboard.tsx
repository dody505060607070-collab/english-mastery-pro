import { createFileRoute, Link } from "@tanstack/react-router";
import { MyCurriculumCard } from "@/components/MyCurriculumCard";
import { useAccount } from "@/hooks/useAccount";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, BookOpen, Trophy, Award, Download, Search, Flame, Calendar as CalendarIcon, Zap, Bell, Check, Info, AlertTriangle, XCircle, Clock } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { data: account } = useAccount();
  const { data: profile, isLoading: isProfileLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      return data;
    }
  });

  const { data: userStats, isLoading: isStatsLoading } = useQuery({
    queryKey: ["user-stats"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase
        .from("user_stats")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      return data;
    }
  });

  const { data: leaderboard, isLoading: isLeaderboardLoading } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      const { data: stats } = await supabase
        .from("user_stats")
        .select("xp, level, user_id")
        .order("xp", { ascending: false })
        .limit(5);
      if (!stats?.length) return [];
      const { data: people } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", stats.map((s) => s.user_id));
      return stats.map((s) => ({
        ...s,
        profiles: { full_name: people?.find((p) => p.id === s.user_id)?.full_name ?? "Student" },
      }));
    }
  });


  const { data: activityLogs } = useQuery({
    queryKey: ["user-activity"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase
        .from("user_activity_log")
        .select("*")
        .eq("user_id", user.id)
        .order("activity_date", { ascending: false })
        .limit(30);
      return data || [];
    }
  });

  const { data: enrollments, isLoading: isEnrollmentsLoading } = useQuery({
    queryKey: ["enrollments-with-progress"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const { data: enrollmentData } = await supabase
        .from("enrollments")
        .select("*, courses(*)");
      
      const { data: progressData } = await supabase
        .from("user_progress")
        .select("*")
        .eq("user_id", user.id);

      const enrollmentsWithStats = await Promise.all((enrollmentData || []).map(async (e: any) => {
        const { count: lessonCount } = await supabase
          .from("lessons")
          .select("*", { count: 'exact', head: true })
          .eq("course_id", e.course_id);
        
        const completedProgress = progressData?.filter(p => p.course_id === e.course_id && p.is_completed) || [];
        const completedCount = completedProgress.length;
        const progress = Math.round((completedCount / (lessonCount || 1)) * 100);
        
        let lastLessonTitle = "";
        const lastCompleted = completedProgress.sort((a, b) => 
          new Date(b.last_accessed_at || 0).getTime() - new Date(a.last_accessed_at || 0).getTime()
        )[0];

        if (lastCompleted && lastCompleted.lesson_id) {
          const { data: lessonData } = await supabase
            .from("lessons")
            .select("title")
            .eq("id", lastCompleted.lesson_id)
            .single();
          lastLessonTitle = lessonData?.title || "";
        }

        return { ...e, progress, isFinished: progress === 100, lastLessonTitle };
      }));


      return enrollmentsWithStats;
    }
  });

  const certificatesCount = enrollments?.filter(e => e.isFinished).length || 0;

  if (isProfileLoading || isEnrollmentsLoading || isStatsLoading || isLeaderboardLoading) {
    return (
      <div className="container py-12 space-y-12 font-['Cairo'] animate-pulse" dir="rtl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-3">
            <div className="h-10 w-64 bg-primary/10 rounded-xl" />
            <div className="h-6 w-96 bg-primary/5 rounded-lg" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 rounded-3xl bg-primary/5" />
          ))}
        </div>
        <div className="space-y-8">
          <div className="h-8 w-48 bg-primary/10 rounded-lg" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[1, 2].map(i => (
              <div key={i} className="h-48 rounded-3xl bg-primary/5" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="container py-12 space-y-12 font-['Outfit']" 
      dir="ltr"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-foreground">Welcome, {profile?.full_name || "Special Student"} 👋</h1>
          <p className="text-muted-foreground mt-2 text-lg">Happy to see you again! Continue your learning journey now.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <NotificationsPopover />
          <Link to="/profile">
            <Button variant="outline" className="font-bold border-primary/20 hover:bg-primary/5">
              Account Settings
            </Button>
          </Link>
          {account?.isStaff && (
            <Link to="/admin">
              <Button variant="outline" className="font-bold border-primary/30">
                Admin Panel
              </Button>
            </Link>
          )}
          <Link to="/dictionary">
            <Button variant="outline" className="font-bold">
              Dictionary
            </Button>
          </Link>
          <Link to="/my-words">
            <Button variant="outline" className="font-bold">
              My Words
            </Button>
          </Link>
          <Link to="/live">
            <Button variant="outline" className="font-bold border-destructive/40 text-destructive">
              Live Courses
            </Button>
          </Link>
          <Link to="/recordings">
            <Button variant="outline" className="font-bold">
              Lecture Recordings
            </Button>
          </Link>
          <Link to="/learn">
            <Button className="font-bold shadow-lg shadow-primary/20">
              Study Units
            </Button>
          </Link>


        </div>
      </div>
      <MyCurriculumCard />

      <div className="grid grid-cols-1 gap-8">
        {enrollments && enrollments.length > 0 && (
          <Card className="border-none shadow-xl bg-gradient-to-r from-primary/10 via-background to-primary/5 p-8 rounded-[2rem]">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="flex-1 space-y-4 w-full">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/20 p-2 rounded-lg">
                    <Trophy className="h-6 w-6 text-primary" />
                  </div>
                  <h2 className="text-2xl font-black">Your Total Progress</h2>
                </div>
                <p className="text-muted-foreground font-bold text-left">
                  You have completed {Math.round((enrollments.reduce((acc, curr) => acc + (curr.progress || 0), 0) || 0) / (enrollments.length || 1))}% of your total enrolled course content. Keep going!
                </p>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm font-black">
                    <span>Achievement Level</span>
                    <span>{Math.round((enrollments.reduce((acc, curr) => acc + (curr.progress || 0), 0) || 0) / (enrollments.length || 1))}%</span>
                  </div>
                  <div className="h-4 w-full bg-primary/10 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.round((enrollments.reduce((acc, curr) => acc + (curr.progress || 0), 0) || 0) / (enrollments.length || 1))}%` }}
                      transition={{ duration: 2, ease: "backOut" }}
                      className="h-full bg-primary shadow-[0_0_15px_rgba(var(--primary),0.4)] relative"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                    </motion.div>
                  </div>
                </div>
                
                {/* XP, Level, and Streak Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
                  <div className="p-4 bg-background/50 rounded-2xl border border-primary/10 group hover:border-primary/30 transition-colors relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-full -mr-8 -mt-8 blur-xl group-hover:bg-primary/10 transition-colors" />
                    <div className="text-xs font-bold text-muted-foreground mb-1 flex items-center gap-2">
                      <Zap className="h-3 w-3 text-primary" />
                      Current Level
                    </div>
                    <div className="text-2xl font-black text-primary">Level {userStats?.level || 1}</div>
                  </div>
                  <div className="p-4 bg-background/50 rounded-2xl border border-primary/10 group hover:border-primary/30 transition-colors relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-full -mr-8 -mt-8 blur-xl group-hover:bg-primary/10 transition-colors" />
                    <div className="text-xs font-bold text-muted-foreground mb-1 flex items-center gap-2">
                      <Zap className="h-3 w-3 text-primary" />
                      Total XP
                    </div>
                    <div className="text-2xl font-black text-primary">{userStats?.xp || 0} Points</div>
                  </div>
                  <div className="p-4 bg-background/50 rounded-2xl border border-primary/10 group hover:border-primary/30 transition-colors relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-orange-500/5 rounded-full -mr-8 -mt-8 blur-xl group-hover:bg-orange-500/10 transition-colors" />
                    <div className="text-xs font-bold text-muted-foreground mb-1 flex items-center gap-2">
                      <Flame className="h-3 w-3 text-orange-500" />
                      Learning Streak
                    </div>
                    <div className="text-2xl font-black text-orange-600">{userStats?.current_streak || 0} Days</div>
                  </div>
                </div>

                {/* Daily Goal / Dynamic Recommendation */}
                <div className="mt-8 p-6 bg-primary/5 rounded-[2rem] border border-primary/10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/20 p-2 rounded-lg">
                        <Search className="h-5 w-5 text-primary" />
                      </div>
                      <h3 className="text-lg font-black">Your Learning Plan</h3>
                    </div>
                    {!(profile as any)?.level ? (
                      <div className="text-sm font-bold text-accent">
                        Level not set yet
                      </div>
                    ) : (
                      <div className="text-sm font-bold text-primary">
                        Level: {(profile as any).level}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4 items-center">
                    <div className="flex-1 w-full text-sm text-muted-foreground font-bold text-left">
                      {!(profile as any)?.level 
                        ? "Take the placement test to get a personalized learning plan."
                        : `Complete ${(profile as any)?.daily_goal_lessons || 1} lessons today to get ${(profile as any)?.daily_goal_xp || 100} XP and maintain your ${userStats?.current_streak || 0}-day streak!`}
                    </div>
                    {!(profile as any)?.level ? (
                      <Link to="/placement-test" className="w-full sm:w-auto">
                        <Button 
                          size="sm"
                          className="w-full sm:w-auto font-black shadow-lg shadow-primary/10"
                        >
                          Start Level Test
                        </Button>
                      </Link>
                    ) : (
                      <Button 
                        onClick={() => window.location.href='/practice'}
                        size="sm"
                        className="w-full sm:w-auto font-black shadow-lg shadow-primary/10"
                      >
                        Start Fast Training
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex md:flex-col gap-4">
                <div className="text-center p-4 bg-background/50 rounded-2xl border border-primary/10 min-w-[120px]">
                  <div className="text-3xl font-black text-primary">{enrollments.filter(e => e.progress > 0).length}</div>
                  <div className="text-xs font-bold text-muted-foreground">Courses Started</div>
                </div>
                <div className="text-center p-4 bg-background/50 rounded-2xl border border-primary/10 min-w-[120px]">
                  <div className="text-3xl font-black text-green-600">{enrollments.filter(e => e.isFinished).length}</div>
                  <div className="text-xs font-bold text-muted-foreground">Courses Completed</div>
                </div>
              </div>
            </div>
          </Card>
        )}

      </div>


      <CertificatesGallery />

      <div>
        <div className="flex items-center gap-3 mb-8">
          <div className="w-2 h-8 bg-primary rounded-full" />
          <h2 className="text-2xl font-black">My Educational Courses</h2>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {enrollments?.map((e: any) => (
            <Card key={e.id} className="overflow-hidden group hover:shadow-2xl transition-all duration-500 border-border/40 hover:-translate-y-1">
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <CardTitle className="text-2xl font-black group-hover:text-primary transition-colors">{e.courses?.title}</CardTitle>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground">
                        <span>{e.progress}% completed</span>
                        {e.isFinished && (
                          <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-[10px] uppercase">Finished</span>
                        )}
                      </div>
                      {e.lastLessonTitle && !e.isFinished && (
                        <p className="text-xs text-muted-foreground">Last lesson: {e.lastLessonTitle}</p>
                      )}
                    </div>
                  </div>

                  {e.isFinished && <Award className="h-8 w-8 text-primary animate-bounce-slow" />}
                </div>
              </CardHeader>
              <CardContent className="space-y-6 pb-8">
                <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${e.progress}%` }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    className="bg-primary h-full rounded-full shadow-[0_0_10px_rgba(var(--primary),0.3)]"
                  />
                </div>
                <div className="flex gap-4">
                  <Button 
                    variant={e.isFinished ? "outline" : "default"} 
                    className={cn(
                      "flex-1 h-12 font-black text-lg",
                      !e.isFinished && "shadow-lg shadow-primary/20"
                    )}
                    onClick={() => window.location.href=`/course/${e.course_id}`}
                  >
                    {e.isFinished ? "Review Course" : "Continue Learning"}
                  </Button>
                  {e.isFinished && (
                    <Button 
                      className="flex-1 h-12 font-black text-lg shadow-lg shadow-primary/20"
                      onClick={() => window.location.href=`/course/${e.course_id}`}
                    >
                      <Download className="ml-2 h-5 w-5" />
                      Download Certificate
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          {enrollments?.length === 0 && (
            <div className="col-span-full">
              <EmptyState 
                title="No courses yet"
                description="Your courses will appear here once your teacher adds them to your account."
                icon="graduation"
              />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function ActivityCalendar({ logs }: { logs: any[] }) {
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    return d;
  });

  const getLogForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return logs?.find(l => l.activity_date === dateStr);
  };

  return (
    <Card className="border-none shadow-xl glass p-8 rounded-[2rem]">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="bg-primary/20 p-2 rounded-lg">
            <CalendarIcon className="h-6 w-6 text-primary" />
          </div>
          <h2 className="text-2xl font-black">Your Recent Activity</h2>
        </div>
        <div className="text-sm font-bold text-muted-foreground">Last 14 Days</div>
      </div>
      
      <div className="flex justify-between gap-2 overflow-x-auto pb-4">
        {days.map((day, i) => {
          const log = getLogForDate(day);
          const isToday = day.toDateString() === new Date().toDateString();
          return (
            <div key={i} className="flex flex-col items-center gap-2 min-w-[50px]">
              <div className="text-[10px] font-bold text-muted-foreground uppercase">
                {day.toLocaleDateString('en-US', { weekday: 'short' })}
              </div>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: i * 0.05, type: "spring" }}
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center transition-all relative border",
                  log ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" : "bg-primary/5 border-primary/10",
                  isToday && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                )}
              >
                <span className="text-sm font-black">{day.getDate()}</span>
                {log && log.xp_gained > 0 && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-pulse shadow-sm" title={`${log.xp_gained} XP`} />
                )}
              </motion.div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function CertificatesGallery() {
  const { data: certificates } = useQuery({
    queryKey: ["my-certificates"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase
        .from("certificates")
        .select("*, courses(title)")
        .eq("user_id", user.id);
      return data || [];
    }
  });

  if (!certificates || certificates.length === 0) return null;

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-2 h-8 bg-yellow-500 rounded-full" />
        <h2 className="text-2xl font-black">My Earned Certificates</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {certificates.map((cert: any) => (
          <Card key={cert.id} className="glass border-yellow-500/20 hover:border-yellow-500/50 transition-all overflow-hidden group">
            <div className="p-6 flex flex-col items-center text-center space-y-4">
              <div className="bg-yellow-500/10 p-4 rounded-full group-hover:scale-110 transition-transform">
                <Trophy className="h-10 w-10 text-yellow-600" />
              </div>
              <div>
                <h3 className="font-black text-lg">{cert.courses?.title}</h3>
                <p className="text-sm text-muted-foreground">Issue Date: {new Date(cert.issued_at).toLocaleDateString('en-US')}</p>
              </div>
              <Button 
                variant="outline" 
                className="w-full border-yellow-500/30 hover:bg-yellow-500/10 font-bold"
                onClick={() => window.location.href = `/course/${cert.course_id}`}
              >
                View and Download PDF
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function NotificationsPopover() {
  const { data: notifications, refetch } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .or(`user_id.eq.${user.id},user_id.is.null`)
        .lte("scheduled_for", new Date().toISOString())
        .order("created_at", { ascending: false });
      return data || [];
    }
  });

  const unreadCount = notifications?.filter(n => !n.is_read).length || 0;

  const markAsRead = async (id: string) => {
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id);
    refetch();
  };

  const markAllAsRead = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .or(`user_id.eq.${user.id},user_id.is.null`)
      .eq("is_read", false);
    refetch();
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'success': return <Check className="h-4 w-4 text-green-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="relative rounded-xl glass border-primary/20 hover:bg-primary/5 h-10 w-10">
          <Bell className="h-5 w-5 text-primary" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-2 -right-2 px-1.5 min-w-[20px] h-5 flex items-center justify-center bg-red-500 text-white border-none text-[10px] font-bold">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 glass border-white/20 shadow-2xl overflow-hidden rounded-2xl" align="end">
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-primary/5">
          <h3 className="font-bold">Notifications</h3>
          {unreadCount > 0 && (
            <button 
              onClick={markAllAsRead}
              className="text-xs text-primary hover:underline font-bold"
            >
              Mark all as read
            </button>
          )}
        </div>
        <div className="max-h-[350px] overflow-y-auto">
          {notifications?.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <Bell className="h-8 w-8 text-muted-foreground/20 mx-auto" />
              <p className="text-sm text-muted-foreground">No notifications currently</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {notifications?.map((notification: any) => (
                <div 
                  key={notification.id} 
                  className={cn(
                    "p-4 transition-colors hover:bg-white/5 cursor-pointer",
                    !notification.is_read && "bg-primary/5"
                  )}
                  onClick={() => !notification.is_read && markAsRead(notification.id)}
                >
                  <div className="flex gap-3">
                    <div className="mt-1 shrink-0">
                      {getTypeIcon(notification.type)}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className={cn("text-sm font-bold", !notification.is_read ? "text-primary" : "text-foreground")}>
                          {notification.title}
                        </p>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1 shrink-0">
                          <Clock className="h-2 w-2" />
                          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                        {notification.message}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="p-3 border-t border-white/10 text-center bg-primary/5">
          <Button variant="ghost" size="sm" className="w-full text-[10px] font-bold h-7">
            View All Notifications
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
