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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, CheckCircle2, Eye, EyeOff, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const formSchema = z.object({
  hostUrl: z.string().url('Must be a valid URL').min(1, 'Host URL is required'),
  clientKey: z.string().min(1, 'Client key is required'),
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
  const [showClientKey, setShowClientKey] = useState(false);
  const [showClientSecret, setShowClientSecret] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      hostUrl: '',
      clientKey: '',
      clientSecret: '',
      tokenUrl: '',
    },
  });

  const handleTestConnection = async (values: z.infer<typeof formSchema>) => {
    setIsTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('test-ic-connection', {
        body: {
          hostUrl: values.hostUrl,
          clientKey: values.clientKey,
          clientSecret: values.clientSecret,
          tokenUrl: values.tokenUrl,
          schoolId,
        },
      });

      if (error) throw error;

      if (data.valid) {
        setPreviewData(data);
        setShowPreview(true);
      } else {
        toast.error(data.error || 'Connection test failed');
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
          hostUrl: values.hostUrl,
          clientKey: values.clientKey,
          clientSecret: values.clientSecret,
          tokenUrl: values.tokenUrl,
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
            name="hostUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>OneRoster Host URL</FormLabel>
                <FormControl>
                  <Input placeholder="https://your-district.infinitecampus.org" {...field} />
                </FormControl>
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
                  <Input placeholder="https://your-district.infinitecampus.org/campus/oauth/token" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="clientKey"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Client/Consumer Key</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showClientKey ? 'text' : 'password'}
                      placeholder="Enter client key"
                      {...field}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowClientKey(!showClientKey)}
                    >
                      {showClientKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
                <FormLabel>Client/Consumer Secret</FormLabel>
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
                <p className="text-sm"><strong>Organization:</strong> {previewData.preview.orgName}</p>
                <p className="text-sm"><strong>School:</strong> {previewData.preview.schoolName}</p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-lg border p-4">
                  <p className="text-2xl font-bold">{previewData.preview.studentCount}</p>
                  <p className="text-sm text-muted-foreground">Students</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-2xl font-bold">{previewData.preview.teacherCount}</p>
                  <p className="text-sm text-muted-foreground">Teachers</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-2xl font-bold">{previewData.preview.classCount}</p>
                  <p className="text-sm text-muted-foreground">Classes</p>
                </div>
              </div>

              {(previewData.preview.duplicateStudents > 0 || previewData.preview.duplicateTeachers > 0) && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Potential Duplicates Detected</AlertTitle>
                  <AlertDescription>
                    {previewData.preview.duplicateStudents} potential duplicate students and{' '}
                    {previewData.preview.duplicateTeachers} potential duplicate teachers detected.
                    These will require your review after connection.
                  </AlertDescription>
                </Alert>
              )}

              {previewData.preview.sampleStudents?.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Sample Students</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Grade</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewData.preview.sampleStudents.map((student: any, i: number) => (
                        <TableRow key={i}>
                          <TableCell>{student.name}</TableCell>
                          <TableCell>{student.grade}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {previewData.preview.sampleTeachers?.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Sample Teachers</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewData.preview.sampleTeachers.map((teacher: any, i: number) => (
                        <TableRow key={i}>
                          <TableCell>{teacher.name}</TableCell>
                          <TableCell>{teacher.email}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
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
