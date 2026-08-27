import { Bookmark, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStarWord } from "@/hooks/useStarWord";

/**
 * Bookmark button used on dictionary and vocabulary cards.
 * One tap saves the word to My Words, another tap removes it.
 */
export function SaveWordBookmark({
  word,
  translation,
  phonetic,
  example,
  example_ar,
  part_of_speech,
  className,
}: {
  word: string;
  translation?: string | null;
  phonetic?: string | null;
  example?: string | null;
  example_ar?: string | null;
  part_of_speech?: string | null;
  className?: string;
}) {
  const { starred, pending, toggle } = useStarWord(word, {
    translation,
    phonetic,
    example,
    example_ar,
    part_of_speech,
  });

  return (
    <button
      type="button"
      onClick={() => toggle.mutate()}
      disabled={pending}
      aria-label={starred ? `Remove ${word} from My Words` : `Save ${word} to My Words`}
      title={starred ? "Saved — tap to remove" : "Save to My Words"}
      className={cn(
        "grid h-10 w-10 place-items-center rounded-full border transition touch-manipulation",
        starred
          ? "border-primary bg-primary text-primary-foreground shadow-sm"
          : "border-border bg-background text-muted-foreground hover:border-primary hover:text-primary",
        className,
      )}
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Bookmark className={cn("h-4 w-4", starred && "fill-current")} />
      )}
    </button>
  );
}
