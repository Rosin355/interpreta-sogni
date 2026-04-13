import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { NavigateFunction } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const resetEmailSchema = z.object({
  email: z.string().email("Email non valida").max(255, "Email troppo lunga"),
});

const newPasswordSchema = z
  .object({
    password: z.string().min(8, "La password deve contenere almeno 8 caratteri"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Le password non coincidono",
    path: ["confirmPassword"],
  });

const usePasswordReset = (setLoading: (value: boolean) => void, navigate?: NavigateFunction) => {
  void navigate;

  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [newPasswordForm, setNewPasswordForm] = useState({ password: "", confirmPassword: "" });
  const [otpStep, setOtpStep] = useState<1 | 2 | 3>(1);
  const [otpCode, setOtpCode] = useState("");
  const [otpTimer, setOtpTimer] = useState(0);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);

  useEffect(() => {
    if (otpTimer <= 0) return;
    const interval = setInterval(() => setOtpTimer((t) => t - 1), 1000);
    return () => clearInterval(interval);
  }, [otpTimer]);

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const invokeEdgeFunction = async (functionName: string, body: Record<string, unknown>) => {
    return supabase.functions.invoke(functionName, { body });
  };

  const extractFunctionErrorPayload = async (
    error: unknown
  ): Promise<{ code?: string; message?: string }> => {
    if (!error || typeof error !== "object") return {};

    const maybeError = error as { message?: string; context?: Response };
    const fallbackMessage = maybeError.message;

    if (!maybeError.context) {
      return { message: fallbackMessage };
    }

    try {
      const payload = await maybeError.context.clone().json();
      return {
        code: typeof payload?.code === "string" ? payload.code : undefined,
        message:
          typeof payload?.message === "string"
            ? payload.message
            : typeof payload?.error === "string"
              ? payload.error
              : fallbackMessage,
      };
    } catch {
      return { message: fallbackMessage };
    }
  };

  const mapResetPasswordErrorMessage = (code?: string, backendMessage?: string): string => {
    switch (code) {
      case "PASSWORD_REUSED":
        return "La nuova password non può essere uguale alla precedente.";
      case "TOKEN_INVALID_OR_EXPIRED":
        return "Codice non valido o scaduto. Richiedi un nuovo codice.";
      case "TOKEN_ATTEMPTS_EXCEEDED":
        return "Troppi tentativi. Richiedi un nuovo codice.";
      case "TOKEN_MISMATCH":
      case "VALIDATION_ERROR":
      case "PASSWORD_POLICY_VIOLATION":
        return backendMessage || "Dati non validi. Controlla i campi e riprova.";
      default:
        return "Impossibile aggiornare la password. Riprova più tardi.";
    }
  };

  const isSuccessfulFunctionResponse = (data: unknown): boolean => {
    return Boolean(
      data &&
        typeof data === "object" &&
        "success" in data &&
        (data as { success?: unknown }).success === true
    );
  };

  const handleForgotPassword = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const validated = resetEmailSchema.parse({ email: resetEmail });
      setOtpSending(true);
      const { error } = await invokeEdgeFunction("request-password-reset", {
        email: validated.email.trim(),
      });
      if (error) {
        toast({ title: "Errore", description: error.message || "Errore nell'invio.", variant: "destructive" });
      } else {
        toast({ title: "Codice inviato!", description: "Se l'email è registrata, riceverai un codice a 6 cifre." });
        setOtpStep(2);
        setOtpTimer(900);
        setOtpCode("");
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({ title: "Errore", description: error.errors[0].message, variant: "destructive" });
      }
    } finally {
      setOtpSending(false);
    }
  };

  const handleResendOTP = async () => {
    setOtpSending(true);
    try {
      await invokeEdgeFunction("request-password-reset", {
        email: resetEmail.trim(),
      });
      toast({ title: "Codice reinviato!", description: "Controlla la tua casella di posta." });
      setOtpTimer(900);
      setOtpCode("");
    } catch {
      toast({ title: "Errore", description: "Impossibile reinviare il codice.", variant: "destructive" });
    } finally {
      setOtpSending(false);
    }
  };

  const handleVerifyOTPCode = async () => {
    if (otpCode.length !== 6 || otpTimer <= 0) return;

    try {
      setOtpVerifying(true);
      const { data, error } = await invokeEdgeFunction("verify-reset-token", {
        email: resetEmail.trim(),
        code: otpCode,
        mode: "verify",
      });

      if (error) {
        const parsedError = await extractFunctionErrorPayload(error);
        const message = mapResetPasswordErrorMessage(parsedError.code, parsedError.message);
        toast({ title: "Errore", description: message, variant: "destructive" });
        return;
      }

      if (!isSuccessfulFunctionResponse(data)) {
        toast({
          title: "Errore",
          description: "Verifica del codice non riuscita. Riprova.",
          variant: "destructive",
        });
        return;
      }

      setOtpStep(3);
    } finally {
      setOtpVerifying(false);
    }
  };

  const handleVerifyOTPAndReset = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const validated = newPasswordSchema.parse(newPasswordForm);
      setLoading(true);
      const { data, error } = await invokeEdgeFunction("verify-reset-token", {
        email: resetEmail.trim(),
        code: otpCode,
        newPassword: validated.password,
        mode: "reset",
      });
      if (error) {
        const parsedError = await extractFunctionErrorPayload(error);
        const message = mapResetPasswordErrorMessage(parsedError.code, parsedError.message);
        if (
          parsedError.code === "TOKEN_INVALID_OR_EXPIRED" ||
          parsedError.code === "TOKEN_ATTEMPTS_EXCEEDED" ||
          parsedError.code === "TOKEN_MISMATCH"
        ) {
          setOtpStep(2);
        }
        toast({ title: "Errore", description: message, variant: "destructive" });
      } else {
        if (!isSuccessfulFunctionResponse(data)) {
          toast({
            title: "Errore",
            description: "Impossibile aggiornare la password. Riprova più tardi.",
            variant: "destructive",
          });
          return;
        }
        toast({ title: "Password aggiornata!", description: "Ora puoi accedere con la nuova password." });
        setShowForgotPassword(false);
        setOtpStep(1);
        setOtpCode("");
        setResetEmail("");
        setNewPasswordForm({ password: "", confirmPassword: "" });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({ title: "Errore", description: error.errors[0].message, variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  };

  return {
    showForgotPassword,
    setShowForgotPassword,
    isResetMode,
    setIsResetMode,
    resetEmail,
    setResetEmail,
    newPasswordForm,
    setNewPasswordForm,
    otpStep,
    setOtpStep,
    otpCode,
    setOtpCode,
    otpTimer,
    otpSending,
    otpVerifying,
    handleForgotPassword,
    handleResendOTP,
    handleVerifyOTPCode,
    handleVerifyOTPAndReset,
    formatTimer,
  };
};

export type UsePasswordResetReturn = ReturnType<typeof usePasswordReset>;

export default usePasswordReset;
