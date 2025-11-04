import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Bug, LifeBuoy, Lightbulb, Loader2, ImageIcon, X } from "lucide-react";
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
  const [bugFiles, setBugFiles] = useState<File[]>([]);
  const [supportFiles, setSupportFiles] = useState<File[]>([]);
  const [suggestionFiles, setSuggestionFiles] = useState<File[]>([]);

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
    form: typeof bugForm,
    files: File[]
  ) => {
    setIsSubmitting(true);
    try {
      let attachmentUrls: string[] = [];

      // Upload files if any
      if (files.length > 0) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const tempRequestId = crypto.randomUUID();
        
        for (const file of files) {
          // Validate file size
          if (file.size > 5 * 1024 * 1024) {
            toast({
              title: "File too large",
              description: `${file.name} exceeds 5MB limit`,
              variant: "destructive",
            });
            continue;
          }

          const fileName = `${user.id}/${tempRequestId}/${Date.now()}-${file.name}`;

          const { error: uploadError } = await supabase.storage
            .from('help-attachments')
            .upload(fileName, file, {
              cacheControl: '3600',
              upsert: false,
            });

          if (uploadError) {
            console.error('Upload error:', uploadError);
            throw new Error(`Failed to upload ${file.name}`);
          }

          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('help-attachments')
            .getPublicUrl(fileName);

          attachmentUrls.push(publicUrl);
        }
      }

      // Submit help request with attachments
      const { error } = await supabase.functions.invoke('submit-help-request', {
        body: {
          request_type: requestType,
          subject: data.subject,
          description: data.description,
          attachments: attachmentUrls,
        },
      });

      if (error) throw error;

      toast({
        title: "Request submitted successfully",
        description: "We'll get back to you as soon as possible.",
      });

      form.reset();
      // Clear files based on request type
      if (requestType === 'bug') setBugFiles([]);
      if (requestType === 'support') setSupportFiles([]);
      if (requestType === 'suggestion') setSuggestionFiles([]);

    } catch (error) {
      console.error('Error submitting help request:', error);
      toast({
        title: "Submission failed",
        description: error instanceof Error ? error.message : "Please try again or contact support directly.",
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
                <form onSubmit={bugForm.handleSubmit((data) => handleSubmit(data, 'bug', bugForm, bugFiles))} className="space-y-4">
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
                  <FormItem>
                    <FormLabel>Screenshots (Optional)</FormLabel>
                    <FormControl>
                      <div className="space-y-2">
                        <Input
                          type="file"
                          accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                          multiple
                          disabled={isSubmitting || bugFiles.length >= 3}
                          onChange={(e) => {
                            const files = Array.from(e.target.files || []);
                            if (bugFiles.length + files.length > 3) {
                              toast({
                                title: "Too many files",
                                description: "Maximum 3 screenshots allowed",
                                variant: "destructive",
                              });
                              return;
                            }
                            setBugFiles([...bugFiles, ...files]);
                            e.target.value = '';
                          }}
                        />
                        <p className="text-sm text-muted-foreground">
                          PNG, JPG, GIF, or WebP. Max 5MB per file. Up to 3 files.
                        </p>
                        
                        {bugFiles.length > 0 && (
                          <div className="space-y-2">
                            {bugFiles.map((file, index) => (
                              <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                                <div className="flex items-center gap-2">
                                  <ImageIcon className="h-4 w-4" />
                                  <span className="text-sm truncate max-w-[200px]">{file.name}</span>
                                  <span className="text-xs text-muted-foreground">
                                    ({(file.size / 1024).toFixed(1)} KB)
                                  </span>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setBugFiles(bugFiles.filter((_, i) => i !== index));
                                  }}
                                  disabled={isSubmitting}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </FormControl>
                  </FormItem>
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
                <form onSubmit={supportForm.handleSubmit((data) => handleSubmit(data, 'support', supportForm, supportFiles))} className="space-y-4">
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
                  <FormItem>
                    <FormLabel>Screenshots (Optional)</FormLabel>
                    <FormControl>
                      <div className="space-y-2">
                        <Input
                          type="file"
                          accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                          multiple
                          disabled={isSubmitting || supportFiles.length >= 3}
                          onChange={(e) => {
                            const files = Array.from(e.target.files || []);
                            if (supportFiles.length + files.length > 3) {
                              toast({
                                title: "Too many files",
                                description: "Maximum 3 screenshots allowed",
                                variant: "destructive",
                              });
                              return;
                            }
                            setSupportFiles([...supportFiles, ...files]);
                            e.target.value = '';
                          }}
                        />
                        <p className="text-sm text-muted-foreground">
                          PNG, JPG, GIF, or WebP. Max 5MB per file. Up to 3 files.
                        </p>
                        
                        {supportFiles.length > 0 && (
                          <div className="space-y-2">
                            {supportFiles.map((file, index) => (
                              <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                                <div className="flex items-center gap-2">
                                  <ImageIcon className="h-4 w-4" />
                                  <span className="text-sm truncate max-w-[200px]">{file.name}</span>
                                  <span className="text-xs text-muted-foreground">
                                    ({(file.size / 1024).toFixed(1)} KB)
                                  </span>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSupportFiles(supportFiles.filter((_, i) => i !== index));
                                  }}
                                  disabled={isSubmitting}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </FormControl>
                  </FormItem>
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
                <form onSubmit={suggestionForm.handleSubmit((data) => handleSubmit(data, 'suggestion', suggestionForm, suggestionFiles))} className="space-y-4">
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
                  <FormItem>
                    <FormLabel>Screenshots (Optional)</FormLabel>
                    <FormControl>
                      <div className="space-y-2">
                        <Input
                          type="file"
                          accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                          multiple
                          disabled={isSubmitting || suggestionFiles.length >= 3}
                          onChange={(e) => {
                            const files = Array.from(e.target.files || []);
                            if (suggestionFiles.length + files.length > 3) {
                              toast({
                                title: "Too many files",
                                description: "Maximum 3 screenshots allowed",
                                variant: "destructive",
                              });
                              return;
                            }
                            setSuggestionFiles([...suggestionFiles, ...files]);
                            e.target.value = '';
                          }}
                        />
                        <p className="text-sm text-muted-foreground">
                          PNG, JPG, GIF, or WebP. Max 5MB per file. Up to 3 files.
                        </p>
                        
                        {suggestionFiles.length > 0 && (
                          <div className="space-y-2">
                            {suggestionFiles.map((file, index) => (
                              <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                                <div className="flex items-center gap-2">
                                  <ImageIcon className="h-4 w-4" />
                                  <span className="text-sm truncate max-w-[200px]">{file.name}</span>
                                  <span className="text-xs text-muted-foreground">
                                    ({(file.size / 1024).toFixed(1)} KB)
                                  </span>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSuggestionFiles(suggestionFiles.filter((_, i) => i !== index));
                                  }}
                                  disabled={isSubmitting}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </FormControl>
                  </FormItem>
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
