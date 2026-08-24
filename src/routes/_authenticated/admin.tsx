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
  Settings,


  Loader2,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAccount } from "@/hooks/useAccount";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

const menuItems: { title: string; icon: typeof Users; href: string; adminOnly?: boolean }[] = [
  { title: "Statistics", icon: LayoutDashboard, href: "/admin" },
  { title: "Registration Requests", icon: UserCheck, href: "/admin/approvals" },
  { title: "Live Courses", icon: Radio, href: "/admin/live" },
  { title: "Record Lecture", icon: PlaySquare, href: "/admin/recordings" },
  { title: "Students", icon: Users, href: "/admin/students" },
  { title: "Levels & Units", icon: Layers, href: "/admin/sections" },
  { title: "Analytics", icon: BarChart3, href: "/admin/analytics" },
  { title: "Courses", icon: BookOpen, href: "/admin/courses" },
  { title: "Payment Requests", icon: CreditCard, href: "/admin/payments" },
  { title: "Dictionary", icon: FileText, href: "/admin/vocabulary" },
  { title: "Activity Log", icon: HistoryIcon, href: "/admin/logs" },
  { title: "Notifications", icon: Bell, href: "/admin/notifications" },
  { title: "Permissions", icon: Shield, href: "/admin/roles", adminOnly: true },
  { title: "Site Content", icon: Settings, href: "/admin/content", adminOnly: true },
];

function AdminLayout() {
  const location = useLocation();
  const { data: account, isLoading } = useAccount();

  const visibleItems = menuItems.filter((i) => !i.adminOnly || account?.isAdmin);

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

        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {visibleItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all group",
                active(item.href)
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                  : "hover:bg-primary/5 text-muted-foreground hover:text-primary",
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="font-bold text-sm">{item.title}</span>
            </Link>
          ))}
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
        <header className="h-16 border-b bg-background/70 backdrop-blur-md sticky top-0 z-20 flex items-center px-4 md:px-8">
          <h2 className="text-base md:text-lg font-black">
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
                  "px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap",
                  active(item.href) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                )}
              >
                {item.title}
              </Link>
            ))}
          </div>
        </div>

        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
