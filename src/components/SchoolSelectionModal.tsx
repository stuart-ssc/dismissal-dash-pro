import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useMultiSchool } from '@/hooks/useMultiSchool';

interface SchoolSelectionModalProps {
  open: boolean;
}

export const SchoolSelectionModal = ({ open }: SchoolSelectionModalProps) => {
  const { schools, switchSchool, isPrimarySchool } = useMultiSchool();
  const [selectedSchool, setSelectedSchool] = useState<number | null>(
    schools.find(s => isPrimarySchool(s.id))?.id || schools[0]?.id || null
  );

  const handleContinue = async () => {
    if (selectedSchool) {
      await switchSchool(selectedSchool);
    }
  };

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Select Your School</DialogTitle>
          <DialogDescription>
            You have access to multiple schools. Please select which school you'd like to manage.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <RadioGroup value={String(selectedSchool)} onValueChange={(v) => setSelectedSchool(Number(v))}>
            {schools.map((school) => (
              <div key={school.id} className="flex items-center space-x-2 rounded-lg border p-3 hover:bg-muted/50">
                <RadioGroupItem value={String(school.id)} id={`school-${school.id}`} />
                <Label htmlFor={`school-${school.id}`} className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{school.school_name}</span>
                    {isPrimarySchool(school.id) && (
                      <Badge variant="secondary" className="text-xs">Primary</Badge>
                    )}
                  </div>
                </Label>
              </div>
            ))}
          </RadioGroup>
          <Button onClick={handleContinue} disabled={!selectedSchool} className="w-full">
            Continue
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
