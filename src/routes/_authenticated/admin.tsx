import { createFileRoute, Outlet, Link, useLocation } from "@tanstack/react-router";
import {
  Users,
  BookOpen,
  LayoutDashboard,
  Shield,
  Layers,
  FileText,
  ChevronLeft,
  History as HistoryIcon,
  BarChart3,
  Bell,
  CreditCard,
  Radio,
  PlaySquare,
  UserCheck,
  Eye,
  GraduationCap,
  Settings,


  Loader2,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAccount } from "@/hooks/useAccount";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyCapabilities } from "@/lib/teacher-perms.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

const menuItems: {
  title: string;
  icon: typeof Users;
  href: string;
  adminOnly?: boolean;
  cap?: string;
  color: string;
}[] = [
  { title: "Statistics", icon: LayoutDashboard, href: "/admin", color: "bg-sky-500/12 text-sky-600" },
  { title: "Registration Requests", icon: UserCheck, href: "/admin/approvals", cap: "approvals", color: "bg-amber-500/12 text-amber-600" },
  { title: "Live Courses", icon: Radio, href: "/admin/live", cap: "live", color: "bg-rose-500/12 text-rose-600" },
  { title: "Record Lecture", icon: PlaySquare, href: "/admin/recordings", cap: "recordings", color: "bg-violet-500/12 text-violet-600" },
  { title: "Students", icon: Users, href: "/admin/students", cap: "students", color: "bg-emerald-500/12 text-emerald-600" },
  { title: "Student View", icon: Eye, href: "/admin/student-view", color: "bg-cyan-500/12 text-cyan-600" },
  { title: "Levels & Units", icon: Layers, href: "/admin/sections", cap: "curriculum", color: "bg-indigo-500/12 text-indigo-600" },
  { title: "Analytics", icon: BarChart3, href: "/admin/analytics", cap: "analytics", color: "bg-teal-500/12 text-teal-600" },
  { title: "Courses", icon: BookOpen, href: "/admin/courses", cap: "courses", color: "bg-orange-500/12 text-orange-600" },
  { title: "Payment Requests", icon: CreditCard, href: "/admin/payments", cap: "payments", color: "bg-lime-500/12 text-lime-600" },
  { title: "Dictionary", icon: FileText, href: "/admin/vocabulary", cap: "vocabulary", color: "bg-pink-500/12 text-pink-600" },
  { title: "Activity Log", icon: HistoryIcon, href: "/admin/logs", adminOnly: true, color: "bg-slate-500/12 text-slate-600" },
  { title: "Notifications", icon: Bell, href: "/admin/notifications", cap: "notifications", color: "bg-yellow-500/12 text-yellow-600" },
  { title: "Permissions", icon: Shield, href: "/admin/roles", adminOnly: true, color: "bg-fuchsia-500/12 text-fuchsia-600" },
  { title: "Teacher Permissions", icon: GraduationCap, href: "/admin/teachers", adminOnly: true, color: "bg-blue-500/12 text-blue-600" },
  { title: "Site Content", icon: Settings, href: "/admin/content", adminOnly: true, color: "bg-stone-500/12 text-stone-600" },
];


function AdminLayout() {
  const location = useLocation();
  const { data: account, isLoading } = useAccount();
  const fetchCaps = useServerFn(getMyCapabilities);
  const { data: myCaps } = useQuery({
    queryKey: ["my-capabilities"],
    queryFn: () => fetchCaps(),
    enabled: !!account?.isStaff,
  });

  const visibleItems = menuItems.filter((i) => {
    if (i.adminOnly && !account?.isAdmin) return false;
    if (account?.isAdmin || myCaps?.isAdmin) return true;
    if (!i.cap) return true;
    return (myCaps?.caps ?? []).includes(i.cap);
  });

  const active = (href: string) =>
    href === "/admin" ? location.pathname === "/admin" : location.pathname.startsWith(href);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  if (!account?.isStaff) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center font-['Outfit']" dir="ltr">
        <ShieldAlert className="h-12 w-12 text-destructive" />
        <h1 className="text-2xl font-black">This page is for administration only</h1>
        <p className="text-muted-foreground">You do not have permission to access the admin panel.</p>
        <Button asChild>
          <Link to="/dashboard">Back to Student Panel</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background font-['Outfit']" dir="ltr">
      <aside className="w-64 border-r bg-card/50 backdrop-blur-xl hidden md:flex flex-col sticky top-0 h-screen">
        <div className="p-6 border-b">
          <Link to="/" className="flex items-center gap-2 font-black text-lg text-primary">
            <span className="bg-primary/10 p-2 rounded-xl">B</span>
            <span>Admin Panel</span>
          </Link>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {visibleItems.map((item) => {
            const isActive = active(item.href);
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all",
                  isActive ? "bg-primary/10 text-primary" : "hover:bg-muted/70 text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "grid h-9 w-9 shrink-0 place-items-center rounded-xl transition-transform",
                    item.color,
                    isActive && "scale-105 shadow-sm",
                  )}
                >
                  <item.icon className="h-4.5 w-4.5" />
                </span>
                <span className={cn("font-bold text-sm truncate", isActive && "text-foreground")}>{item.title}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t">
          <Button variant="ghost" className="w-full justify-start gap-3 rounded-xl text-muted-foreground" asChild>
            <Link to="/dashboard">
              <ChevronLeft className="h-4 w-4" />
              Student Panel
            </Link>
          </Button>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <header className="h-16 border-b bg-background/70 backdrop-blur-md sticky top-0 z-20 flex items-center gap-3 px-4 md:px-8">
          {(() => {
            const cur = visibleItems.find((i) => active(i.href));
            const Icon = cur?.icon ?? LayoutDashboard;
            return (
              <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl", cur?.color ?? "bg-primary/10 text-primary")}>
                <Icon className="h-4.5 w-4.5" />
              </span>
            );
          })()}
          <h2 className="text-base md:text-lg font-black truncate">
            {visibleItems.find((i) => active(i.href))?.title || "Admin Panel"}
          </h2>
        </header>

        <div className="md:hidden border-b overflow-x-auto">
          <div className="flex gap-2 p-3 w-max">
            {visibleItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap border",
                  active(item.href)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border/60",
                )}
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.title}
              </Link>
            ))}
          </div>
        </div>


        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          {(() => {
            if (!account?.isAdmin && !myCaps) {
              return (
                <div className="flex justify-center py-24">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              );
            }
            const matched = menuItems
              .filter((i) => i.href !== "/admin")
              .find((i) => location.pathname.startsWith(i.href));
            const allowed =
              !matched ||
              (matched.adminOnly
                ? !!account?.isAdmin
                : account?.isAdmin || myCaps?.isAdmin || !matched.cap
                  ? true
                  : (myCaps?.caps ?? []).includes(matched.cap));
            if (!allowed) {
              return (
                <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
                  <ShieldAlert className="h-10 w-10 text-destructive" />
                  <h3 className="text-xl font-black">You do not have access to this section</h3>
                  <p className="text-muted-foreground text-sm">
                    Ask an administrator to grant you the “{matched?.title}” permission.
                  </p>
                  <Button asChild variant="outline" className="mt-2">
                    <Link to="/admin">Back to Admin Panel</Link>
                  </Button>
                </div>
              );
            }
            return <Outlet />;
          })()}
        </div>
      </main>
    </div>
  );
}
