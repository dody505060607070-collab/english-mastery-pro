import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { useState } from "react";
import { User, Phone, LogOut, ShieldCheck, KeyRound, CreditCard, GraduationCap, ArrowRight, Settings, Lock, Activity, TrendingUp, CheckCircle, Star, Target } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadialBarChart, RadialBar, Legend } from 'recharts';
import { updateMyProfile } from "@/lib/account.functions";

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'details' | 'security' | 'subscription' | 'goals'>('details');

  const { data: profile, isLoading: isProfileLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("*, subscriptions(*)").eq("id", user.id).order('created_at', { foreignTable: 'subscriptions', ascending: false }).limit(1, { foreignTable: 'subscriptions' }).single();
      return { ...data, email: user.email, subscription: data?.subscriptions?.[0] };

    }
  });

  const { data: enrollments, isLoading: isEnrollmentsLoading } = useQuery({
    queryKey: ["profile-enrollments"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase.from("enrollments").select("*, courses(*)").eq("user_id", user.id);
      return data || [];
    }
  });

  const { data: progressStats } = useQuery({
    queryKey: ["profile-progress-stats"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: progress } = await supabase
        .from("user_progress")
        .select("*, lessons(title)")
        .eq("user_id", user.id)
        .order('last_accessed_at', { ascending: true });

      const { data: quizAttempts } = await supabase
        .from("quiz_attempts")
        .select("*")
        .eq("user_id", user.id)
        .order('completed_at', { ascending: true });

      const { data: pronAttempts } = await supabase
        .from("pronunciation_attempts")
        .select("*")
        .eq("user_id", user.id)
        .order('created_at', { ascending: true });

      // Process progress for chart
      const progressByDate = progress?.reduce((acc: any, curr) => {
        const date = new Date(curr.last_accessed_at ?? Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {});

      const chartData = Object.entries(progressByDate || {}).map(([date, count]) => ({
        date,
        lessons: count
      })).slice(-7);

      return {
        chartData,
        totalCompleted: progress?.filter(p => p.is_completed).length || 0,
        avgQuizScore: quizAttempts?.length 
          ? Math.round(quizAttempts.reduce((acc, curr) => acc + (curr.score / curr.total_questions * 100), 0) / quizAttempts.length)
          : 0,
        avgPronScore: pronAttempts?.length
          ? Math.round(pronAttempts.reduce((acc, curr) => acc + curr.score, 0) / pronAttempts.length)
          : 0
      };
    }
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (formData: { full_name: string; phone: string }) =>
      updateMyProfile({ data: { fullName: formData.full_name, phone: formData.phone } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["my-account"] });
      queryClient.invalidateQueries({ queryKey: ["admin-all-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-teacher-perms"] });
      toast.success("Profile updated successfully");
    },
    onError: (error: any) => {
      toast.error("An error occurred while updating: " + error.message);
    }
  });

  const updatePasswordMutation = useMutation({
    mutationFn: async (password: string) => {
      const { error } = await supabase.auth.updateUser({ password: password || "" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Password changed successfully");
    },
    onError: (error: any) => {
      toast.error("An error occurred: " + error.message);
    }
  });

  const updateGoalsMutation = useMutation({
    mutationFn: async (goals: { daily_goal_xp: number; daily_goal_lessons: number }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Session not found");
      
      const { error } = await supabase
        .from("profiles")
        .update({
          daily_goal_xp: goals.daily_goal_xp,
          daily_goal_lessons: goals.daily_goal_lessons,
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Goals updated successfully");
    },
    onError: (error: any) => {
      toast.error("An error occurred while updating goals: " + error.message);
    }
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/auth";
  };

  if (isProfileLoading || isEnrollmentsLoading) {
    return (
      <div className="container py-24 text-center font-['Outfit']" dir="ltr">
        <div className="animate-pulse space-y-8 max-w-2xl mx-auto">
          <div className="h-32 w-32 bg-primary/10 rounded-full mx-auto" />
          <div className="h-8 w-48 bg-primary/10 rounded-lg mx-auto" />
          <div className="space-y-4">
            <div className="h-12 w-full bg-primary/5 rounded-xl" />
            <div className="h-12 w-full bg-primary/5 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-['Outfit'] pb-24" dir="ltr">
      {/* Background blobs */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-[10%] left-[10%] w-[30%] h-[30%] bg-primary/5 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-[10%] right-[10%] w-[25%] h-[25%] bg-accent/5 rounded-full blur-[80px]" />
      </div>

      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => window.location.href='/dashboard'} className="gap-2 font-bold">
            <ArrowRight className="h-4 w-4" />
            Back to Dashboard
          </Button>
          <div className="font-black text-xl text-primary">Account Settings</div>
        </div>
      </header>

      <main className="container pt-12 max-w-4xl">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar Nav */}
          <aside className="w-full md:w-64 space-y-2">
            {[
              { id: 'details', label: 'Personal Details', icon: User },
              { id: 'security', label: 'Security', icon: Lock },
              { id: 'subscription', label: 'Subscription & Progress', icon: CreditCard },
              { id: 'goals', label: "Today's Goals", icon: Target },
            ].map((item) => (
              <Button
                key={item.id}
                variant={activeTab === item.id ? 'default' : 'ghost'}
                className={cn(
                  "w-full justify-start gap-3 font-bold h-12 rounded-xl transition-all",
                  activeTab === item.id ? "shadow-lg shadow-primary/20" : "hover:bg-primary/5"
                )}
                onClick={() => setActiveTab(item.id as any)}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Button>
            ))}
            <div className="pt-8">
              <Button 
                variant="destructive" 
                className="w-full justify-start gap-3 font-bold h-12 rounded-xl"
                onClick={handleLogout}
              >
                <LogOut className="h-5 w-5" />
                Log Out
              </Button>
            </div>
          </aside>

          {/* Content Area */}
          <div className="flex-1">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
              >
                {activeTab === 'details' && (
                  <Card className="glass border-primary/10 overflow-hidden shadow-2xl">
                    <CardHeader className="bg-primary/5 border-b border-primary/10">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-20 w-20 border-2 border-primary/20 shadow-xl">
                          <AvatarImage src={profile?.avatar_url || ""} />
                          <AvatarFallback className="text-3xl bg-primary/10 text-primary font-black">
                            {profile?.full_name?.charAt(0) || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-2xl font-black">{profile?.full_name || "New User"}</CardTitle>
                          <CardDescription className="font-bold">
                            {profile?.role === 'admin' ? 'Platform Admin' : 'Diligent Student'}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-8 space-y-6">
                      <form onSubmit={(e) => {
                        e.preventDefault();
                        const formData = new FormData(e.currentTarget);
                        updateProfileMutation.mutate({
                          full_name: formData.get("full_name") as string,
                          phone: formData.get("phone") as string,
                        });
                      }}>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="full_name" className="font-bold">Full Name</Label>
                            <Input 
                              id="full_name" 
                              name="full_name" 
                              defaultValue={profile?.full_name || ""} 
                              className="h-12 rounded-xl focus:ring-primary/20 bg-background/50"
                              placeholder="Enter your full name"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="phone" className="font-bold">Phone Number</Label>
                            <div className="relative">
                              <Phone className="absolute right-3 top-4 h-4 w-4 text-muted-foreground" />
                              <Input 
                                id="phone" 
                                name="phone" 
                                className="h-12 pr-10 rounded-xl focus:ring-primary/20 bg-background/50"
                                defaultValue={profile?.phone || ""} 
                                placeholder="01xxxxxxxxx"
                              />
                            </div>
                          </div>
                          <Button 
                            type="submit" 
                            className="w-full h-12 rounded-xl font-black text-lg shadow-lg shadow-primary/20 mt-4" 
                            disabled={updateProfileMutation.isPending}
                          >
                            {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                          </Button>
                        </div>
                      </form>
                    </CardContent>
                  </Card>
                )}

                {activeTab === 'security' && (
                  <Card className="glass border-primary/10 overflow-hidden shadow-2xl">
                    <CardHeader className="bg-primary/5 border-b border-primary/10">
                      <div className="flex items-center gap-3">
                        <div className="bg-primary/20 p-2 rounded-lg">
                          <KeyRound className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-2xl font-black">Change Password</CardTitle>
                          <CardDescription className="font-bold">Keep your account secure with a strong password</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-8">
                      <form onSubmit={(e) => {
                        e.preventDefault();
                        const formData = new FormData(e.currentTarget);
                        const newPass = formData.get("new_password") as string;
                        const confirmPass = formData.get("confirm_password") as string;
                        
                        if (newPass !== confirmPass) {
                          toast.error("Passwords do not match");
                          return;
                        }
                        if (newPass.length < 6) {
                          toast.error("Password must be at least 6 characters");
                          return;
                        }
                        updatePasswordMutation.mutate(newPass);
                      }}>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label className="font-bold">New Password</Label>
                            <Input 
                              type="password" 
                              name="new_password"
                              className="h-12 rounded-xl bg-background/50"
                              placeholder="••••••••"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="font-bold">Confirm Password</Label>
                            <Input 
                              type="password" 
                              name="confirm_password"
                              className="h-12 rounded-xl bg-background/50"
                              placeholder="••••••••"
                            />
                          </div>
                          <Button 
                            type="submit" 
                            className="w-full h-12 rounded-xl font-black text-lg shadow-lg shadow-primary/20 mt-4"
                            disabled={updatePasswordMutation.isPending}
                          >
                            {updatePasswordMutation.isPending ? "Updating..." : "Update Password"}
                          </Button>
                        </div>
                      </form>
                    </CardContent>
                  </Card>
                )}

                {activeTab === 'subscription' && (
                  <div className="space-y-6">
                    <Card className="glass border-primary/10 overflow-hidden shadow-2xl">
                      <CardHeader className="bg-primary/5 border-b border-primary/10">
                        <div className="flex items-center gap-3">
                          <div className="bg-primary/20 p-2 rounded-lg">
                            <CreditCard className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-2xl font-black">Subscription Status</CardTitle>
                            <CardDescription className="font-bold">Details of your current membership</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-8">
                        <div className="p-6 rounded-2xl bg-gradient-to-br from-primary/10 to-transparent border border-primary/10 flex flex-col md:flex-row items-center justify-between gap-6">
                          <div className="text-center md:text-right">
                            <div className="text-sm font-bold text-muted-foreground mb-1">Current Plan</div>
                            <div className="text-2xl font-black text-primary">{(profile as any)?.subscription?.plan_name || 'Free Membership'}</div>
                          </div>
                          <div className="flex flex-col md:flex-row items-center gap-4">
                            <div className="bg-green-500/10 text-green-600 px-4 py-2 rounded-full font-black flex items-center gap-2">
                              <ShieldCheck className="h-5 w-5" />
                              Active
                            </div>
                            <Button 
                              variant="outline" 
                              className="font-bold border-primary/20 hover:bg-primary/5 rounded-xl gap-2"
                              onClick={() => window.location.href = '/subscription'}
                            >
                              <Settings className="h-4 w-4" />
                              Manage Subscription
                            </Button>
                          </div>
                        </div>

                      </CardContent>
                    </Card>

                    <Card className="glass border-primary/10 overflow-hidden shadow-2xl">
                      <CardHeader className="bg-primary/5 border-b border-primary/10">
                        <div className="flex items-center gap-3">
                          <div className="bg-primary/20 p-2 rounded-lg">
                            <GraduationCap className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-2xl font-black">Course Progress</CardTitle>
                            <CardDescription className="font-bold">An overview of your learning journey</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-8 space-y-8">
                        {/* Summary Stats Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {[
                            { label: 'Completed Lessons', value: progressStats?.totalCompleted || 0, icon: CheckCircle, color: 'text-green-500' },
                            { label: 'Average Quiz Score', value: `${progressStats?.avgQuizScore || 0}%`, icon: Activity, color: 'text-blue-500' },
                            { label: 'Pronunciation Accuracy', value: `${progressStats?.avgPronScore || 0}%`, icon: TrendingUp, color: 'text-purple-500' },
                            { label: 'Points Earned', value: (progressStats?.totalCompleted || 0) * 10, icon: Star, color: 'text-yellow-500' },
                          ].map((stat, i) => (
                            <div key={i} className="bg-background/50 p-4 rounded-2xl border border-primary/5 text-center space-y-1">
                              <stat.icon className={cn("h-5 w-5 mx-auto mb-1", stat.color)} />
                              <div className="text-xl font-black">{stat.value}</div>
                              <div className="text-[10px] font-bold text-muted-foreground">{stat.label}</div>
                            </div>
                          ))}
                        </div>

                        {/* Progress Chart */}
                        <div className="space-y-4">
                          <h3 className="font-black text-lg flex items-center gap-2">
                            <Activity className="h-5 w-5 text-primary" />
                            Learning Activity (Last 7 Days)
                          </h3>
                          <div className="h-[250px] w-full bg-background/30 rounded-2xl p-4 border border-primary/5">
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={progressStats?.chartData || []}>
                                <defs>
                                  <linearGradient id="colorLessons" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="oklch(0.55 0.15 250)" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="oklch(0.55 0.15 250)" stopOpacity={0}/>
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                                <XAxis 
                                  dataKey="date" 
                                  axisLine={false} 
                                  tickLine={false} 
                                  tick={{fontSize: 10, fontWeight: 'bold'}}
                                />
                                <YAxis 
                                  axisLine={false} 
                                  tickLine={false} 
                                  tick={{fontSize: 10, fontWeight: 'bold'}}
                                />
                                <Tooltip 
                                  contentStyle={{ 
                                    backgroundColor: 'rgba(255,255,255,0.8)', 
                                    backdropFilter: 'blur(10px)',
                                    border: '1px solid rgba(0,0,0,0.1)',
                                    borderRadius: '12px',
                                    fontWeight: 'bold'
                                  }}
                                />
                                <Area 
                                  type="monotone" 
                                  dataKey="lessons" 
                                  stroke="oklch(0.55 0.15 250)" 
                                  strokeWidth={3}
                                  fillOpacity={1} 
                                  fill="url(#colorLessons)" 
                                />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                        </div>

                        {/* Individual Course Progress */}
                        <div className="space-y-4">
                          <h3 className="font-black text-lg flex items-center gap-2">
                            <GraduationCap className="h-5 w-5 text-primary" />
                            Course Details
                          </h3>
                          {enrollments && enrollments.length > 0 ? (
                            enrollments.map((e: any) => (
                              <div key={e.id} className="bg-background/40 p-4 rounded-2xl border border-primary/5 space-y-3">
                                <div className="flex justify-between font-bold text-sm">
                                  <span>{e.courses?.title}</span>
                                  <span className="text-primary">100% Completed</span>
                                </div>
                                <div className="h-2 w-full bg-primary/10 rounded-full overflow-hidden">
                                  <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: "100%" }}
                                    className="h-full bg-primary shadow-[0_0_10px_rgba(var(--primary),0.3)]"
                                  />
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-8 text-muted-foreground font-bold">
                              You haven't started any course yet
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
                
                {activeTab === 'goals' && (
                  <Card className="glass border-primary/10 overflow-hidden shadow-2xl">
                    <CardHeader className="bg-primary/5 border-b border-primary/10">
                      <div className="flex items-center gap-3">
                        <div className="bg-primary/20 p-2 rounded-lg">
                          <Target className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-2xl font-black">Your Daily Goals</CardTitle>
                          <CardDescription className="font-bold">Set your goals to track your progress effectively</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-8">
                      <form onSubmit={(e) => {
                        e.preventDefault();
                        const formData = new FormData(e.currentTarget);
                        updateGoalsMutation.mutate({
                          daily_goal_xp: parseInt(formData.get("daily_goal_xp") as string),
                          daily_goal_lessons: parseInt(formData.get("daily_goal_lessons") as string),
                        });
                      }}>
                        <div className="space-y-6">
                          <div className="space-y-3">
                            <Label className="font-bold text-lg">Daily XP Goal</Label>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              {[50, 100, 200, 500].map((val) => (
                                <Button
                                  key={val}
                                  type="button"
                                  variant={(profile as any)?.daily_goal_xp === val ? 'default' : 'outline'}
                                  className="h-12 rounded-xl font-black"
                                  onClick={() => {
                                    const input = document.getElementById('daily_goal_xp') as HTMLInputElement;
                                    if (input) {
                                      input.value = val.toString();
                                    }
                                    updateGoalsMutation.mutate({
                                      daily_goal_xp: val,
                                      daily_goal_lessons: (profile as any)?.daily_goal_lessons || 1,
                                    });
                                  }}
                                >
                                  {val} XP
                                </Button>
                              ))}
                            </div>
                            <div className="pt-2">
                              <Label htmlFor="daily_goal_xp" className="text-sm font-bold text-muted-foreground">Or enter a custom number</Label>
                              <Input 
                                id="daily_goal_xp"
                                name="daily_goal_xp"
                                type="number"
                                defaultValue={(profile as any)?.daily_goal_xp || 100}
                                className="h-12 rounded-xl mt-1 bg-background/50"
                              />
                            </div>
                          </div>

                          <div className="space-y-3">
                            <Label className="font-bold text-lg">Daily Lessons Goal</Label>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              {[1, 2, 3, 5].map((val) => (
                                <Button
                                  key={val}
                                  type="button"
                                  variant={(profile as any)?.daily_goal_lessons === val ? 'default' : 'outline'}
                                  className="h-12 rounded-xl font-black"
                                  onClick={() => {
                                    updateGoalsMutation.mutate({
                                      daily_goal_xp: (profile as any)?.daily_goal_xp || 100,
                                      daily_goal_lessons: val,
                                    });
                                  }}
                                >
                                  {val} {val === 1 ? 'lesson' : 'lessons'}
                                </Button>
                              ))}
                            </div>
                            <div className="pt-2">
                              <Label htmlFor="daily_goal_lessons" className="text-sm font-bold text-muted-foreground">Or enter a custom number</Label>
                              <Input 
                                id="daily_goal_lessons"
                                name="daily_goal_lessons"
                                type="number"
                                defaultValue={(profile as any)?.daily_goal_lessons || 1}
                                className="h-12 rounded-xl mt-1 bg-background/50"
                              />
                            </div>
                          </div>

                          <Button 
                            type="submit" 
                            className="w-full h-14 rounded-xl font-black text-xl shadow-lg shadow-primary/20 mt-4"
                            disabled={updateGoalsMutation.isPending}
                          >
                            {updateGoalsMutation.isPending ? "Saving..." : "Save Daily Goals"}
                          </Button>
                        </div>
                      </form>
                    </CardContent>
                  </Card>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
}
