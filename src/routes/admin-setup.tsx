import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ShieldCheck, Loader2 } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { adminExists, bootstrapAdmin } from "@/lib/account.functions";
import { useAccount } from "@/hooks/useAccount";

export const Route = createFileRoute("/admin-setup")({
  head: () => ({
    meta: [
      { title: "Activate Admin Account | Blue Language" },
      { name: "description", content: "A one-time step to activate the first admin account on the academy platform." },
      { property: "og:title", content: "Activate Admin Account" },
      { property: "og:description", content: "Activate the first admin account for the platform." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminSetup,
});

function AdminSetup() {
  const navigate = useNavigate();
  const { data: account, isLoading, refetch } = useAccount();
  const existsQuery = useQuery({ queryKey: ["admin-exists"], queryFn: () => adminExists() });

  const promote = useMutation({
    mutationFn: () => bootstrapAdmin(),
    onSuccess: async () => {
      toast.success("Admin account activated");
      await refetch();
      navigate({ to: "/admin" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="min-h-screen flex items-center justify-center p-6 font-['Outfit']" dir="ltr">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <ShieldCheck className="h-12 w-12 text-primary mx-auto mb-2" />
          <CardTitle className="text-2xl font-black">Activate First Admin Account</CardTitle>
          <CardDescription className="font-medium">
            This page works only once: it grants the account you are signed in with admin permissions when there is no admin on the platform.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading || existsQuery.isLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : !account ? (
            <Button className="w-full font-black" asChild>
              <Link to="/auth">Sign in first</Link>
            </Button>
          ) : existsQuery.data?.exists ? (
            <div className="space-y-3 text-center">
              <p className="font-bold text-muted-foreground">An admin is already activated on the platform.</p>
              <Button className="w-full font-black" asChild>
                <Link to={account.isStaff ? "/admin" : "/dashboard"}>Continue</Link>
              </Button>
            </div>
          ) : (
            <Button
              className="w-full font-black h-12"
              onClick={() => promote.mutate()}
              disabled={promote.isPending}
            >
              {promote.isPending && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
              Activate My Account as Admin
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
