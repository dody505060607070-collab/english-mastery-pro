import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/legal/privacy")({
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background font-['Cairo']" dir="rtl">
      <main className="container py-24 max-w-4xl">
        <div className="flex items-center gap-4 mb-12">
          <div className="bg-primary/10 p-3 rounded-2xl">
            <ShieldCheck className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-4xl font-black">سياسة الخصوصية</h1>
            <p className="text-muted-foreground mt-2">تاريخ التحديث: 14 أغسطس 2026</p>
          </div>
        </div>

        <div className="prose prose-lg dark:prose-invert max-w-none space-y-8 text-right">
          <section>
            <h2 className="text-2xl font-black mb-4">1. مقدمة</h2>
            <p className="text-muted-foreground leading-relaxed">
              نحن في Blue Language Academy نولي اهتماماً كبيراً لخصوصيتك. توضح هذه السياسة كيفية جمعنا واستخدامنا وحمايتنا لمعلوماتك الشخصية عند استخدامك لمنصتنا.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black mb-4">2. المعلومات التي نجمعها</h2>
            <p className="text-muted-foreground leading-relaxed">
              نجمع المعلومات التي تقدمها لنا مباشرة عند إنشاء حساب أو الاشتراك في كورس، بما في ذلك رقم الهاتف، الاسم، وصور التحويلات المالية.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black mb-4">3. كيف نستخدم معلوماتك</h2>
            <p className="text-muted-foreground leading-relaxed">
              نستخدم معلوماتك لتوفير وتحسين خدماتنا، ومعالجة طلبات الاشتراك، والتواصل معك بشأن تقدمك الدراسي، ولأغراض الأمان والتحقق.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black mb-4">4. حماية البيانات</h2>
            <p className="text-muted-foreground leading-relaxed">
              نحن نطبق إجراءات أمنية تقنية وتنظيمية لحماية بياناتك من الوصول غير المصرح به أو التغيير أو الإفصاح.
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
