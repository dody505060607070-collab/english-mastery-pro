import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { z } from "zod";
import {
  GraduationCap,
  Phone,
  Lock,
  User,
  Camera,
  Loader2,
  LogIn,
  UserPlus,
  Layers,
  BookOpen,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { signUpStudent, signUpStaff, getMyAccount } from "@/lib/account.functions";
import { getPublicCurriculum } from "@/lib/curriculum.functions";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Login & Student Sign Up | Blue Language Academy" },
      {
        name: "description",
        content: "Create a new student account or log in to track your study units and English learning progress.",
      },
      { property: "og:title", content: "Login | Blue Language Academy" },
      {
        property: "og:description",
        content: "Free Student Account: Choose your level and unit and start learning immediately.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

const signupSchema = z
  .object({
    fullName: z.string().trim().min(3, "Name is too short").max(100),
    phone: z.string().trim().regex(/^[0-9]{10,15}$/, "Invalid phone number"),
    password: z.string().min(6, "Password must be at least 6 characters").max(72),
    confirm: z.string(),
    sectionId: z.string().optional(),
  })
  .refine((v) => v.password === v.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  });

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read-error"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("image-error"));
      img.onload = () => {
        const max = 512;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("canvas-error"));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup" | "staff">("login");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    password: "",
    confirm: "",
    sectionId: "",
    grade: "",
    unitId: "",
  });
  const [photo, setPhoto] = useState<string | null>(null);
  const staffFileRef = useRef<HTMLInputElement>(null);

  // Resume an existing session instead of asking the student to sign in again.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const saved = localStorage.getItem("bla:last-phone");
      if (saved) setForm((prev) => ({ ...prev, phone: prev.phone || saved }));
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!data.session) {
        setCheckingSession(false);
        return;
      }
      try {
        const account = await getMyAccount();
        if (cancelled) return;
        if (account.isBlocked) {
          await supabase.auth.signOut();
          setCheckingSession(false);
          return;
        }
        navigate({ to: account.isStaff ? "/admin" : "/dashboard", replace: true });
      } catch {
        if (!cancelled) setCheckingSession(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const { data: curriculum } = useQuery({
    queryKey: ["public-curriculum"],
    queryFn: () => getPublicCurriculum(),
    staleTime: 5 * 60_000,
  });

  const sections = curriculum?.sections ?? [];
  const units = (curriculum?.units ?? []).filter((u) => u.section_id === form.sectionId);

  const set = (key: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Image size too large (limit 8MB)");
      return;
    }
    try {
      setPhoto(await compressImage(file));
    } catch {
      toast.error("Failed to read image");
    }
  }

  async function routeAfterLogin() {
    const account = await getMyAccount();
    if (account.isBlocked) {
      await supabase.auth.signOut();
      toast.error("Your account is blocked. Contact academy management.");
      return;
    }
    localStorage.setItem("bla:last-phone", form.phone.trim());
    toast.success("Login successful");
    navigate({ to: account.isStaff ? "/admin" : "/dashboard" });
  }

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: `${form.phone.trim()}@academy.com`,
        password: form.password,
      });
      if (error) throw new Error("Incorrect phone number or password");
      await routeAfterLogin();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  async function onStaffSignup(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[0-9]{10,15}$/.test(form.phone.trim())) {
      toast.error("Invalid phone number");
      return;
    }
    if (form.fullName.trim().length < 3) {
      toast.error("Name is too short");
      return;
    }
    if (form.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (form.password !== form.confirm) {
      toast.error("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await signUpStaff({
        data: {
          fullName: form.fullName,
          phone: form.phone,
          password: form.password,
          avatarBase64: photo,
        },
      });
      const { error } = await supabase.auth.signInWithPassword({
        email: `${form.phone.trim()}@academy.com`,
        password: form.password,
      });
      if (error) {
        toast.success("Account created, you can log in now");
        setMode("login");
        return;
      }
      toast.success("Welcome! Staff account created");
      navigate({ to: "/admin" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create account");
    } finally {
      setLoading(false);
    }
  }

  async function onSignup(e: React.FormEvent) {
    e.preventDefault();
    const parsed = signupSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Incomplete data");
      return;
    }
    setLoading(true);
    try {
      await signUpStudent({
        data: {
          fullName: form.fullName,
          phone: form.phone,
          password: form.password,
          sectionId: form.sectionId || null,
          grade: form.grade || null,
          unitId: form.unitId || null,
          avatarBase64: photo,
        },
      });
      const { error } = await supabase.auth.signInWithPassword({
        email: `${form.phone.trim()}@academy.com`,
        password: form.password,
      });
      if (error) {
        toast.success("Account created, you can log in now");
        setMode("login");
        return;
      }
      toast.success("Welcome! Your account has been created successfully");
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create account");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5 flex flex-col items-center px-4 py-10 font-['Outfit']"
      dir="ltr"
    >
      <Link to="/" className="flex items-center gap-3 mb-8 group">
        <div className="bg-primary p-2.5 rounded-2xl shadow-lg shadow-primary/25 group-hover:scale-105 transition-transform">
          <GraduationCap className="h-7 w-7 text-primary-foreground" />
        </div>
        <span className="text-2xl font-black">Blue Language Academy</span>
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        <Card className="border-border/60 shadow-xl">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto grid grid-cols-3 gap-1 bg-muted p-1 rounded-2xl w-full max-w-md mb-2">
              {(["login", "signup", "staff"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`py-2 px-1 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                    mode === m ? "bg-background shadow text-primary" : "text-muted-foreground"
                  }`}
                >
                  {m === "login" ? "Login" : m === "signup" ? "New Student" : "Admin / Teacher"}
                </button>
              ))}
            </div>
            <CardTitle className="text-2xl font-black">
              {mode === "login"
                ? "Welcome Back"
                : mode === "signup"
                  ? "Create Student Account"
                  : "Create Admin or Teacher Account"}
            </CardTitle>
            <CardDescription className="font-medium">
              {mode === "login"
                ? "Log in to follow your units and academic progress"
                : mode === "signup"
                  ? "Fill in your details to start your educational journey"
                  : "Only phone numbers pre-approved by the admin can create a staff account"}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {mode === "login" ? (
              <form onSubmit={onLogin} className="space-y-5">
                <Field icon={Phone} label="Phone Number">
                  <Input
                    inputMode="numeric"
                    autoComplete="tel"
                    placeholder="010XXXXXXXX"
                    value={form.phone}
                    onChange={(e) => set("phone", e.target.value)}
                    className="h-12"
                    required
                  />
                </Field>
                <Field icon={Lock} label="Password">
                  <Input
                    type="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={form.password}
                    onChange={(e) => set("password", e.target.value)}
                    className="h-12"
                    required
                  />
                </Field>
                <Button type="submit" className="w-full h-12 text-base font-black" disabled={loading}>
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogIn className="h-5 w-5 ml-2" />}
                  Login
                </Button>
              </form>
            ) : mode === "signup" ? (
              <form onSubmit={onSignup} className="space-y-5">
                <div className="flex flex-col items-center gap-3">
                  <div className="relative">
                    <div className="h-24 w-24 rounded-3xl overflow-hidden bg-muted border-2 border-dashed border-border flex items-center justify-center">
                      {photo ? (
                        <img src={photo} alt="Student Photo" className="h-full w-full object-cover" />
                      ) : (
                        <Camera className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>
                    {photo && (
                      <button
                        type="button"
                        onClick={() => setPhoto(null)}
                        className="absolute -top-2 -left-2 bg-destructive text-destructive-foreground rounded-full p-1"
                        aria-label="Delete Photo"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handlePhoto}
                  />
                  <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                    <Camera className="h-4 w-4 ml-2" />
                    {photo ? "Change Photo" : "Choose Photo from Phone"}
                  </Button>
                </div>

                <Field icon={User} label="Full Name">
                  <Input
                    value={form.fullName}
                    onChange={(e) => set("fullName", e.target.value)}
                    placeholder="Example: John Doe"
                    className="h-12"
                    required
                  />
                </Field>

                <Field icon={Phone} label="Phone Number">
                  <Input
                    inputMode="numeric"
                    value={form.phone}
                    onChange={(e) => set("phone", e.target.value)}
                    placeholder="010XXXXXXXX"
                    className="h-12"
                    required
                  />
                </Field>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field icon={Lock} label="Password">
                    <Input
                      type="password"
                      value={form.password}
                      onChange={(e) => set("password", e.target.value)}
                      className="h-12"
                      required
                    />
                  </Field>
                  <Field icon={Lock} label="Confirm Password">
                    <Input
                      type="password"
                      value={form.confirm}
                      onChange={(e) => set("confirm", e.target.value)}
                      className="h-12"
                      required
                    />
                  </Field>
                </div>

                <Field icon={Layers} label="Level / Study Department">
                  <Select
                    value={form.sectionId}
                    onValueChange={(v) => {
                      set("sectionId", v);
                      set("unitId", "");
                    }}
                  >
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Choose Level" />
                    </SelectTrigger>
                    <SelectContent>
                      {sections.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field icon={GraduationCap} label="Grade / Class (Optional)">
                    <Input
                      value={form.grade}
                      onChange={(e) => set("grade", e.target.value)}
                      placeholder="Example: 1/A"
                      className="h-12"
                    />
                  </Field>
                  <Field icon={BookOpen} label="Unit (Optional)">
                    <Select
                      value={form.unitId}
                      onValueChange={(v) => set("unitId", v)}
                      disabled={!form.sectionId || units.length === 0}
                    >
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder={units.length ? "Choose Unit" : "No units yet"} />
                      </SelectTrigger>
                      <SelectContent>
                        {units.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>

                <Button type="submit" className="w-full h-12 text-base font-black" disabled={loading}>
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <UserPlus className="h-5 w-5 ml-2" />}
                  Create Student Account
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  All new accounts here are created as student accounts only.
                </p>
              </form>
            )}

            {mode === "staff" && (
              <form onSubmit={onStaffSignup} className="space-y-5">
                <div className="flex flex-col items-center gap-3">
                  <div className="h-24 w-24 rounded-3xl overflow-hidden bg-muted border-2 border-dashed border-border flex items-center justify-center">
                    {photo ? (
                      <img src={photo} alt="Profile" className="h-full w-full object-cover" />
                    ) : (
                      <Camera className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={() => staffFileRef.current?.click()}>
                    <Camera className="h-4 w-4 ml-2" />
                    {photo ? "Change Photo" : "Choose Photo"}
                  </Button>
                  <input
                    ref={staffFileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhoto}
                  />
                </div>

                <Field icon={User} label="Full Name">
                  <Input
                    value={form.fullName}
                    onChange={(e) => set("fullName", e.target.value)}
                    className="h-12"
                    required
                  />
                </Field>

                <Field icon={Phone} label="Phone Number (must be approved by admin)">
                  <Input
                    inputMode="numeric"
                    value={form.phone}
                    onChange={(e) => set("phone", e.target.value)}
                    placeholder="010XXXXXXXX"
                    className="h-12"
                    required
                  />
                </Field>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field icon={Lock} label="Password">
                    <Input
                      type="password"
                      value={form.password}
                      onChange={(e) => set("password", e.target.value)}
                      className="h-12"
                      required
                    />
                  </Field>
                  <Field icon={Lock} label="Confirm Password">
                    <Input
                      type="password"
                      value={form.confirm}
                      onChange={(e) => set("confirm", e.target.value)}
                      className="h-12"
                      required
                    />
                  </Field>
                </div>

                <Button type="submit" className="w-full h-12 text-base font-black" disabled={loading}>
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <UserPlus className="h-5 w-5 ml-2" />}
                  Create Admin / Teacher Account
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  Your role (admin or teacher) is decided by the admin who approved your number.
                </p>
              </form>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

function Field({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label className="font-bold flex items-center gap-2 text-sm">
        <Icon className="h-4 w-4 text-primary" />
        {label}
      </Label>
      {children}
    </div>
  );
}
