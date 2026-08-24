import { createFileRoute } from "@tanstack/react-router";
import { Scale, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/legal/terms")({
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="min-h-screen bg-background font-['Cairo']" dir="rtl">
      <main className="container py-24 max-w-4xl">
        <div className="flex items-center gap-4 mb-12">
          <div className="bg-primary/10 p-3 rounded-2xl">
            <Scale className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-4xl font-black">شروط الاستخدام</h1>
            <p className="text-muted-foreground mt-2">تاريخ التحديث: 14 أغسطس 2026</p>
          </div>
        </div>

        <div className="prose prose-lg dark:prose-invert max-w-none space-y-8 text-right">
          <section>
            <h2 className="text-2xl font-black mb-4">1. قبول الشروط</h2>
            <p className="text-muted-foreground leading-relaxed">
              باستخدامك لمنصة Blue Language Academy، فإنك توافق على الالتزام بهذه الشروط والأحكام. إذا كنت لا توافق على أي جزء منها، فيرجى عدم استخدام المنصة.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black mb-4">2. الحسابات والاشتراكات</h2>
            <p className="text-muted-foreground leading-relaxed">
              أنت مسؤول عن الحفاظ على سرية بيانات حسابك. الاشتراكات في الكورسات شخصية وغير قابلة للتحويل أو المشاركة مع الآخرين.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black mb-4">3. الملكية الفكرية</h2>
            <p className="text-muted-foreground leading-relaxed">
              جميع المحتويات المتوفرة على المنصة، بما في ذلك الفيديوهات والنصوص والاختبارات، هي ملك حصري للأكاديمية ومحمية بموجب قوانين الملكية الفكرية.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black mb-4">4. سياسة الإلغاء والاسترداد</h2>
            <p className="text-muted-foreground leading-relaxed">
              نظراً لطبيعة المنتجات الرقمية، فإن جميع عمليات الشراء نهائية وغير قابلة للاسترداد بمجرد تفعيل الوصول إلى محتوى الكورس.
            </p>
          </section>
        </div>

        <div className="mt-16 pt-8 border-t">
          <Link to="/">
            <Button variant="ghost" className="gap-2">
              <ArrowRight className="h-4 w-4" />
              العودة للرئيسية
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
