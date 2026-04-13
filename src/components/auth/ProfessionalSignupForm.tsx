import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import PasswordInput from "@/components/auth/PasswordInput";
import { isPasswordValid } from "@/components/auth/PasswordRequirements";

type ProfessionalFormState = {
  email: string;
  password: string;
  confirmPassword: string;
  specialization: string;
  licenseNumber: string;
  yearsOfExperience: number | undefined;
  bio: string;
};

type ProfessionalSignupFormProps = {
  loading: boolean;
  professionalForm: ProfessionalFormState;
  setProfessionalForm: (value: ProfessionalFormState) => void;
  handleProfessionalSignup: (e: FormEvent) => void;
  showProfessionalPassword: boolean;
  setShowProfessionalPassword: (value: boolean) => void;
  showProfessionalConfirmPassword: boolean;
  setShowProfessionalConfirmPassword: (value: boolean) => void;
};

const ProfessionalSignupForm = ({
  loading,
  professionalForm,
  setProfessionalForm,
  handleProfessionalSignup,
  showProfessionalPassword,
  setShowProfessionalPassword,
  showProfessionalConfirmPassword,
  setShowProfessionalConfirmPassword,
}: ProfessionalSignupFormProps) => {
  return (
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
          showRequirements={true}
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
          value={professionalForm.yearsOfExperience || ""}
          onChange={(e) =>
            setProfessionalForm({
              ...professionalForm,
              yearsOfExperience: e.target.value ? parseInt(e.target.value) : undefined,
            })
          }
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
      <Button type="submit" className="w-full" disabled={loading || !isPasswordValid(professionalForm.password)}>
        {loading ? "Registrazione in corso..." : "Registrati come Professionista"}
      </Button>
    </form>
  );
};

export default ProfessionalSignupForm;
