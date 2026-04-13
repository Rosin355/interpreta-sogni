import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import PasswordInput from "@/components/auth/PasswordInput";
import { isPasswordValid } from "@/components/auth/PasswordRequirements";
import type { UsePasswordResetReturn } from "@/hooks/usePasswordReset";

type ForgotPasswordFlowProps = UsePasswordResetReturn & {
  loading: boolean;
  showResetPassword: boolean;
  setShowResetPassword: (value: boolean) => void;
  showResetConfirmPassword: boolean;
  setShowResetConfirmPassword: (value: boolean) => void;
};

const ForgotPasswordFlow = ({
  loading,
  showResetPassword,
  setShowResetPassword,
  showResetConfirmPassword,
  setShowResetConfirmPassword,
  showForgotPassword,
  setShowForgotPassword,
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
}: ForgotPasswordFlowProps) => {
  if (!showForgotPassword) return null;

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => {
          setShowForgotPassword(false);
          setOtpStep(1);
          setOtpCode("");
        }}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Torna al login
      </button>

      <div className="flex items-center justify-center gap-2 mb-2">
        {[1, 2, 3].map((step) => (
          <div key={step} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                otpStep >= step
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {otpStep > step ? <Check className="h-4 w-4" /> : step}
            </div>
            {step < 3 && <div className={`w-8 h-0.5 ${otpStep > step ? "bg-primary" : "bg-muted"}`} />}
          </div>
        ))}
      </div>

      {otpStep === 1 && (
        <form onSubmit={handleForgotPassword} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reset-email">Email</Label>
            <Input
              id="reset-email"
              type="email"
              placeholder="tua@email.com"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              required
              disabled={otpSending}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Inserisci la tua email per ricevere un codice di verifica a 6 cifre.
          </p>
          <Button type="submit" className="w-full" disabled={otpSending}>
            {otpSending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Invio in corso...
              </>
            ) : (
              "Invia codice di verifica"
            )}
          </Button>
        </form>
      )}

      {otpStep === 2 && (
        <div className="space-y-4">
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Abbiamo inviato un codice a 6 cifre a <strong className="text-foreground">{resetEmail}</strong>
            </p>
            {otpTimer > 0 && (
              <p className="text-xs text-muted-foreground">
                Il codice scade tra <span className="text-primary font-semibold">{formatTimer(otpTimer)}</span>
              </p>
            )}
            {otpTimer <= 0 && <p className="text-xs text-destructive font-medium">Codice scaduto</p>}
          </div>
          <div className="flex justify-center">
            <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode}>
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>
          <Button
            className="w-full"
            disabled={otpCode.length !== 6 || otpTimer <= 0 || otpVerifying}
            onClick={handleVerifyOTPCode}
          >
            {otpVerifying ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Verifica in corso...
              </>
            ) : (
              "Verifica codice"
            )}
          </Button>
          <button
            type="button"
            onClick={handleResendOTP}
            disabled={otpSending}
            className="w-full text-sm text-primary hover:underline disabled:opacity-50"
          >
            {otpSending ? "Invio in corso..." : "Reinvia codice"}
          </button>
        </div>
      )}

      {otpStep === 3 && (
        <form onSubmit={handleVerifyOTPAndReset} className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">Inserisci la tua nuova password</p>
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
              showRequirements={true}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-new-password">Conferma Password</Label>
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
          <Button type="submit" className="w-full" disabled={loading || !isPasswordValid(newPasswordForm.password)}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Aggiornamento...
              </>
            ) : (
              "Aggiorna Password"
            )}
          </Button>
        </form>
      )}
    </div>
  );
};

export default ForgotPasswordFlow;
