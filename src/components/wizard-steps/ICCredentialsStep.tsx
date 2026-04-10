import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Eye, EyeOff, HelpCircle, ChevronDown, AlertCircle, Info } from 'lucide-react';
import { WizardState } from '../ICConnectionWizard';
import { supabase } from '@/integrations/supabase/client';

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
  baseUrl: z.string()
    .min(1, 'Base URL is required')
    .url('Must be a valid URL')
    .refine((url) => url.startsWith('https://'), 'Must use HTTPS'),
  appName: z.string()
    .min(1, 'App Name is required')
    .regex(/^[a-zA-Z0-9_-]+$/, 'App Name must be alphanumeric (letters, numbers, hyphens, underscores)'),
  clientId: z.string()
    .min(1, 'Client ID is required'),
  clientSecret: z.string()
    .min(1, 'Client Secret is required'),
  tokenUrl: z.string()
    .min(1, 'Token URL is required')
    .url('Must be a valid URL')
    .refine((url) => url.startsWith('https://'), 'Must use HTTPS'),
});

type CredentialsForm = z.infer<typeof credentialsSchema>;

export function ICCredentialsStep({ state, updateState, nextStep, schoolId }: StepProps) {
  const [showSecret, setShowSecret] = useState(false);
  const [baseUrlHelp, setBaseUrlHelp] = useState(false);
  const [appNameHelp, setAppNameHelp] = useState(false);
  const [checkingDistrict, setCheckingDistrict] = useState(true);

  const form = useForm<CredentialsForm>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: {
      baseUrl: state.credentials.baseUrl || '',
      appName: state.credentials.appName || '',
      clientId: state.credentials.clientId || '',
      clientSecret: state.credentials.clientSecret || '',
      tokenUrl: state.credentials.tokenUrl || '',
    },
  });

  const watchBaseUrl = form.watch('baseUrl');

  // Check if district already has an IC connection
  useEffect(() => {
    async function checkDistrictConnection() {
      try {
        const { data: school } = await supabase
          .from('schools')
          .select('district_id')
          .eq('id', schoolId)
          .single();

        if (school?.district_id) {
          updateState({ districtId: school.district_id });

          const { data: existingConn } = await supabase
            .from('ic_district_connections')
            .select('id, base_url, app_name, token_url')
            .eq('district_id', school.district_id)
            .maybeSingle();

          if (existingConn) {
            // District already connected — store connection ID only, NO masked credentials
            updateState({
              districtAlreadyConnected: true,
              connectionId: existingConn.id,
              credentials: {
                baseUrl: existingConn.base_url,
                appName: existingConn.app_name,
                clientId: '', // Empty — never send masked placeholders
                clientSecret: '', // Empty — never send masked placeholders
                tokenUrl: existingConn.token_url,
              },
            });
          }
        }
      } catch (e) {
        console.error('Error checking district connection:', e);
      } finally {
        setCheckingDistrict(false);
      }
    }
    checkDistrictConnection();
  }, [schoolId]);

  // Auto-fill token URL when base URL changes
  useEffect(() => {
    if (watchBaseUrl && watchBaseUrl.startsWith('https://')) {
      try {
        const url = new URL(watchBaseUrl);
        const tokenUrl = `${url.protocol}//${url.host}/campus/oauth2/token`;
        form.setValue('tokenUrl', tokenUrl);
      } catch (e) {
        // Invalid URL
      }
    }
  }, [watchBaseUrl, form]);

  useEffect(() => {
    if (!checkingDistrict && !state.districtAlreadyConnected) {
      form.setFocus('baseUrl');
    }
  }, [form, checkingDistrict, state.districtAlreadyConnected]);

  const onSubmit = (data: CredentialsForm) => {
    updateState({
      credentials: {
        baseUrl: data.baseUrl,
        clientId: data.clientId,
        clientSecret: data.clientSecret,
        tokenUrl: data.tokenUrl,
        appName: data.appName,
      },
    });
    nextStep();
  };

  // If district already connected, show simplified view — skip straight to school selection
  if (state.districtAlreadyConnected) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">District Already Connected</h2>
          <p className="text-muted-foreground">
            Your district already has Infinite Campus credentials configured. 
            You just need to select which school you are from the IC system.
          </p>
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Credentials were configured by another administrator in your district. 
            Click "Continue" to select your school from Infinite Campus.
          </AlertDescription>
        </Alert>

        <div className="rounded-lg border p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Base URL:</span>
            <span className="font-medium">{state.credentials.baseUrl}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">App Name:</span>
            <span className="font-medium">{state.credentials.appName}</span>
          </div>
        </div>

        <div className="flex items-center justify-end pt-4">
          <Button onClick={nextStep}>
            Continue to School Selection
          </Button>
        </div>
      </div>
    );
  }

  if (checkingDistrict) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Checking district connection...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Enter Your Infinite Campus Credentials</h2>
        <p className="text-muted-foreground">
          These credentials are for your entire district and only need to be entered once. 
          Other schools in your district will be able to connect automatically.
        </p>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Your credentials are encrypted and stored securely. They are only used to sync data from Infinite Campus.
        </AlertDescription>
      </Alert>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Base URL */}
        <div className="space-y-2">
          <Label htmlFor="baseUrl" className="flex items-center gap-2">
            Base URL
            <span className="text-destructive">*</span>
          </Label>
          <Input
            id="baseUrl"
            placeholder="https://your-district.infinitecampus.org"
            {...form.register('baseUrl')}
            className={form.formState.errors.baseUrl ? 'border-destructive' : ''}
          />
          {form.formState.errors.baseUrl && (
            <p className="text-sm text-destructive">{form.formState.errors.baseUrl.message}</p>
          )}
          <p className="text-sm text-muted-foreground">
            Your district's Infinite Campus URL (must start with https://, do NOT include /campus)
          </p>

          <Collapsible open={baseUrlHelp} onOpenChange={setBaseUrlHelp}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" type="button" className="gap-2">
                <HelpCircle className="h-4 w-4" />
                Where do I find this?
                <ChevronDown className={`h-4 w-4 transition-transform ${baseUrlHelp ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                <p className="text-sm">
                  The Base URL is your district's Infinite Campus web address. Examples:
                </p>
                <ul className="text-sm space-y-1 list-disc list-inside ml-2">
                  <li><code className="text-xs bg-background px-1 py-0.5 rounded">https://jessamineky.infinitecampus.org</code></li>
                  <li><code className="text-xs bg-background px-1 py-0.5 rounded">https://district.infinitecampus.org</code></li>
                </ul>
                <p className="text-sm text-amber-600 font-medium">
                  ⚠️ Do not include "/campus" at the end — we add that automatically.
                </p>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* App Name */}
        <div className="space-y-2">
          <Label htmlFor="appName" className="flex items-center gap-2">
            App Name
            <span className="text-destructive">*</span>
          </Label>
          <Input
            id="appName"
            placeholder="e.g. jessamine"
            {...form.register('appName')}
            className={form.formState.errors.appName ? 'border-destructive' : ''}
          />
          {form.formState.errors.appName && (
            <p className="text-sm text-destructive">{form.formState.errors.appName.message}</p>
          )}
          <p className="text-sm text-muted-foreground">
            The district identifier in the IC API URL (e.g., "jessamine" from the API docs URL)
          </p>

          <Collapsible open={appNameHelp} onOpenChange={setAppNameHelp}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" type="button" className="gap-2">
                <HelpCircle className="h-4 w-4" />
                Where do I find this?
                <ChevronDown className={`h-4 w-4 transition-transform ${appNameHelp ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                <p className="text-sm">
                  The App Name is found in your IC API documentation URL. For example:
                </p>
                <p className="text-sm">
                  <code className="text-xs bg-background px-1 py-0.5 rounded">
                    /campus/api/oneroster/v1p2/<strong>jessamine</strong>/ims/oneroster/...
                  </code>
                </p>
                <p className="text-sm">
                  The bold part is your App Name. It's usually your district's short name.
                </p>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* Client ID */}
        <div className="space-y-2">
          <Label htmlFor="clientId" className="flex items-center gap-2">
            Client ID
            <span className="text-destructive">*</span>
          </Label>
          <Input
            id="clientId"
            placeholder="your-client-id"
            {...form.register('clientId')}
            className={form.formState.errors.clientId ? 'border-destructive' : ''}
          />
          {form.formState.errors.clientId && (
            <p className="text-sm text-destructive">{form.formState.errors.clientId.message}</p>
          )}
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
        </div>

        {/* Token URL */}
        <div className="space-y-2">
          <Label htmlFor="tokenUrl" className="flex items-center gap-2">
            Token URL
            <span className="text-destructive">*</span>
          </Label>
          <Input
            id="tokenUrl"
            placeholder="https://your-district.infinitecampus.org/campus/oauth2/token"
            {...form.register('tokenUrl')}
            className={form.formState.errors.tokenUrl ? 'border-destructive' : ''}
          />
          {form.formState.errors.tokenUrl && (
            <p className="text-sm text-destructive">{form.formState.errors.tokenUrl.message}</p>
          )}
          <p className="text-sm text-muted-foreground">
            OAuth token endpoint (auto-filled based on Base URL)
          </p>
        </div>

        <div className="flex items-center justify-between pt-4">
          <Button type="button" variant="outline" onClick={() => form.reset()}>
            Clear Form
          </Button>
          <Button type="submit">
            Test Connection
          </Button>
        </div>
      </form>

      <div className="mt-8 rounded-lg border bg-muted/30 p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <HelpCircle className="h-5 w-5 text-primary" />
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold">Need Help?</h3>
            <p className="text-sm text-muted-foreground">
              If you don't have your API credentials, contact your district's IT department. 
              These credentials apply to the entire district — not just one school.
            </p>
          </div>
        </div>

        <div className="space-y-2 pt-2 border-t">
          <h4 className="text-sm font-semibold">Common Issues:</h4>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Make sure your Base URL uses HTTPS (not HTTP)</li>
            <li>Do NOT include "/campus" in the Base URL — we add it automatically</li>
            <li>The App Name is case-sensitive and usually lowercase</li>
            <li>The Client Secret is case-sensitive</li>
            <li>Ensure the API has OneRoster permissions enabled</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
