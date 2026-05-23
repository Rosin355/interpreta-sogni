import { useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PasswordInput from "@/components/auth/PasswordInput";
import ForgotPasswordFlow from "@/components/auth/ForgotPasswordFlow";
import type { UsePasswordResetReturn } from "@/hooks/usePasswordReset";

type LoginFormProps = {
  loading: boolean;
  loginForm: { email: string; password: string };
  setLoginForm: (value: { email: string; password: string }) => void;
  handleLogin: (e: FormEvent) => void;
  passwordResetProps: UsePasswordResetReturn;
  showLoginPassword: boolean;
  setShowLoginPassword: (value: boolean) => void;
  onResendConfirmation?: () => void;
};


const LoginForm = ({
  loading,
  loginForm,
  setLoginForm,
  handleLogin,
  passwordResetProps,
  showLoginPassword,
  setShowLoginPassword,
  onResendConfirmation,
}: LoginFormProps) => {

  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showResetConfirmPassword, setShowResetConfirmPassword] = useState(false);

  if (passwordResetProps.showForgotPassword) {
    return (
      <ForgotPasswordFlow
        loading={loading}
        showResetPassword={showResetPassword}
        setShowResetPassword={setShowResetPassword}
        showResetConfirmPassword={showResetConfirmPassword}
        setShowResetConfirmPassword={setShowResetConfirmPassword}
        {...passwordResetProps}
      />
    );
  }

  return (
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
      <div className="flex flex-col items-start gap-2">
        <button
          type="button"
          onClick={() => passwordResetProps.setShowForgotPassword(true)}
          className="text-sm text-primary hover:underline"
        >
          Password dimenticata?
        </button>
        {onResendConfirmation && (
          <button
            type="button"
            onClick={onResendConfirmation}
            className="text-sm text-muted-foreground hover:text-primary hover:underline"
          >
            Non hai ricevuto la conferma? Reinvia email
          </button>
        )}
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Accesso in corso..." : "Accedi"}
      </Button>

    </form>
  );
};

export default LoginForm;
