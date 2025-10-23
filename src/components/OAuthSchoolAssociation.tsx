import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface School {
  id: number;
  school_name: string;
  city: string;
  state: string;
}

interface OAuthSchoolAssociationProps {
  user: User;
  onComplete: () => void;
}

export const OAuthSchoolAssociation = ({ user, onComplete }: OAuthSchoolAssociationProps) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [selectedRole, setSelectedRole] = useState<'school_admin' | 'teacher' | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const searchSchools = async (query: string) => {
    if (query.length < 2) {
      setSchools([]);
      return;
    }

    try {
      const { data, error } = await supabase.rpc('search_schools_for_signup', {
        q: query,
      });

      if (error) throw error;
      setSchools(data || []);
    } catch (error) {
      console.error('Error searching schools:', error);
      toast.error('Failed to search schools');
    }
  };

  const handleComplete = async () => {
    if (!selectedSchool || !selectedRole) {
      toast.error('Please select a school and role');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('complete-oauth-profile', {
        body: {
          schoolId: selectedSchool.id,
          role: selectedRole,
        },
      });

      if (error) throw error;

      toast.success('Profile completed successfully!');
      onComplete();
      navigate('/dashboard');
    } catch (error) {
      console.error('Error completing profile:', error);
      toast.error('Failed to complete profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-[500px]" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Complete Your Profile</DialogTitle>
          <DialogDescription>
            Please select your school and role to continue.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* School Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">School</label>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  className="w-full justify-between"
                >
                  {selectedSchool
                    ? `${selectedSchool.school_name} - ${selectedSchool.city}, ${selectedSchool.state}`
                    : "Search for your school..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder="Type to search..."
                    value={searchQuery}
                    onValueChange={(value) => {
                      setSearchQuery(value);
                      searchSchools(value);
                    }}
                  />
                  <CommandEmpty>
                    {searchQuery.length < 2
                      ? "Type at least 2 characters to search"
                      : "No schools found"}
                  </CommandEmpty>
                  <CommandGroup>
                    {schools.map((school) => (
                      <CommandItem
                        key={school.id}
                        value={school.id.toString()}
                        onSelect={() => {
                          setSelectedSchool(school);
                          setOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedSchool?.id === school.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex flex-col">
                          <span>{school.school_name}</span>
                          <span className="text-xs text-muted-foreground">
                            {school.city}, {school.state}
                          </span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Role Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Role</label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={selectedRole === 'school_admin' ? 'default' : 'outline'}
                onClick={() => setSelectedRole('school_admin')}
              >
                School Admin
              </Button>
              <Button
                type="button"
                variant={selectedRole === 'teacher' ? 'default' : 'outline'}
                onClick={() => setSelectedRole('teacher')}
              >
                Teacher
              </Button>
            </div>
          </div>

          <Button
            onClick={handleComplete}
            disabled={!selectedSchool || !selectedRole || loading}
            className="w-full"
          >
            {loading ? 'Completing...' : 'Complete Profile'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
