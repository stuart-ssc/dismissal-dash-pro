import { useEffect, useState } from 'react';
import { Loader2, Zap } from 'lucide-react';

interface ICAutoMergeRulesTabProps {
  schoolId: number | null;
}

export function ICAutoMergeRulesTab({ schoolId }: ICAutoMergeRulesTabProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [ContentComponent, setContentComponent] = useState<any>(null);

  useEffect(() => {
    // Dynamically import the full ICAutoMergeRules component
    import('@/pages/admin/ICAutoMergeRules').then((module) => {
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
    return <div>Error loading auto-merge rules</div>;
  }

  return (
    <div className="space-y-6">
      <ContentComponent embedded={true} />
    </div>
  );
}
