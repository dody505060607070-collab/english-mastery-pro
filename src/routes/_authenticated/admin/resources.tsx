import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/resources")({
  component: () => (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4 animate-in fade-in duration-700 font-['Cairo']">
      <div className="bg-primary/10 p-6 rounded-full">
        <div className="h-16 w-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
      <h2 className="text-2xl font-bold">قريباً: إدارة المصادر</h2>
      <p className="text-muted-foreground max-w-md">
        نقوم حالياً بتطوير نظام مركزي لإدارة الملفات (PDF)، الصور، والفيديوهات وربطها بالدروس.
      </p>
    </div>
  ),
});
