import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { z } from "zod";
import Navigation from "@/components/Navigation";
import LoginForm from "@/components/auth/LoginForm";
import SignupForm from "@/components/auth/SignupForm";
import ProfessionalSignupForm from "@/components/auth/ProfessionalSignupForm";
import ResendConfirmationForm from "@/components/auth/ResendConfirmationForm";
import usePasswordReset from "@/hooks/usePasswordReset";

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const initialMode = searchParams.get("mode");
  const [activeTab, setActiveTab] = useState(
    initialMode === "signup" || initialMode === "professional" ? initialMode : "login"
  );
  const [resendMode, setResendMode] = useState(initialMode === "resend-confirmation");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupConfirmPassword, setShowSignupConfirmPassword] = useState(false);
  const [showProfessionalPassword, setShowProfessionalPassword] = useState(false);
  const [showProfessionalConfirmPassword, setShowProfessionalConfirmPassword] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [professionalSuccess, setProfessionalSuccess] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");
  const passwordResetProps = usePasswordReset(setLoading, navigate);
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [signupForm, setSignupForm] = useState({ email: "", password: "", confirmPassword: "" });
  const [professionalForm, setProfessionalForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    specialization: "",
    licenseNumber: "",
    yearsOfExperience: undefined as number | undefined,
    bio: "",
  });

  // Salva attribuzione (from/dream) in localStorage non appena la pagina si apre con questi params,
  // così sopravvive al redirect di conferma email.
  useEffect(() => {
    const from = searchParams.get("from");
    const dream = searchParams.get("dream");
    if (from) {
      try {
        localStorage.setItem(
          "pending_attribution",
          JSON.stringify({
            source: from,
            dream_id: dream || null,
            referrer: document.referrer || null,
            saved_at: Date.now(),
          })
        );
      } catch {
        // ignora errori storage (modalità privata ecc.)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Inserisce l'attribuzione al primo SIGNED_IN dopo registrazione/conferma.
  // UNIQUE(user_id) garantisce idempotenza: i login successivi falliscono silenziosamente.
  const tryRecordAttribution = async (userId: string) => {
    try {
      const raw = localStorage.getItem("pending_attribution");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      await supabase.from("signup_attributions").insert({
        user_id: userId,
        source: parsed.source || "direct",
        dream_id: parsed.dream_id || null,
        referrer: parsed.referrer || null,
      });
      localStorage.removeItem("pending_attribution");
    } catch (err) {
      // best-effort: non bloccare mai il login
      console.warn("[attribution] skip", err);
    }
  };

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await tryRecordAttribution(session.user.id);
        navigate("/dashboard");
      }
    };
    checkSession();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        if (event === "SIGNED_IN") {
          await tryRecordAttribution(session.user.id);
        }
        navigate("/dashboard");
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  // Mostra conferma email avvenuta
  useEffect(() => {
    if (searchParams.get("confirmed") === "1") {
      toast({ title: "Email confermata!", description: "Ora puoi accedere." });
      // Pulisci il param
      const next = new URLSearchParams(searchParams);
      next.delete("confirmed");
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const mode = searchParams.get("mode");
    if (mode === "reset") {
      passwordResetProps.setIsResetMode(true);
      setResendMode(false);
    } else if (mode === "resend-confirmation") {
      setResendMode(true);
    } else if (mode === "signup" || mode === "login" || mode === "professional") {
      setActiveTab(mode);
      setResendMode(false);
    }
  }, [searchParams, passwordResetProps.setIsResetMode]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSearchParams({ mode: value });
    passwordResetProps.setShowForgotPassword(false);
    setResendMode(false);
  };

  const openResendMode = () => {
    setResendMode(true);
    setPendingEmail(loginForm.email || signupForm.email || professionalForm.email || pendingEmail);
    setSearchParams({ mode: "resend-confirmation" });
  };

  const closeResendMode = () => {
    setResendMode(false);
    setSearchParams({ mode: "login" });
    setActiveTab("login");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const loginSchema = z.object({
        email: z.string().email("Email non valida").max(255, "Email troppo lunga"),
        password: z.string().min(1, "Password richiesta"),
      });
      const validated = loginSchema.parse(loginForm);
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({
        email: validated.email.trim(),
        password: validated.password,
      });
      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          toast({ title: "Errore", description: "Email o password non corrette", variant: "destructive" });
        } else if (error.message.toLowerCase().includes("not confirmed") || error.message.toLowerCase().includes("email not confirmed")) {
          toast({
            title: "Email non confermata",
            description: "Conferma l'email per accedere. Puoi richiedere un nuovo link.",
            variant: "destructive",
          });
          setPendingEmail(validated.email.trim());
          openResendMode();
        } else {
          toast({ title: "Errore", description: error.message, variant: "destructive" });
        }
      } else {
        toast({ title: "Accesso effettuato!", description: "Benvenuto!" });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({ title: "Errore di validazione", description: error.errors[0].message, variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const signupSchema = z
        .object({
          email: z.string().email("Email non valida").max(255, "Email troppo lunga"),
          password: z.string().min(8, "La password deve contenere almeno 8 caratteri"),
          confirmPassword: z.string(),
        })
        .refine((data) => data.password === data.confirmPassword, {
          message: "Le password non coincidono",
          path: ["confirmPassword"],
        });
      const validated = signupSchema.parse(signupForm);
      setLoading(true);
      const baseUrl = import.meta.env.VITE_SITE_URL || window.location.origin;
      const { error } = await supabase.auth.signUp({
        email: validated.email.trim(),
        password: validated.password,
        options: { emailRedirectTo: `${baseUrl}/auth?confirmed=1` },
      });
      if (error) {
        if (error.message.includes("already registered")) {
          toast({ title: "Errore", description: "Questo indirizzo email è già registrato", variant: "destructive" });
        } else {
          toast({ title: "Errore", description: error.message, variant: "destructive" });
        }
      } else {
        toast({ title: "Registrazione completata!", description: "Controlla la tua email per confermare l'account" });
        setPendingEmail(validated.email.trim());
        // Pulisci solo le password, mantieni email per resend
        setSignupForm({ email: validated.email.trim(), password: "", confirmPassword: "" });
        setSignupSuccess(true);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({ title: "Errore di validazione", description: error.errors[0].message, variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleProfessionalSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const professionalSignupSchema = z
        .object({
          email: z.string().email("Email non valida").max(255, "Email troppo lunga"),
          password: z.string().min(8, "La password deve contenere almeno 8 caratteri"),
          confirmPassword: z.string(),
          specialization: z.string().min(3, "La specializzazione deve essere di almeno 3 caratteri").max(200),
          licenseNumber: z.string().optional(),
          yearsOfExperience: z.number().min(0, "Gli anni di esperienza devono essere >= 0").max(70).optional(),
          bio: z.string().max(1000, "La biografia deve essere massimo 1000 caratteri").optional(),
        })
        .refine((data) => data.password === data.confirmPassword, {
          message: "Le password non coincidono",
          path: ["confirmPassword"],
        });
      const validated = professionalSignupSchema.parse(professionalForm);
      setLoading(true);
      const baseUrl = import.meta.env.VITE_SITE_URL || window.location.origin;
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: validated.email.trim(),
        password: validated.password,
        options: { emailRedirectTo: `${baseUrl}/professional-verification` },
      });
      if (authError) {
        if (authError.message.includes("already registered")) {
          toast({ title: "Errore", description: "Questo indirizzo email è già registrato", variant: "destructive" });
        } else {
          toast({ title: "Errore", description: authError.message, variant: "destructive" });
        }
        setLoading(false);
        return;
      }
      if (!authData.user) {
        toast({ title: "Errore", description: "Errore durante la registrazione", variant: "destructive" });
        setLoading(false);
        return;
      }
      const { error: profileError } = await supabase.from("professional_profiles").insert({
        user_id: authData.user.id,
        specialization: validated.specialization,
        license_number: validated.licenseNumber || null,
        years_of_experience: validated.yearsOfExperience || null,
        bio: validated.bio || null,
        status: "pending",
      });
      if (profileError) {
        console.error("Error creating professional profile:", profileError);
        toast({ title: "Errore", description: "Errore nella creazione del profilo professionale", variant: "destructive" });
      } else {
        toast({ title: "Registrazione completata!", description: "Controlla la tua email per confermare l'account" });
        setPendingEmail(validated.email.trim());
        setProfessionalForm({
          ...professionalForm,
          email: validated.email.trim(),
          password: "",
          confirmPassword: "",
        });
        setProfessionalSuccess(true);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({ title: "Errore di validazione", description: error.errors[0].message, variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navigation />
      <div
        className="min-h-[100dvh] flex items-center justify-center bg-gradient-to-br from-background via-dream-space to-background px-4 py-6 sm:p-4"
        style={{ paddingTop: "calc(7rem + var(--safe-area-inset-top, 0px))" }}
      >
        <Card className="w-full max-w-md bg-card/80 backdrop-blur-sm border-border shadow-xl">
          <CardHeader className="space-y-1 px-4 sm:px-6">
            <div className="flex items-center justify-center mb-4">
              <img
                src="/dreamalchemist_logo.png"
                alt="Dream Alchemist"
                className="w-12 h-12 rounded-lg object-contain"
              />
            </div>
            <CardTitle className="text-2xl text-center text-foreground">Dream Alchemist</CardTitle>
            <CardDescription className="text-center text-muted-foreground">
              {resendMode ? "Reinvia il link di conferma" : "Accedi o registrati per iniziare"}
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            {resendMode ? (
              <ResendConfirmationForm initialEmail={pendingEmail} onBack={closeResendMode} />
            ) : (
              <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-6">
                  <TabsTrigger value="login" className="text-xs sm:text-sm">
                    Accedi
                  </TabsTrigger>
                  <TabsTrigger value="signup" className="text-xs sm:text-sm">
                    Registrati
                  </TabsTrigger>
                  <TabsTrigger value="professional" className="text-xs sm:text-sm">
                    <span className="sm:hidden">Pro</span>
                    <span className="hidden sm:inline">Professionista</span>
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="login">
                  <LoginForm
                    loading={loading}
                    loginForm={loginForm}
                    setLoginForm={setLoginForm}
                    handleLogin={handleLogin}
                    passwordResetProps={passwordResetProps}
                    showLoginPassword={showLoginPassword}
                    setShowLoginPassword={setShowLoginPassword}
                    onResendConfirmation={openResendMode}
                  />
                </TabsContent>
                <TabsContent value="signup">
                  <SignupForm
                    loading={loading}
                    signupForm={signupForm}
                    setSignupForm={setSignupForm}
                    handleSignup={handleSignup}
                    showSignupPassword={showSignupPassword}
                    setShowSignupPassword={setShowSignupPassword}
                    showSignupConfirmPassword={showSignupConfirmPassword}
                    setShowSignupConfirmPassword={setShowSignupConfirmPassword}
                    signupSuccess={signupSuccess}
                    onGoToLogin={() => {
                      setSignupSuccess(false);
                      handleTabChange("login");
                    }}
                    onResendConfirmation={openResendMode}
                  />
                </TabsContent>
                <TabsContent value="professional">
                  <ProfessionalSignupForm
                    loading={loading}
                    professionalForm={professionalForm}
                    setProfessionalForm={setProfessionalForm}
                    handleProfessionalSignup={handleProfessionalSignup}
                    showProfessionalPassword={showProfessionalPassword}
                    setShowProfessionalPassword={setShowProfessionalPassword}
                    showProfessionalConfirmPassword={showProfessionalConfirmPassword}
                    setShowProfessionalConfirmPassword={setShowProfessionalConfirmPassword}
                    signupSuccess={professionalSuccess}
                    onGoToLogin={() => {
                      setProfessionalSuccess(false);
                      handleTabChange("login");
                    }}
                    onResendConfirmation={openResendMode}
                  />
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default Auth;
