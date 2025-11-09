import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Eye, EyeOff, HelpCircle, ChevronDown, ExternalLink, AlertCircle } from 'lucide-react';
import { WizardState } from '../ICConnectionWizard';

interface StepProps {
  state: WizardState;
  updateState: (updates: Partial<WizardState>) => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: number) => void;
  schoolId: number;
  onComplete?: () => void;
}

const credentialsSchema = z.object({
  hostUrl: z.string()
    .min(1, 'Host URL is required')
    .url('Must be a valid URL')
    .refine((url) => url.startsWith('https://'), 'Must use HTTPS'),
  clientKey: z.string()
    .min(1, 'Client Key is required')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Client Key must be alphanumeric'),
  clientSecret: z.string()
    .min(1, 'Client Secret is required'),
  tokenUrl: z.string()
    .min(1, 'Token URL is required')
    .url('Must be a valid URL')
    .refine((url) => url.startsWith('https://'), 'Must use HTTPS'),
});

type CredentialsForm = z.infer<typeof credentialsSchema>;

export function ICCredentialsStep({ state, updateState, nextStep }: StepProps) {
  const [showSecret, setShowSecret] = useState(false);
  const [hostUrlHelp, setHostUrlHelp] = useState(false);
  const [clientKeyHelp, setClientKeyHelp] = useState(false);
  const [clientSecretHelp, setClientSecretHelp] = useState(false);
  const [tokenUrlHelp, setTokenUrlHelp] = useState(false);

  const form = useForm<CredentialsForm>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: {
      hostUrl: state.credentials.hostUrl || '',
      clientKey: state.credentials.clientKey || '',
      clientSecret: state.credentials.clientSecret || '',
      tokenUrl: state.credentials.tokenUrl || '',
    },
  });

  const watchHostUrl = form.watch('hostUrl');

  // Auto-fill token URL when host URL changes
  useEffect(() => {
    if (watchHostUrl && watchHostUrl.startsWith('https://')) {
      try {
        const url = new URL(watchHostUrl);
        const tokenUrl = `${url.protocol}//${url.host}/oauth/token`;
        form.setValue('tokenUrl', tokenUrl);
      } catch (e) {
        // Invalid URL, don't auto-fill
      }
    }
  }, [watchHostUrl, form]);

  const onSubmit = (data: CredentialsForm) => {
    updateState({
      credentials: {
        hostUrl: data.hostUrl,
        clientKey: data.clientKey,
        clientSecret: data.clientSecret,
        tokenUrl: data.tokenUrl,
      },
    });
    nextStep();
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Enter Your Infinite Campus Credentials</h2>
        <p className="text-muted-foreground">
          We'll need your Infinite Campus API credentials to establish the connection. 
          These can be obtained from your district's IT administrator.
        </p>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Your credentials are encrypted and stored securely. They are only used to sync data from Infinite Campus.
        </AlertDescription>
      </Alert>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Host URL */}
        <div className="space-y-2">
          <Label htmlFor="hostUrl" className="flex items-center gap-2">
            Host URL
            <span className="text-destructive">*</span>
          </Label>
          <Input
            id="hostUrl"
            placeholder="https://your-district.infinitecampus.org"
            {...form.register('hostUrl')}
            className={form.formState.errors.hostUrl ? 'border-destructive' : ''}
          />
          {form.formState.errors.hostUrl && (
            <p className="text-sm text-destructive">{form.formState.errors.hostUrl.message}</p>
          )}
          <p className="text-sm text-muted-foreground">
            Your district's Infinite Campus URL (must start with https://)
          </p>

          <Collapsible open={hostUrlHelp} onOpenChange={setHostUrlHelp}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" type="button" className="gap-2">
                <HelpCircle className="h-4 w-4" />
                Where do I find this?
                <ChevronDown className={`h-4 w-4 transition-transform ${hostUrlHelp ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                <p className="text-sm">
                  The Host URL is your district's Infinite Campus web address. It typically looks like:
                </p>
                <ul className="text-sm space-y-1 list-disc list-inside ml-2">
                  <li><code className="text-xs bg-background px-1 py-0.5 rounded">https://district.infinitecampus.org</code></li>
                  <li><code className="text-xs bg-background px-1 py-0.5 rounded">https://district.ic.edu</code></li>
                  <li><code className="text-xs bg-background px-1 py-0.5 rounded">https://campus.schoolname.org</code></li>
                </ul>
                <p className="text-sm">
                  This is the same URL your staff uses to log into Infinite Campus. If you're unsure, 
                  contact your district's IT department or system administrator.
                </p>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* Client Key */}
        <div className="space-y-2">
          <Label htmlFor="clientKey" className="flex items-center gap-2">
            Client Key
            <span className="text-destructive">*</span>
          </Label>
          <Input
            id="clientKey"
            placeholder="your-client-key"
            {...form.register('clientKey')}
            className={form.formState.errors.clientKey ? 'border-destructive' : ''}
          />
          {form.formState.errors.clientKey && (
            <p className="text-sm text-destructive">{form.formState.errors.clientKey.message}</p>
          )}
          <p className="text-sm text-muted-foreground">
            The API client key provided by your IT administrator
          </p>

          <Collapsible open={clientKeyHelp} onOpenChange={setClientKeyHelp}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" type="button" className="gap-2">
                <HelpCircle className="h-4 w-4" />
                Where do I find this?
                <ChevronDown className={`h-4 w-4 transition-transform ${clientKeyHelp ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
                <p className="text-sm font-semibold">For IT Administrators:</p>
                <ol className="text-sm space-y-2 list-decimal list-inside ml-2">
                  <li>Log into Infinite Campus as an administrator</li>
                  <li>Navigate to: <strong>System Administration → Security → API</strong></li>
                  <li>Click <strong>"Add API"</strong> or select an existing API configuration</li>
                  <li>Find the <strong>Client ID</strong> or <strong>Client Key</strong> field</li>
                  <li>Copy this value</li>
                </ol>
                <p className="text-sm">
                  The client key is typically a long alphanumeric string. If you need to create a new API, 
                  ensure it has permissions for OneRoster data access.
                </p>
                <a 
                  href="https://kb.infinitecampus.com/help/oneroster-api" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  View Infinite Campus documentation
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* Client Secret */}
        <div className="space-y-2">
          <Label htmlFor="clientSecret" className="flex items-center gap-2">
            Client Secret
            <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <Input
              id="clientSecret"
              type={showSecret ? 'text' : 'password'}
              placeholder="••••••••••••••••"
              {...form.register('clientSecret')}
              className={`pr-10 ${form.formState.errors.clientSecret ? 'border-destructive' : ''}`}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3"
              onClick={() => setShowSecret(!showSecret)}
            >
              {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
          {form.formState.errors.clientSecret && (
            <p className="text-sm text-destructive">{form.formState.errors.clientSecret.message}</p>
          )}
          <p className="text-sm text-muted-foreground">
            The API client secret (keep this confidential!)
          </p>

          <Collapsible open={clientSecretHelp} onOpenChange={setClientSecretHelp}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" type="button" className="gap-2">
                <HelpCircle className="h-4 w-4" />
                Where do I find this?
                <ChevronDown className={`h-4 w-4 transition-transform ${clientSecretHelp ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
                <p className="text-sm font-semibold">For IT Administrators:</p>
                <p className="text-sm">
                  The Client Secret is found in the same location as the Client Key:
                </p>
                <ol className="text-sm space-y-2 list-decimal list-inside ml-2">
                  <li>System Administration → Security → API</li>
                  <li>Select your API configuration</li>
                  <li>Find the <strong>Client Secret</strong> field</li>
                  <li>Copy this value (you may need to reveal it first)</li>
                </ol>
                <Alert className="border-amber-500/50 bg-amber-500/10">
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                  <AlertDescription className="text-sm">
                    <strong>Security Note:</strong> The client secret is sensitive information. 
                    Never share it publicly or store it in an unsecured location. 
                    If compromised, regenerate it in Infinite Campus immediately.
                  </AlertDescription>
                </Alert>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* Token URL */}
        <div className="space-y-2">
          <Label htmlFor="tokenUrl" className="flex items-center gap-2">
            Token URL
            <span className="text-destructive">*</span>
          </Label>
          <Input
            id="tokenUrl"
            placeholder="https://your-district.infinitecampus.org/oauth/token"
            {...form.register('tokenUrl')}
            className={form.formState.errors.tokenUrl ? 'border-destructive' : ''}
          />
          {form.formState.errors.tokenUrl && (
            <p className="text-sm text-destructive">{form.formState.errors.tokenUrl.message}</p>
          )}
          <p className="text-sm text-muted-foreground">
            OAuth token endpoint (auto-filled based on Host URL)
          </p>

          <Collapsible open={tokenUrlHelp} onOpenChange={setTokenUrlHelp}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" type="button" className="gap-2">
                <HelpCircle className="h-4 w-4" />
                Where do I find this?
                <ChevronDown className={`h-4 w-4 transition-transform ${tokenUrlHelp ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                <p className="text-sm">
                  The Token URL is typically your Host URL with <code className="text-xs bg-background px-1 py-0.5 rounded">/oauth/token</code> appended.
                </p>
                <p className="text-sm">
                  We've automatically filled this in based on your Host URL. In most cases, you won't need to change it.
                </p>
                <p className="text-sm">
                  If your district uses a custom OAuth endpoint, your IT administrator will provide the correct URL.
                </p>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        <div className="flex items-center justify-between pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => form.reset()}
          >
            Clear Form
          </Button>
          <Button type="submit">
            Test Connection
          </Button>
        </div>
      </form>

      {/* Side help panel */}
      <div className="mt-8 rounded-lg border bg-muted/30 p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <HelpCircle className="h-5 w-5 text-primary" />
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold">Need Help?</h3>
            <p className="text-sm text-muted-foreground">
              If you don't have your API credentials, contact your district's IT department 
              or system administrator. They can create API credentials in Infinite Campus 
              and provide them to you.
            </p>
          </div>
        </div>

        <div className="space-y-2 pt-2 border-t">
          <h4 className="text-sm font-semibold">Common Issues:</h4>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Make sure your Host URL uses HTTPS (not HTTP)</li>
            <li>Verify the Client Key has no extra spaces</li>
            <li>The Client Secret is case-sensitive</li>
            <li>Ensure the API has OneRoster permissions enabled</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
