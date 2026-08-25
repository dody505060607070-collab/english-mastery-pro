import { createFileRoute } from "@tanstack/react-router";
import { Scale, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/legal/terms")({
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="min-h-screen bg-background font-['Outfit']" dir="ltr">
      <main className="container py-24 max-w-4xl">
        <div className="flex items-center gap-4 mb-12">
          <div className="bg-primary/10 p-3 rounded-2xl">
            <Scale className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-4xl font-black">Terms of Use</h1>
            <p className="text-muted-foreground mt-2">Last updated: August 14, 2026</p>
          </div>
        </div>

        <div className="prose prose-lg dark:prose-invert max-w-none space-y-8 text-left">
          <section>
            <h2 className="text-2xl font-black mb-4">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By using the Blue Language platform, you agree to abide by these terms and conditions. If you do not agree with any part of them, please do not use the platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black mb-4">2. Accounts & Subscriptions</h2>
            <p className="text-muted-foreground leading-relaxed">
              You are responsible for keeping your account credentials confidential. Course subscriptions are personal and non-transferable, and may not be shared with others.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black mb-4">3. Intellectual Property</h2>
            <p className="text-muted-foreground leading-relaxed">
              All content available on the platform, including videos, text, and quizzes, is the exclusive property of the academy and is protected under intellectual property laws.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black mb-4">4. Cancellation & Refund Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              Due to the nature of digital products, all purchases are final and non-refundable once access to course content has been activated.
            </p>
          </section>
        </div>

        <div className="mt-16 pt-8 border-t">
          <Link to="/">
            <Button variant="ghost" className="gap-2">
              <ArrowRight className="h-4 w-4" />
              Back to Home
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
