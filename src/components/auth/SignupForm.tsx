import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PasswordInput from "@/components/auth/PasswordInput";
import { isPasswordValid } from "@/components/auth/PasswordRequirements";

type SignupFormState = {
  email: string;
  password: string;
  confirmPassword: string;
};

type SignupFormProps = {
  loading: boolean;
  signupForm: SignupFormState;
  setSignupForm: (value: SignupFormState) => void;
  handleSignup: (e: FormEvent) => void;
  showSignupPassword: boolean;
  setShowSignupPassword: (value: boolean) => void;
  showSignupConfirmPassword: boolean;
  setShowSignupConfirmPassword: (value: boolean) => void;
};

const SignupForm = ({
  loading,
  signupForm,
  setSignupForm,
  handleSignup,
  showSignupPassword,
  setShowSignupPassword,
  showSignupConfirmPassword,
  setShowSignupConfirmPassword,
}: SignupFormProps) => {
  return (
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
          showRequirements={true}
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
      <Button type="submit" className="w-full" disabled={loading || !isPasswordValid(signupForm.password)}>
        {loading ? "Registrazione in corso..." : "Registrati"}
      </Button>
    </form>
  );
};

export default SignupForm;
