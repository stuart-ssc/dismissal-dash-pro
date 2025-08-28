
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface ExitModeButtonProps {
  to?: string;
  label: string;
  inHeader?: boolean;
}

const ExitModeButton = ({ to = "/dashboard/dismissal", label, inHeader = false }: ExitModeButtonProps) => {
  const navigate = useNavigate();
  
  if (inHeader) {
    return (
      <Button 
        variant="destructive" 
        size="lg"
        onClick={() => navigate(to)}
        className="shadow-lg font-semibold px-6 py-3 w-full md:w-auto"
      >
        {label}
      </Button>
    );
  }
  
  return (
    <div className="fixed top-4 right-4 z-50 hidden md:block">
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
