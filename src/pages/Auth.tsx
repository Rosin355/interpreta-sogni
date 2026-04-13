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
import usePasswordReset from "@/hooks/usePasswordReset";
const Auth = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(searchParams.get("mode") === "signup" ? "signup" : "login");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupConfirmPassword, setShowSignupConfirmPassword] = useState(false);
  const [showProfessionalPassword, setShowProfessionalPassword] = useState(false);
  const [showProfessionalConfirmPassword, setShowProfessionalConfirmPassword] = useState(false);
  const passwordResetProps = usePasswordReset(setLoading, navigate);
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [signupForm, setSignupForm] = useState({ email: "", password: "", confirmPassword: "" });
  const [professionalForm, setProfessionalForm] = useState({ email: "", password: "", confirmPassword: "", specialization: "", licenseNumber: "", yearsOfExperience: undefined as number | undefined, bio: "" });
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) navigate("/dashboard");
    };
    checkSession();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => { if (session) navigate("/dashboard"); });
    return () => subscription.unsubscribe();
  }, [navigate]);
  useEffect(() => {
    const mode = searchParams.get("mode");
    if (mode === "reset") passwordResetProps.setIsResetMode(true);
    else if (mode === "signup" || mode === "login" || mode === "professional") setActiveTab(mode);
  }, [searchParams, passwordResetProps.setIsResetMode]);
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSearchParams({ mode: value });
    passwordResetProps.setShowForgotPassword(false);
  };
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const loginSchema = z.object({ email: z.string().email("Email non valida").max(255, "Email troppo lunga"), password: z.string().min(1, "Password richiesta") });
      const validated = loginSchema.parse(loginForm);
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({ email: validated.email.trim(), password: validated.password });
      if (error) {
        if (error.message.includes("Invalid login credentials")) toast({ title: "Errore", description: "Email o password non corrette", variant: "destructive" });
        else toast({ title: "Errore", description: error.message, variant: "destructive" });
      } else toast({ title: "Accesso effettuato!", description: "Benvenuto!" });
    } catch (error) {
      if (error instanceof z.ZodError) toast({ title: "Errore di validazione", description: error.errors[0].message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const signupSchema = z.object({ email: z.string().email("Email non valida").max(255, "Email troppo lunga"), password: z.string().min(8, "La password deve contenere almeno 8 caratteri"), confirmPassword: z.string() }).refine((data) => data.password === data.confirmPassword, { message: "Le password non coincidono", path: ["confirmPassword"] });
      const validated = signupSchema.parse(signupForm);
      setLoading(true);
      const { error } = await supabase.auth.signUp({ email: validated.email.trim(), password: validated.password, options: { emailRedirectTo: `${import.meta.env.VITE_SITE_URL || window.location.origin}/` } });
      if (error) {
        if (error.message.includes("already registered")) toast({ title: "Errore", description: "Questo indirizzo email è già registrato", variant: "destructive" });
        else toast({ title: "Errore", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Registrazione completata!", description: "Controlla la tua email per confermare l'account" });
        setSignupForm({ email: "", password: "", confirmPassword: "" });
      }
    } catch (error) {
      if (error instanceof z.ZodError) toast({ title: "Errore di validazione", description: error.errors[0].message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };
  const handleProfessionalSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const professionalSignupSchema = z.object({ email: z.string().email("Email non valida").max(255, "Email troppo lunga"), password: z.string().min(8, "La password deve contenere almeno 8 caratteri"), confirmPassword: z.string(), specialization: z.string().min(3, "La specializzazione deve essere di almeno 3 caratteri").max(200), licenseNumber: z.string().optional(), yearsOfExperience: z.number().min(0, "Gli anni di esperienza devono essere >= 0").max(70).optional(), bio: z.string().max(1000, "La biografia deve essere massimo 1000 caratteri").optional() }).refine((data) => data.password === data.confirmPassword, { message: "Le password non coincidono", path: ["confirmPassword"] });
      const validated = professionalSignupSchema.parse(professionalForm);
      setLoading(true);
      const { data: authData, error: authError } = await supabase.auth.signUp({ email: validated.email.trim(), password: validated.password, options: { emailRedirectTo: `${import.meta.env.VITE_SITE_URL || window.location.origin}/professional-verification` } });
      if (authError) {
        if (authError.message.includes("already registered")) toast({ title: "Errore", description: "Questo indirizzo email è già registrato", variant: "destructive" });
        else toast({ title: "Errore", description: authError.message, variant: "destructive" });
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
        toast({ title: "Registrazione completata!", description: "Controlla la tua email e attendi l'approvazione del tuo profilo" });
        setProfessionalForm({ email: "", password: "", confirmPassword: "", specialization: "", licenseNumber: "", yearsOfExperience: undefined, bio: "" });
        navigate("/professional-verification");
      }
    } catch (error) {
      if (error instanceof z.ZodError) toast({ title: "Errore di validazione", description: error.errors[0].message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };
  return (
    <>
      <Navigation />
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-dream-space to-background p-4" style={{ paddingTop: "calc(7rem + var(--safe-area-inset-top, 0px))" }}>
        <Card className="w-full max-w-md bg-card/80 backdrop-blur-sm border-border shadow-xl">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-center mb-4"><img src="/dreamalchemist_logo.png" alt="Dream Alchemist" className="w-12 h-12 rounded-lg object-contain" /></div>
            <CardTitle className="text-2xl text-center text-foreground">Dream Alchemist</CardTitle>
            <CardDescription className="text-center text-muted-foreground">Accedi o registrati per iniziare</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="login">Accedi</TabsTrigger>
                <TabsTrigger value="signup">Registrati</TabsTrigger>
                <TabsTrigger value="professional">Professionista</TabsTrigger>
              </TabsList>
              <TabsContent value="login"><LoginForm loading={loading} loginForm={loginForm} setLoginForm={setLoginForm} handleLogin={handleLogin} passwordResetProps={passwordResetProps} showLoginPassword={showLoginPassword} setShowLoginPassword={setShowLoginPassword} /></TabsContent>
              <TabsContent value="signup"><SignupForm loading={loading} signupForm={signupForm} setSignupForm={setSignupForm} handleSignup={handleSignup} showSignupPassword={showSignupPassword} setShowSignupPassword={setShowSignupPassword} showSignupConfirmPassword={showSignupConfirmPassword} setShowSignupConfirmPassword={setShowSignupConfirmPassword} /></TabsContent>
              <TabsContent value="professional"><ProfessionalSignupForm loading={loading} professionalForm={professionalForm} setProfessionalForm={setProfessionalForm} handleProfessionalSignup={handleProfessionalSignup} showProfessionalPassword={showProfessionalPassword} setShowProfessionalPassword={setShowProfessionalPassword} showProfessionalConfirmPassword={showProfessionalConfirmPassword} setShowProfessionalConfirmPassword={setShowProfessionalConfirmPassword} /></TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </>
  );
};
export default Auth;
