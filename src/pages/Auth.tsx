import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { z } from "zod";
import Navigation from "@/components/Navigation";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Email non valida").max(255, "Email troppo lunga"),
  password: z.string().min(1, "Password richiesta"),
});

const signupSchema = z.object({
  email: z.string().email("Email non valida").max(255, "Email troppo lunga"),
  password: z.string().min(8, "La password deve contenere almeno 8 caratteri"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Le password non coincidono",
  path: ["confirmPassword"],
});

const professionalSignupSchema = z.object({
  email: z.string().email("Email non valida").max(255, "Email troppo lunga"),
  password: z.string().min(8, "La password deve contenere almeno 8 caratteri"),
  confirmPassword: z.string(),
  specialization: z.string().min(3, "La specializzazione deve essere di almeno 3 caratteri").max(200),
  licenseNumber: z.string().optional(),
  yearsOfExperience: z.number().min(0, "Gli anni di esperienza devono essere >= 0").max(70).optional(),
  bio: z.string().max(1000, "La biografia deve essere massimo 1000 caratteri").optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Le password non coincidono",
  path: ["confirmPassword"],
});

const resetEmailSchema = z.object({
  email: z.string().email("Email non valida").max(255, "Email troppo lunga"),
});

const newPasswordSchema = z.object({
  password: z.string().min(8, "La password deve contenere almeno 8 caratteri"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Le password non coincidono",
  path: ["confirmPassword"],
});

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(searchParams.get("mode") === "signup" ? "signup" : "login");
  
  // Password visibility states
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupConfirmPassword, setShowSignupConfirmPassword] = useState(false);
  const [showProfessionalPassword, setShowProfessionalPassword] = useState(false);
  const [showProfessionalConfirmPassword, setShowProfessionalConfirmPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showResetConfirmPassword, setShowResetConfirmPassword] = useState(false);
  
  // Password recovery states
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [newPasswordForm, setNewPasswordForm] = useState({ password: "", confirmPassword: "" });
  
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [signupForm, setSignupForm] = useState({ email: "", password: "", confirmPassword: "" });
  const [professionalForm, setProfessionalForm] = useState({ 
    email: "", 
    password: "", 
    confirmPassword: "",
    specialization: "",
    licenseNumber: "",
    yearsOfExperience: undefined as number | undefined,
    bio: ""
  });

  useEffect(() => {
    // Check if user is already logged in
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/dashboard");
      }
    };
    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate("/dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    const mode = searchParams.get("mode");
    if (mode === "reset") {
      setIsResetMode(true);
    } else if (mode === "signup" || mode === "login" || mode === "professional") {
      setActiveTab(mode);
    }
  }, [searchParams]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSearchParams({ mode: value });
    setShowForgotPassword(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const validated = resetEmailSchema.parse({ email: resetEmail });
      setLoading(true);

      const { error } = await supabase.auth.resetPasswordForEmail(validated.email.trim(), {
        redirectTo: `${window.location.origin}/auth?mode=reset`,
      });

      if (error) {
        toast({
          title: "Errore",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Email inviata!",
          description: "Controlla la tua casella di posta per il link di recupero",
        });
        setResetEmail("");
        setShowForgotPassword(false);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Errore di validazione",
          description: error.errors[0].message,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const validated = newPasswordSchema.parse(newPasswordForm);
      setLoading(true);

      const { error } = await supabase.auth.updateUser({
        password: validated.password,
      });

      if (error) {
        toast({
          title: "Errore",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Password aggiornata!",
          description: "La tua password è stata cambiata con successo",
        });
        setNewPasswordForm({ password: "", confirmPassword: "" });
        setIsResetMode(false);
        setSearchParams({ mode: "login" });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Errore di validazione",
          description: error.errors[0].message,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Password input component with toggle
  const PasswordInput = ({ 
    id, 
    value, 
    onChange, 
    show, 
    onToggle, 
    placeholder = "••••••••",
    disabled = false 
  }: {
    id: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    show: boolean;
    onToggle: () => void;
    placeholder?: string;
    disabled?: boolean;
  }) => (
    <div className="relative">
      <Input
        id={id}
        type={show ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required
        disabled={disabled}
        className="pr-10"
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        tabIndex={-1}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const validated = loginSchema.parse(loginForm);
      setLoading(true);

      const { error } = await supabase.auth.signInWithPassword({
        email: validated.email.trim(),
        password: validated.password,
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          toast({
            title: "Errore",
            description: "Email o password non corrette",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Errore",
            description: error.message,
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Accesso effettuato!",
          description: "Benvenuto!",
        });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Errore di validazione",
          description: error.errors[0].message,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const validated = signupSchema.parse(signupForm);
      setLoading(true);

      const { error } = await supabase.auth.signUp({
        email: validated.email.trim(),
        password: validated.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (error) {
        if (error.message.includes("already registered")) {
          toast({
            title: "Errore",
            description: "Questo indirizzo email è già registrato",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Errore",
            description: error.message,
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Registrazione completata!",
          description: "Controlla la tua email per confermare l'account",
        });
        setSignupForm({ email: "", password: "", confirmPassword: "" });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Errore di validazione",
          description: error.errors[0].message,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleProfessionalSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const validated = professionalSignupSchema.parse(professionalForm);
      setLoading(true);

      // First, create the user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: validated.email.trim(),
        password: validated.password,
        options: {
          emailRedirectTo: `${window.location.origin}/professional-verification`,
        },
      });

      if (authError) {
        if (authError.message.includes("already registered")) {
          toast({
            title: "Errore",
            description: "Questo indirizzo email è già registrato",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Errore",
            description: authError.message,
            variant: "destructive",
          });
        }
        setLoading(false);
        return;
      }

      if (!authData.user) {
        toast({
          title: "Errore",
          description: "Errore durante la registrazione",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Then create the professional profile
      const { error: profileError } = await supabase
        .from('professional_profiles')
        .insert({
          user_id: authData.user.id,
          specialization: validated.specialization,
          license_number: validated.licenseNumber || null,
          years_of_experience: validated.yearsOfExperience || null,
          bio: validated.bio || null,
          status: 'pending'
        });

      if (profileError) {
        console.error('Error creating professional profile:', profileError);
        toast({
          title: "Errore",
          description: "Errore nella creazione del profilo professionale",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Registrazione completata!",
          description: "Controlla la tua email e attendi l'approvazione del tuo profilo",
        });
        setProfessionalForm({ 
          email: "", 
          password: "", 
          confirmPassword: "",
          specialization: "",
          licenseNumber: "",
          yearsOfExperience: undefined,
          bio: ""
        });
        navigate('/professional-verification');
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Errore di validazione",
          description: error.errors[0].message,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navigation />
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-dream-space to-background p-4" style={{ paddingTop: 'calc(6rem + var(--safe-area-inset-top, 0px))' }}>
      <Card className="w-full max-w-md bg-card/80 backdrop-blur-sm border-border shadow-xl">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
              <span className="text-2xl">🌙</span>
            </div>
          </div>
          <CardTitle className="text-2xl text-center text-foreground">
            Dream's Alchemist
          </CardTitle>
          <CardDescription className="text-center text-muted-foreground">
            Accedi o registrati per iniziare
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="login">Accedi</TabsTrigger>
              <TabsTrigger value="signup">Registrati</TabsTrigger>
              <TabsTrigger value="professional">Professionista</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              {showForgotPassword ? (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(false)}
                    className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Torna al login
                  </button>
                  <div className="space-y-2">
                    <Label htmlFor="reset-email">Email</Label>
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="tua@email.com"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Inserisci la tua email per ricevere un link di recupero password.
                  </p>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Invio in corso..." : "Invia link di recupero"}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="tua@email.com"
                      value={loginForm.email}
                      onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                      required
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <PasswordInput
                      id="login-password"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                      show={showLoginPassword}
                      onToggle={() => setShowLoginPassword(!showLoginPassword)}
                      disabled={loading}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-sm text-primary hover:underline"
                  >
                    Password dimenticata?
                  </button>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Accesso in corso..." : "Accedi"}
                  </Button>
                </form>
              )}
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="tua@email.com"
                    value={signupForm.email}
                    onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <PasswordInput
                    id="signup-password"
                    value={signupForm.password}
                    onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                    show={showSignupPassword}
                    onToggle={() => setShowSignupPassword(!showSignupPassword)}
                    placeholder="Minimo 8 caratteri"
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-confirm">Conferma Password</Label>
                  <PasswordInput
                    id="signup-confirm"
                    value={signupForm.confirmPassword}
                    onChange={(e) => setSignupForm({ ...signupForm, confirmPassword: e.target.value })}
                    show={showSignupConfirmPassword}
                    onToggle={() => setShowSignupConfirmPassword(!showSignupConfirmPassword)}
                    placeholder="Ripeti la password"
                    disabled={loading}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Registrazione in corso..." : "Registrati"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="professional">
              <form onSubmit={handleProfessionalSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="professional-email">Email</Label>
                  <Input
                    id="professional-email"
                    type="email"
                    placeholder="tua@email.com"
                    value={professionalForm.email}
                    onChange={(e) => setProfessionalForm({ ...professionalForm, email: e.target.value })}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="professional-password">Password</Label>
                  <PasswordInput
                    id="professional-password"
                    value={professionalForm.password}
                    onChange={(e) => setProfessionalForm({ ...professionalForm, password: e.target.value })}
                    show={showProfessionalPassword}
                    onToggle={() => setShowProfessionalPassword(!showProfessionalPassword)}
                    placeholder="Minimo 8 caratteri"
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="professional-confirm">Conferma Password</Label>
                  <PasswordInput
                    id="professional-confirm"
                    value={professionalForm.confirmPassword}
                    onChange={(e) => setProfessionalForm({ ...professionalForm, confirmPassword: e.target.value })}
                    show={showProfessionalConfirmPassword}
                    onToggle={() => setShowProfessionalConfirmPassword(!showProfessionalConfirmPassword)}
                    placeholder="Ripeti la password"
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="specialization">Specializzazione *</Label>
                  <Input
                    id="specialization"
                    type="text"
                    placeholder="Es: Psicologo, Psicoterapeuta, Counselor..."
                    value={professionalForm.specialization}
                    onChange={(e) => setProfessionalForm({ ...professionalForm, specialization: e.target.value })}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="license-number">Numero Albo (opzionale)</Label>
                  <Input
                    id="license-number"
                    type="text"
                    placeholder="Il tuo numero di iscrizione all'albo"
                    value={professionalForm.licenseNumber}
                    onChange={(e) => setProfessionalForm({ ...professionalForm, licenseNumber: e.target.value })}
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="years-experience">Anni di Esperienza (opzionale)</Label>
                  <Input
                    id="years-experience"
                    type="number"
                    min="0"
                    max="70"
                    placeholder="Anni di esperienza professionale"
                    value={professionalForm.yearsOfExperience || ''}
                    onChange={(e) => setProfessionalForm({ 
                      ...professionalForm, 
                      yearsOfExperience: e.target.value ? parseInt(e.target.value) : undefined 
                    })}
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bio">Biografia (opzionale)</Label>
                  <Textarea
                    id="bio"
                    placeholder="Descrivi brevemente la tua esperienza e competenze..."
                    value={professionalForm.bio}
                    onChange={(e) => setProfessionalForm({ ...professionalForm, bio: e.target.value })}
                    disabled={loading}
                    className="min-h-[100px]"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Registrazione in corso..." : "Registrati come Professionista"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          {/* Reset Password Form (shown when user clicks reset link from email) */}
          {isResetMode && (
            <div className="mt-6 pt-6 border-t border-border">
              <form onSubmit={handleResetPassword} className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">Imposta nuova password</h3>
                <div className="space-y-2">
                  <Label htmlFor="new-password">Nuova Password</Label>
                  <PasswordInput
                    id="new-password"
                    value={newPasswordForm.password}
                    onChange={(e) => setNewPasswordForm({ ...newPasswordForm, password: e.target.value })}
                    show={showResetPassword}
                    onToggle={() => setShowResetPassword(!showResetPassword)}
                    placeholder="Minimo 8 caratteri"
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-new-password">Conferma Nuova Password</Label>
                  <PasswordInput
                    id="confirm-new-password"
                    value={newPasswordForm.confirmPassword}
                    onChange={(e) => setNewPasswordForm({ ...newPasswordForm, confirmPassword: e.target.value })}
                    show={showResetConfirmPassword}
                    onToggle={() => setShowResetConfirmPassword(!showResetConfirmPassword)}
                    placeholder="Ripeti la password"
                    disabled={loading}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Aggiornamento in corso..." : "Aggiorna Password"}
                </Button>
              </form>
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </>
  );
};

export default Auth;
