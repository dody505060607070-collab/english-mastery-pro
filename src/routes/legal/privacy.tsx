import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/legal/privacy")({
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background font-['Outfit']" dir="ltr">
      <main className="container py-24 max-w-4xl">
        <div className="flex items-center gap-4 mb-12">
          <div className="bg-primary/10 p-3 rounded-2xl">
            <ShieldCheck className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-4xl font-black">Privacy Policy</h1>
            <p className="text-muted-foreground mt-2">Last updated: August 14, 2026</p>
          </div>
        </div>

        <div className="prose prose-lg dark:prose-invert max-w-none space-y-8 text-left">
          <section>
            <h2 className="text-2xl font-black mb-4">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              At Blue Language, we take your privacy very seriously. This policy explains how we collect, use, and protect your personal information when you use our platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black mb-4">2. Information We Collect</h2>
            <p className="text-muted-foreground leading-relaxed">
              We collect the information you provide directly when creating an account or enrolling in a course, including your phone number, name, and payment transfer screenshots.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black mb-4">3. How We Use Your Information</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use your information to provide and improve our services, process enrollment requests, communicate with you about your academic progress, and for security and verification purposes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black mb-4">4. Data Protection</h2>
            <p className="text-muted-foreground leading-relaxed">
              We implement technical and organizational security measures to protect your data from unauthorized access, alteration, or disclosure.
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
