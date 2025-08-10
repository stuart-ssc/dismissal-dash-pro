
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface ExitModeButtonProps {
  to?: string;
  label: string;
}

const ExitModeButton = ({ to = "/dashboard/dismissal", label }: ExitModeButtonProps) => {
  const navigate = useNavigate();
  return (
    <div className="fixed bottom-4 left-4 z-50">
      <Button variant="outline" onClick={() => navigate(to)}>
        {label}
      </Button>
    </div>
  );
};

export default ExitModeButton;
