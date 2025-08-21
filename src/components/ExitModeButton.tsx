
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface ExitModeButtonProps {
  to?: string;
  label: string;
}

const ExitModeButton = ({ to = "/dashboard/dismissal", label }: ExitModeButtonProps) => {
  const navigate = useNavigate();
  return (
    <div className="fixed top-4 right-4 z-50">
      <Button 
        variant="destructive" 
        size="lg"
        onClick={() => navigate(to)}
        className="shadow-lg font-semibold px-6 py-3"
      >
        {label}
      </Button>
    </div>
  );
};

export default ExitModeButton;
