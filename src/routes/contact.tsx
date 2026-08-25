import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Phone, MapPin, Send, MessageSquare } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { toast } from "sonner";
import { useSiteContent, pickText } from "@/lib/content";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact Us | Blue Language" },
      { name: "description", content: "Contact the Blue Language Academy team for inquiries and technical support" },
    ],
  }),
  component: Contact,
});

function Contact() {
  const { data: siteContent } = useSiteContent();
  const phone = pickText(siteContent?.["contact.phone"], "ar", "+201035851426");
  const email = pickText(siteContent?.["contact.email"], "ar", "abanoubeldabee@gmail.com");
  const wa = pickText(siteContent?.["contact.whatsapp"], "ar", "+201035851426").replace(/[^0-9]/g, "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Simulate API call
    setTimeout(() => {
      toast.success("Your message has been sent successfully! We will get back to you soon.");
      setIsSubmitting(false);
      (e.target as HTMLFormElement).reset();
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-background text-foreground py-20" dir="ltr">
      <div className="container max-w-6xl">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h1 className="text-4xl md:text-5xl font-black mb-4">Contact Us</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            We are here to help you on your journey to learning English. Feel free to ask any question.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Contact Info */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="glass border-border/40 overflow-hidden">
              <CardContent className="p-6 space-y-8">
                <div className="flex items-start gap-4">
                  <div className="bg-primary/10 p-3 rounded-xl text-primary">
                    <Phone className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg">Call Us</h4>
                    <p className="text-muted-foreground" dir="ltr">{phone}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="bg-primary/10 p-3 rounded-xl text-primary">
                    <Mail className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg">Email</h4>
                    <p className="text-muted-foreground">{email}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="bg-primary/10 p-3 rounded-xl text-primary">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg">Location</h4>
                    <p className="text-muted-foreground">Cairo, Egypt</p>
                  </div>
                </div>

                <div className="pt-6 border-t">
                  <h4 className="font-bold mb-4">Working Hours</h4>
                  <p className="text-sm text-muted-foreground">Saturday - Thursday: 9:00 AM - 9:00 PM</p>
                  <p className="text-sm text-muted-foreground">Friday: Closed</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-primary text-primary-foreground">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <MessageSquare className="w-6 h-6" />
                  <h4 className="font-black text-xl">Direct Technical Support</h4>
                </div>
                <p className="mb-6 text-primary-foreground/80">
                  Need quick help? Our team is available to answer your questions via WhatsApp.
                </p>
                <Button variant="secondary" className="w-full font-black py-6" asChild>
                  <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer">
                    Contact via WhatsApp
                  </a>
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2">
            <Card className="glass border-border/40 h-full">
              <CardHeader>
                <CardTitle className="text-2xl font-black">Send Us a Message</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold">Full Name</label>
                      <Input placeholder="Enter your name" required className="h-12 bg-background/50" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold">Phone Number</label>
                      <Input placeholder="01xxxxxxxxx" required className="h-12 bg-background/50" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold">Subject</label>
                    <Input placeholder="How can we help you?" required className="h-12 bg-background/50" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold">Message</label>
                    <Textarea 
                      placeholder="Write your message here..." 
                      className="min-h-[150px] bg-background/50" 
                      required 
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full h-14 text-lg font-black" 
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Sending..." : "Send Message"}
                    {!isSubmitting && <Send className="mr-2 h-5 w-5" />}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
