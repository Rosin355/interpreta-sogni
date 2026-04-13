import { Check, X } from "lucide-react";

const getPasswordValidation = (password: string) => ({
  hasMinLength: password.length >= 8,
  hasUppercase: /[A-Z]/.test(password),
  hasNumber: /[0-9]/.test(password),
});

export const isPasswordValid = (password: string) => {
  const validation = getPasswordValidation(password);
  return validation.hasMinLength && validation.hasUppercase && validation.hasNumber;
};

const PasswordRequirements = ({ password }: { password: string }) => {
  const validation = getPasswordValidation(password);

  if (!password) return null;

  const requirements = [
    { met: validation.hasMinLength, label: "Almeno 8 caratteri" },
    { met: validation.hasUppercase, label: "Almeno una lettera maiuscola" },
    { met: validation.hasNumber, label: "Almeno un numero" },
  ];

  return (
    <div className="mt-2 space-y-1">
      {requirements.map((req, index) => (
        <div
          key={index}
          className={`flex items-center gap-2 text-xs transition-colors ${
            req.met ? "text-green-500" : "text-muted-foreground"
          }`}
        >
          {req.met ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
          <span>{req.label}</span>
        </div>
      ))}
    </div>
  );
};

export default PasswordRequirements;
