import { Button } from "@/components/ui/button";
import { Chrome } from "lucide-react";

interface OAuthButtonsProps {
  onGoogleClick: () => void;
  onMicrosoftClick: () => void;
  disabled?: boolean;
}

export const OAuthButtons = ({ onGoogleClick, onMicrosoftClick, disabled }: OAuthButtonsProps) => {
  return (
    <div className="space-y-3">
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={onGoogleClick}
        disabled={disabled}
      >
        <Chrome className="mr-2 h-4 w-4" />
        Continue with Google
      </Button>
      
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={onMicrosoftClick}
        disabled={disabled}
      >
        <svg
          className="mr-2 h-4 w-4"
          viewBox="0 0 23 23"
          fill="currentColor"
        >
          <path d="M0 0h11v11H0z" fill="#f25022" />
          <path d="M12 0h11v11H12z" fill="#00a4ef" />
          <path d="M0 12h11v11H0z" fill="#7fba00" />
          <path d="M12 12h11v11H12z" fill="#ffb900" />
        </svg>
        Continue with Microsoft
      </Button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Or continue with
          </span>
        </div>
      </div>
    </div>
  );
};
