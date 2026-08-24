import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export const PracticeSkeleton = () => {
  return (
    <div className="min-h-screen bg-background py-12 px-4 font-['Cairo']" dir="rtl">
      <div className="container max-w-4xl mx-auto space-y-12">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-24 rounded-xl" />
          <Skeleton className="h-6 w-16" />
        </div>

        <div className="relative h-[400px] md:h-[500px] flex items-center justify-center">
          <div className="w-full max-w-lg px-4">
            <div className="glass p-8 md:p-12 text-center space-y-6 md:space-y-8 min-h-[350px] md:min-h-[400px] flex flex-col justify-center border-primary/20 rounded-[2.5rem]">
              <div className="space-y-4 flex flex-col items-center">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-16 md:h-20 w-3/4" />
              </div>

              <div className="space-y-4 flex flex-col items-center">
                <Skeleton className="h-12 w-1/2 rounded-2xl" />
              </div>

              <div className="flex justify-center pt-4">
                <Skeleton className="h-16 w-16 md:h-20 md:w-20 rounded-full" />
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-6">
          <Skeleton className="h-16 w-32 rounded-2xl" />
          <Skeleton className="h-16 w-32 rounded-2xl" />
        </div>

        <div className="bg-primary/5 p-8 rounded-[2rem] border border-primary/10 flex items-start gap-4">
           <Skeleton className="w-12 h-12 rounded-2xl shrink-0" />
           <div className="space-y-2 w-full">
             <Skeleton className="h-5 w-32" />
             <Skeleton className="h-4 w-full" />
             <Skeleton className="h-4 w-2/3" />
           </div>
        </div>
      </div>
    </div>
  );
};
