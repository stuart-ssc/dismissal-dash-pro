import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Bug, LifeBuoy, Lightbulb, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const helpRequestSchema = z.object({
  subject: z.string()
    .min(1, "Subject is required")
    .max(200, "Subject must be less than 200 characters"),
  description: z.string()
    .min(10, "Description must be at least 10 characters")
    .max(2000, "Description must be less than 2000 characters"),
});

type HelpRequestForm = z.infer<typeof helpRequestSchema>;

const Help = () => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const bugForm = useForm<HelpRequestForm>({
    resolver: zodResolver(helpRequestSchema),
    defaultValues: { subject: "", description: "" },
  });

  const supportForm = useForm<HelpRequestForm>({
    resolver: zodResolver(helpRequestSchema),
    defaultValues: { subject: "", description: "" },
  });

  const suggestionForm = useForm<HelpRequestForm>({
    resolver: zodResolver(helpRequestSchema),
    defaultValues: { subject: "", description: "" },
  });

  const handleSubmit = async (
    data: HelpRequestForm,
    requestType: 'bug' | 'support' | 'suggestion',
    form: typeof bugForm
  ) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke('submit-help-request', {
        body: {
          request_type: requestType,
          subject: data.subject,
          description: data.description,
        },
      });

      if (error) throw error;

      toast({
        title: "Request submitted successfully",
        description: "We'll get back to you as soon as possible.",
      });

      form.reset();
    } catch (error) {
      console.error('Error submitting help request:', error);
      toast({
        title: "Submission failed",
        description: "Please try again or contact support directly.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container max-w-4xl py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Help & Support</h1>
        <p className="text-muted-foreground">
          Need assistance? Report bugs, request support, or share your suggestions with our team.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>How can we help you?</CardTitle>
          <CardDescription>
            Choose the appropriate category below and provide details about your request.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="bug" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="bug">
                <Bug className="h-4 w-4 mr-2" />
                Report Bug
              </TabsTrigger>
              <TabsTrigger value="support">
                <LifeBuoy className="h-4 w-4 mr-2" />
                Get Support
              </TabsTrigger>
              <TabsTrigger value="suggestion">
                <Lightbulb className="h-4 w-4 mr-2" />
                Suggest Feature
              </TabsTrigger>
            </TabsList>

            {/* Bug Report Tab */}
            <TabsContent value="bug" className="space-y-4 mt-6">
              <Form {...bugForm}>
                <form onSubmit={bugForm.handleSubmit((data) => handleSubmit(data, 'bug', bugForm))} className="space-y-4">
                  <FormField
                    control={bugForm.control}
                    name="subject"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subject</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Brief description of the bug" 
                            {...field} 
                            disabled={isSubmitting}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={bugForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Please describe the bug in detail. Include steps to reproduce, what you expected to happen, and what actually happened."
                            className="min-h-[200px]"
                            {...field}
                            disabled={isSubmitting}
                          />
                        </FormControl>
                        <div className="text-sm text-muted-foreground text-right">
                          {field.value.length}/2000 characters
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={isSubmitting} className="w-full">
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Submit Bug Report
                  </Button>
                </form>
              </Form>
            </TabsContent>

            {/* Support Request Tab */}
            <TabsContent value="support" className="space-y-4 mt-6">
              <Form {...supportForm}>
                <form onSubmit={supportForm.handleSubmit((data) => handleSubmit(data, 'support', supportForm))} className="space-y-4">
                  <FormField
                    control={supportForm.control}
                    name="subject"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subject</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="What do you need help with?" 
                            {...field} 
                            disabled={isSubmitting}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={supportForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Please provide detailed information about your issue or question. The more context you provide, the faster we can help you."
                            className="min-h-[200px]"
                            {...field}
                            disabled={isSubmitting}
                          />
                        </FormControl>
                        <div className="text-sm text-muted-foreground text-right">
                          {field.value.length}/2000 characters
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={isSubmitting} className="w-full">
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Submit Support Request
                  </Button>
                </form>
              </Form>
            </TabsContent>

            {/* Suggestion Tab */}
            <TabsContent value="suggestion" className="space-y-4 mt-6">
              <Form {...suggestionForm}>
                <form onSubmit={suggestionForm.handleSubmit((data) => handleSubmit(data, 'suggestion', suggestionForm))} className="space-y-4">
                  <FormField
                    control={suggestionForm.control}
                    name="subject"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subject</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Brief title for your suggestion" 
                            {...field} 
                            disabled={isSubmitting}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={suggestionForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Share your ideas for new features or improvements. Tell us what problem it would solve and how it would help you."
                            className="min-h-[200px]"
                            {...field}
                            disabled={isSubmitting}
                          />
                        </FormControl>
                        <div className="text-sm text-muted-foreground text-right">
                          {field.value.length}/2000 characters
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={isSubmitting} className="w-full">
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Submit Suggestion
                  </Button>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Help;
