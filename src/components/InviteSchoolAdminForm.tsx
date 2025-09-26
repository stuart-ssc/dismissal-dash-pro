import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

const inviteSchema = z.object({
  email: z.string().email("Invalid email address"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
});

type InviteFormData = z.infer<typeof inviteSchema>;

interface InviteSchoolAdminFormProps {
  onSuccess: () => void;
}

export default function InviteSchoolAdminForm({ onSuccess }: InviteSchoolAdminFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  
  const form = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
  });

  const handleSubmit = async (formData: InviteFormData) => {
    if (!user) return;
    
    setIsSubmitting(true);
    
    try {
      // Get current user's school_id
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("school_id")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;
      if (!profile?.school_id) throw new Error("No school associated with your account");

      // Call the admin-create-user edge function
      const { data, error } = await supabase.functions.invoke('admin-create-user', {
        body: {
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName,
          role: 'school_admin',
          schoolId: profile.school_id,
          sendInvite: true
        }
      });

      if (error) throw error;

      toast({
        title: "School Admin Invited",
        description: `Invitation sent to ${formData.email}. They'll receive an email to complete the setup.`,
      });

      form.reset();
      onSuccess();
    } catch (error: any) {
      console.error("Error inviting school admin:", error);
      toast({
        title: "Invitation Failed",
        description: error.message || "Failed to send invitation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invite School Administrator</CardTitle>
        <CardDescription>
          Your school needs a school administrator to complete the setup. 
          Invite someone who can manage school settings, transportation, and users.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                {...form.register("firstName")}
                placeholder="John"
              />
              {form.formState.errors.firstName && (
                <p className="text-sm text-destructive mt-1">
                  {form.formState.errors.firstName.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                {...form.register("lastName")}
                placeholder="Doe"
              />
              {form.formState.errors.lastName && (
                <p className="text-sm text-destructive mt-1">
                  {form.formState.errors.lastName.message}
                </p>
              )}
            </div>
          </div>
          
          <div>
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              {...form.register("email")}
              placeholder="admin@school.edu"
            />
            {form.formState.errors.email && (
              <p className="text-sm text-destructive mt-1">
                {form.formState.errors.email.message}
              </p>
            )}
          </div>

          <Button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full"
          >
            {isSubmitting ? "Sending Invitation..." : "Send Invitation"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}