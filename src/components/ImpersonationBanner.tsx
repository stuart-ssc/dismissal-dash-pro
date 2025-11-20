import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Shield, X } from 'lucide-react';

interface ImpersonationBannerProps {
  schoolName: string;
  adminType: 'system_admin' | 'district_admin';
  onEndImpersonation: () => void;
}

export function ImpersonationBanner({ 
  schoolName, 
  adminType, 
  onEndImpersonation 
}: ImpersonationBannerProps) {
  const adminLabel = adminType === 'system_admin' ? 'System' : 'District';
  
  return (
    <Alert className="rounded-none border-x-0 border-t-0 bg-blue-50 border-blue-200">
      <Shield className="h-4 w-4 text-blue-600" />
      <AlertDescription className="flex items-center justify-between">
        <span className="text-sm text-blue-900">
          You are viewing <strong>{schoolName}</strong> as a {adminLabel} Administrator
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={onEndImpersonation}
          className="ml-4 border-blue-300 hover:bg-blue-100"
        >
          <X className="h-3 w-3 mr-1" />
          End Impersonation
        </Button>
      </AlertDescription>
    </Alert>
  );
}
