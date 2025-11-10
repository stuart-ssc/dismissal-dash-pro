import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Database, Zap, ClipboardList, CheckCircle2 } from "lucide-react";

interface SchoolSetupMethodDialogProps {
  open: boolean;
  onSelectICSetup: () => void;
  onSelectManualSetup: () => void;
}

export function SchoolSetupMethodDialog({ 
  open, 
  onSelectICSetup, 
  onSelectManualSetup 
}: SchoolSetupMethodDialogProps) {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-2xl text-center">
            How would you like to set up your school?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center text-base">
            Choose the method that works best for your school
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="grid md:grid-cols-2 gap-6 mt-6">
          {/* Infinite Campus Integration Option */}
          <Card className="border-2 hover:border-primary/50 transition-all cursor-pointer group">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <Database className="h-8 w-8 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">Import from Infinite Campus</h3>
                  <p className="text-sm text-muted-foreground">Recommended</p>
                </div>
                <Zap className="h-5 w-5 text-primary" />
              </div>
              
              <p className="text-sm text-muted-foreground">
                Automatically sync students, teachers, and classes from your Infinite Campus system. 
                Set up once and keep data up-to-date.
              </p>
              
              <div className="space-y-2">
                <div className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Automatic data import</span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Real-time synchronization</span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Smart duplicate detection</span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Minimal manual entry</span>
                </div>
              </div>
              
              <Button 
                onClick={onSelectICSetup}
                className="w-full"
                size="lg"
              >
                Connect Infinite Campus
              </Button>
            </CardContent>
          </Card>

          {/* Manual Setup Option */}
          <Card className="border-2 hover:border-primary/50 transition-all cursor-pointer group">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-secondary/10 group-hover:bg-secondary/20 transition-colors">
                  <ClipboardList className="h-8 w-8 text-secondary-foreground" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">Manual Setup</h3>
                  <p className="text-sm text-muted-foreground">Traditional</p>
                </div>
              </div>
              
              <p className="text-sm text-muted-foreground">
                Set up your school step-by-step by manually entering information or importing CSV files.
              </p>
              
              <div className="space-y-2">
                <div className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-secondary-foreground mt-0.5 flex-shrink-0" />
                  <span>Full control over data</span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-secondary-foreground mt-0.5 flex-shrink-0" />
                  <span>CSV import available</span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-secondary-foreground mt-0.5 flex-shrink-0" />
                  <span>No external connections</span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-secondary-foreground mt-0.5 flex-shrink-0" />
                  <span>Setup at your own pace</span>
                </div>
              </div>
              
              <Button 
                onClick={onSelectManualSetup}
                variant="outline"
                className="w-full"
                size="lg"
              >
                Setup Manually
              </Button>
            </CardContent>
          </Card>
        </div>
        
        <p className="text-xs text-center text-muted-foreground mt-6">
          You can always change your setup method later in Settings
        </p>
      </AlertDialogContent>
    </AlertDialog>
  );
}
