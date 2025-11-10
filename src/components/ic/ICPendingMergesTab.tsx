import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Loader2, GitMerge } from 'lucide-react';

interface ICPendingMergesTabProps {
  schoolId: number | null;
}

export function ICPendingMergesTab({ schoolId }: ICPendingMergesTabProps) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [ContentComponent, setContentComponent] = useState<any>(null);

  useEffect(() => {
    // Dynamically import the full ICPendingMerges component
    import('@/pages/admin/ICPendingMerges').then((module) => {
      setContentComponent(() => module.default);
      setIsLoading(false);
    });
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!ContentComponent) {
    return <div>Error loading pending merges</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <GitMerge className="h-6 w-6" />
          Pending Merges
        </h2>
        <p className="text-muted-foreground">Review potential duplicate records from Infinite Campus sync</p>
      </div>
      <ContentComponent embedded={true} />
    </div>
  );
}
