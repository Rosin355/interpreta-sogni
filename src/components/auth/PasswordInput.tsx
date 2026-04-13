import type { ChangeEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import PasswordRequirements from "@/components/auth/PasswordRequirements";

type PasswordInputProps = {
  id: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  show: boolean;
  onToggle: () => void;
  placeholder?: string;
  disabled?: boolean;
  showRequirements?: boolean;
};

const PasswordInput = ({
  id,
  value,
  onChange,
  show,
  onToggle,
  placeholder = "••••••••",
  disabled = false,
  showRequirements = false,
}: PasswordInputProps) => (
  <div>
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
    {showRequirements && <PasswordRequirements password={value} />}
  </div>
);

export default PasswordInput;
