import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { motion } from "framer-motion";
import { HelpCircle, CreditCard, LogIn, BookOpen } from "lucide-react";
import { useSiteContent, pickText } from "@/lib/content";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "الأسئلة الشائعة | Blue Language Academy" },
      { name: "description", content: "إجابات على الأسئلة الشائعة حول أكاديمية Blue Language Academy، الدفع، والدخول" },
    ],
  }),
  component: FAQ,
});

const faqData = [
  {
    category: "الدفع والاشتراكات",
    icon: CreditCard,
    questions: [
      {
        q: "ما هي طرق الدفع المتاحة؟",
        a: "نقبل الدفع عبر فودافون كاش (Vodafone Cash) وإنستا باي (InstaPay) على الرقم {{wallet}}."
      },
      {
        q: "كيف يتم تفعيل الكورس بعد الدفع؟",
        a: "بعد إرسال صورة التحويل ورقم الهاتف عبر نموذج الدفع، يقوم فريق الإدارة بمراجعة الطلب وتفعيل الكورس في حسابك خلال 24 ساعة كحد أقصى."
      },
      {
        q: "هل يمكنني استرداد المبلغ بعد الشراء؟",
        a: "وفقاً لشروط الاستخدام، لا يمكن استرداد المبالغ بعد تفعيل الكورس نظراً لطبيعة المحتوى الرقمي، ولكن يمكننا مساعدتك في حال واجهت أي مشكلة تقنية."
      }
    ]
  },
  {
    category: "الدخول والحساب",
    icon: LogIn,
    questions: [
      {
        q: "كيف يمكنني إنشاء حساب جديد؟",
        a: "يمكنك إنشاء حساب باستخدام رقم هاتفك المحمول. ستصلك رسالة تأكيد أو يمكنك تعيين كلمة مرور مباشرة للبدء."
      },
      {
        q: "ماذا أفعل إذا نسيت كلمة المرور؟",
        a: "يمكنك التواصل مع الدعم الفني عبر واتساب لمساعدتك في استعادة الوصول إلى حسابك بسرعة."
      },
      {
        q: "هل يمكنني فتح حسابي من أكثر من جهاز؟",
        a: "يسمح بفتح الحساب من جهازين كحد أقصى لضمان أمان حسابك وجودة التجربة التعليمية."
      }
    ]
  },
  {
    category: "الدراسة والمحتوى",
    icon: BookOpen,
    questions: [
      {
        q: "هل الكورسات مسجلة أم مباشرة؟",
        a: "معظم الكورسات لدينا مسجلة بجودة عالية لتمكنك من المذاكرة في أي وقت، مع وجود جلسات مباشرة دورية للرد على الاستفسارات."
      },
      {
        q: "هل أحصل على شهادة بعد الانتهاور؟",
        a: "نعم، بمجرد إكمال جميع دروس الكورس واجتياز الاختبارات، يمكنك تحميل شهادة إتمام معتمدة من الأكاديمية بصيغة PDF."
      }
    ]
  }
];

function FAQ() {
  const { data: siteContent } = useSiteContent();
  const wallet = pickText(siteContent?.["payment.wallet"], "ar", "01035851426");
  const wa = pickText(siteContent?.["contact.whatsapp"], "ar", "+201035851426").replace(/[^0-9]/g, "");
  return (
    <div className="min-h-screen bg-background text-foreground py-20" dir="rtl">
      <div className="container max-w-4xl">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-2xl text-primary mb-6">
            <HelpCircle className="w-10 h-10" />
          </div>
          <h1 className="text-4xl md:text-5xl font-black mb-4">الأسئلة الشائعة</h1>
          <p className="text-muted-foreground text-lg">
            كل ما تحتاج معرفته عن المنصة والاشتراكات في مكان واحد
          </p>
        </motion.div>

        <div className="space-y-12">
          {faqData.map((section, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
            >
              <div className="flex items-center gap-3 mb-6 border-b pb-4">
                <section.icon className="w-6 h-6 text-primary" />
                <h2 className="text-2xl font-black">{section.category}</h2>
              </div>
              <Accordion type="single" collapsible className="w-full space-y-4">
                {section.questions.map((item, qIdx) => (
                  <AccordionItem 
                    key={qIdx} 
                    value={`item-${idx}-${qIdx}`}
                    className="glass border-border/40 px-6 rounded-xl overflow-hidden"
                  >
                    <AccordionTrigger className="text-right font-bold hover:no-underline py-6">
                      {item.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground leading-relaxed text-lg pb-6">
                      {item.a.replace("{{wallet}}", wallet)}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </motion.div>
          ))}
        </div>

        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          className="mt-20 p-8 rounded-3xl bg-primary/5 border border-primary/10 text-center"
        >
          <h3 className="text-xl font-bold mb-4">لم تجد إجابة لسؤالك؟</h3>
          <p className="text-muted-foreground mb-8">نحن هنا للمساعدة في أي وقت</p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button size="lg" asChild>
              <a href="/contact">تواصل معنا</a>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer">واتساب</a>
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
