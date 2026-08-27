import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { listMyWords, saveMyWord, updateMyWord } from "@/lib/learning.functions";

type WordExtra = Partial<
  Record<"translation" | "phonetic" | "example" | "example_ar" | "part_of_speech", string | null | undefined>
>;

function clean(extra: WordExtra) {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(extra)) if (v) out[k] = v;
  return out;
}

/**
 * Shared star/save logic for a single word.
 * Reflects the real saved state from My Words and toggles it both ways.
 */
export function useStarWord(word: string, extra: WordExtra = {}) {
  const qc = useQueryClient();
  const key = word.trim().toLowerCase();
  const { data = [] } = useQuery({
    queryKey: ["my-words"],
    queryFn: () => listMyWords(),
    staleTime: 60_000,
  });
  const row = data.find((w) => w.word === key);
  const starred = !!row?.starred;

  const toggle = useMutation({
    mutationFn: () =>
      row
        ? updateMyWord({ data: { id: row.id, starred: !starred } })
        : saveMyWord({ data: { word: key, starred: true, ...clean(extra) } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-words"] });
      toast.success(starred ? "Removed from starred" : "Starred in My Words");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { starred, saved: !!row, toggle, pending: toggle.isPending };
}
