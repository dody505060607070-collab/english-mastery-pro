import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Layers } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getStudentLevelAccess, setStudentLevelAccess } from "@/lib/level-access.functions";

type Section = { id: string; name: string };

export function StudentLevelAccessDialog({
  student,
  sections,
  onClose,
}: {
  student: { id: string; full_name?: string | null } | null;
  sections: Section[];
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);

  const accessQuery = useQuery({
    queryKey: ["student-level-access", student?.id],
    queryFn: () => getStudentLevelAccess({ data: { userId: student!.id } }),
    enabled: !!student,
  });

  useEffect(() => {
    if (accessQuery.data) setSelected(accessQuery.data.extraSectionIds);
  }, [accessQuery.data]);

  const save = useMutation({
    mutationFn: () => setStudentLevelAccess({ data: { userId: student!.id, sectionIds: selected } }),
    onSuccess: () => {
      toast.success("Level access updated");
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const mainSectionId = accessQuery.data?.mainSectionId ?? null;

  return (
    <Dialog open={!!student} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="font-['Outfit'] max-h-[85vh] overflow-y-auto" dir="ltr">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" /> Level access
          </DialogTitle>
          <DialogDescription>
            Choose every extra level {student?.full_name || "this student"} can open. Their main level stays open
            automatically.
          </DialogDescription>
        </DialogHeader>

        {accessQuery.isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-2">
            {sections.map((section) => {
              const isMain = section.id === mainSectionId;
              const checked = isMain || selected.includes(section.id);
              return (
                <label
                  key={section.id}
                  className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50"
                >
                  <Checkbox
                    checked={checked}
                    disabled={isMain}
                    onCheckedChange={(value) =>
                      setSelected((prev) =>
                        value === true ? Array.from(new Set([...prev, section.id])) : prev.filter((id) => id !== section.id),
                      )
                    }
                  />
                  <Label className="flex-1 cursor-pointer font-bold">{section.name}</Label>
                  {isMain && <Badge variant="secondary">Main level</Badge>}
                </label>
              );
            })}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={save.isPending}>
            Cancel
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || accessQuery.isLoading}>
            {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save access
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
