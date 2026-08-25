import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { motion } from "framer-motion";
import { HelpCircle, CreditCard, LogIn, BookOpen } from "lucide-react";
import { useSiteContent, pickText } from "@/lib/content";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQ | Blue Language" },
      { name: "description", content: "Answers to frequently asked questions about Blue Language Academy, payment, and sign-in" },
    ],
  }),
  component: FAQ,
});

const faqData = [
  {
    category: "Payments & Subscriptions",
    icon: CreditCard,
    questions: [
      {
        q: "What payment methods are available?",
        a: "We accept payment via Vodafone Cash and InstaPay to the number {{wallet}}."
      },
      {
        q: "How is the course activated after payment?",
        a: "After sending the transfer screenshot and phone number via the payment form, our admin team reviews the request and activates the course on your account within 24 hours at most."
      },
      {
        q: "Can I get a refund after purchasing?",
        a: "According to our terms of use, refunds are not possible after the course has been activated due to the nature of digital content, but we can help you if you encounter any technical issue."
      }
    ]
  },
  {
    category: "Sign-in & Account",
    icon: LogIn,
    questions: [
      {
        q: "How can I create a new account?",
        a: "You can create an account using your mobile phone number. You will receive a confirmation message, or you can set a password directly to get started."
      },
      {
        q: "What should I do if I forget my password?",
        a: "You can contact technical support via WhatsApp to help you quickly regain access to your account."
      },
      {
        q: "Can I access my account from more than one device?",
        a: "You can access your account from up to two devices to ensure account security and a quality learning experience."
      }
    ]
  },
  {
    category: "Study & Content",
    icon: BookOpen,
    questions: [
      {
        q: "Are the courses recorded or live?",
        a: "Most of our courses are recorded in high quality so you can study anytime, with periodic live sessions to answer questions."
      },
      {
        q: "Do I get a certificate after finishing?",
        a: "Yes, once you complete all the course lessons and pass the quizzes, you can download a certified completion certificate from the academy as a PDF."
      }
    ]
  }
];

function FAQ() {
  const { data: siteContent } = useSiteContent();
  const wallet = pickText(siteContent?.["payment.wallet"], "ar", "01035851426");
  const wa = pickText(siteContent?.["contact.whatsapp"], "ar", "+201035851426").replace(/[^0-9]/g, "");
  return (
    <div className="min-h-screen bg-background text-foreground py-20" dir="ltr">
      <div className="container max-w-4xl">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-2xl text-primary mb-6">
            <HelpCircle className="w-10 h-10" />
          </div>
          <h1 className="text-4xl md:text-5xl font-black mb-4">Frequently Asked Questions</h1>
          <p className="text-muted-foreground text-lg">
            Everything you need to know about the platform and subscriptions, all in one place
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
                    <AccordionTrigger className="text-left font-bold hover:no-underline py-6">
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
          <h3 className="text-xl font-bold mb-4">Didn't find an answer to your question?</h3>
          <p className="text-muted-foreground mb-8">We are here to help anytime</p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button size="lg" asChild>
              <a href="/contact">Contact Us</a>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer">WhatsApp</a>
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
