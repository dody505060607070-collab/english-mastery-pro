import { createFileRoute, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Ban, Clock, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useAccount } from "@/hooks/useAccount";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { data: account, isLoading } = useAccount();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  if (account?.isBlocked) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center font-['Outfit']"
        dir="ltr"
      >
        <Ban className="h-14 w-14 text-destructive" />
        <h1 className="text-2xl font-black">Account Suspended</h1>
        <p className="text-muted-foreground max-w-md">
          This account has been blocked by the academy administration. Please contact support for details.
        </p>
        <Button onClick={signOut}>Sign Out</Button>
      </div>
    );
  }

  if (!account?.isStaff && account?.approvalStatus && account.approvalStatus !== "approved") {
    const rejected = account.approvalStatus === "rejected";
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center font-['Outfit']"
        dir="ltr"
      >
        {rejected ? (
          <Ban className="h-14 w-14 text-destructive" />
        ) : (
          <Clock className="h-14 w-14 text-primary" />
        )}
        <h1 className="text-2xl font-black">
          {rejected ? "Account Application Rejected" : "Account Under Review"}
        </h1>
        <p className="text-muted-foreground max-w-md">
          {rejected
            ? "Your application was not approved. Please contact the academy administration."
            : "Your registration has been received successfully and will be activated after administrative approval."}
        </p>
        {account.approvalNote && (
          <p className="text-sm font-bold bg-muted px-4 py-2 rounded-xl">{account.approvalNote}</p>
        )}
        <Button onClick={signOut}>Sign Out</Button>
      </div>
    );
  }

  return <Outlet />;
}

