import { useEffect, useState } from 'react';
import { Loader2, FileText } from 'lucide-react';

interface ICAuditTabProps {
  schoolId: number | null;
}

export function ICAuditTab({ schoolId }: ICAuditTabProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [ContentComponent, setContentComponent] = useState<any>(null);

  useEffect(() => {
    // Dynamically import the full ICMergeAudit component
    import('@/pages/admin/ICMergeAudit').then((module) => {
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
    return <div>Error loading audit log</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="h-6 w-6" />
          Merge Audit Log
        </h2>
        <p className="text-muted-foreground">Complete history of merge decisions</p>
      </div>
      <ContentComponent embedded={true} />
    </div>
  );
}
