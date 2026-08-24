import { useQuery } from "@tanstack/react-query";
import { getMyAccount } from "@/lib/account.functions";

export function useAccount() {
  return useQuery({
    queryKey: ["my-account"],
    queryFn: () => getMyAccount(),
    staleTime: 30_000,
    retry: false,
  });
}
