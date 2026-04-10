import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle2, Eye, EyeOff, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const formSchema = z.object({
  baseUrl: z.string().url('Must be a valid URL').min(1, 'Base URL is required'),
  appName: z.string().min(1, 'App Name is required'),
  clientId: z.string().min(1, 'Client ID is required'),
  clientSecret: z.string().min(1, 'Client secret is required'),
  tokenUrl: z.string().url('Must be a valid URL').min(1, 'Token URL is required'),
});

interface ICConnectionFormProps {
  schoolId: number;
  onConnectionSuccess: () => void;
}

export const ICConnectionForm = ({ schoolId, onConnectionSuccess }: ICConnectionFormProps) => {
  const [isTesting, setIsTesting] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [showClientId, setShowClientId] = useState(false);
  const [showClientSecret, setShowClientSecret] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      baseUrl: '',
      appName: '',
      clientId: '',
      clientSecret: '',
      tokenUrl: '',
    },
  });

  const handleTestConnection = async (values: z.infer<typeof formSchema>) => {
    setIsTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('test-ic-connection', {
        body: {
          baseUrl: values.baseUrl,
          clientId: values.clientId,
          clientSecret: values.clientSecret,
          tokenUrl: values.tokenUrl,
          appName: values.appName,
          schoolId,
        },
      });

      if (error) throw error;

      if (data?.valid) {
        setPreviewData(data);
        setShowPreview(true);
      } else {
        toast.error(data?.error || 'Connection test failed');
      }
    } catch (error: any) {
      console.error('Connection test error:', error);
      toast.error(error.message || 'Failed to test connection');
    } finally {
      setIsTesting(false);
    }
  };

  const handleConnect = async () => {
    const values = form.getValues();
    setIsConnecting(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('connect-ic', {
        body: {
          baseUrl: values.baseUrl,
          clientId: values.clientId,
          clientSecret: values.clientSecret,
          tokenUrl: values.tokenUrl,
          appName: values.appName,
          version: previewData.version,
          schoolId,
        },
      });

      if (error) throw error;

      toast.success('Successfully connected to Infinite Campus');
      setShowPreview(false);
      form.reset();
      onConnectionSuccess();
    } catch (error: any) {
      console.error('Connection error:', error);
      toast.error(error.message || 'Failed to connect');
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleTestConnection)} className="space-y-4">
          <FormField
            control={form.control}
            name="baseUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Base URL</FormLabel>
                <FormControl>
                  <Input placeholder="https://your-district.infinitecampus.org" {...field} />
                </FormControl>
                <FormDescription>Do not include "/campus" — it's added automatically</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="appName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>App Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. jessamine" {...field} />
                </FormControl>
                <FormDescription>Your district's OneRoster app name</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="tokenUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Token URL</FormLabel>
                <FormControl>
                  <Input placeholder="https://your-district.infinitecampus.org/campus/oauth2/token" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="clientId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Client ID</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showClientId ? 'text' : 'password'}
                      placeholder="Enter client ID"
                      {...field}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowClientId(!showClientId)}
                    >
                      {showClientId ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="clientSecret"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Client Secret</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showClientSecret ? 'text' : 'password'}
                      placeholder="Enter client secret"
                      {...field}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowClientSecret(!showClientSecret)}
                    >
                      {showClientSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </FormControl>
                <FormDescription>
                  Find these credentials in your Infinite Campus admin portal under OneRoster settings
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" disabled={isTesting} className="w-full">
            {isTesting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Test Connection
          </Button>
        </form>
      </Form>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Connection Test Successful
            </DialogTitle>
            <DialogDescription>
              Review the preview data before connecting to Infinite Campus
            </DialogDescription>
          </DialogHeader>

          {previewData && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">OneRoster Version:</span>
                <Badge>{previewData.version}</Badge>
              </div>

              <div className="space-y-2">
                <p className="text-sm"><strong>Organization:</strong> {previewData.preview?.orgName}</p>
              </div>

              {previewData.schools?.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Schools Found: {previewData.schools.length}</h4>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowPreview(false)} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={handleConnect} disabled={isConnecting} className="flex-1">
                  {isConnecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Connect to Infinite Campus
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
