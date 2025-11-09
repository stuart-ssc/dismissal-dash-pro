import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";

interface MergePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  merge: any;
  existingRecord: any;
  onConfirm: () => void;
  isProcessing?: boolean;
}

export const MergePreviewDialog = ({
  open,
  onOpenChange,
  merge,
  existingRecord,
  onConfirm,
  isProcessing = false
}: MergePreviewDialogProps) => {
  if (!merge) return null;

  const icData = merge.ic_data;
  const recordType = merge.record_type;

  const getMergedValue = (icValue: any, existingValue: any) => {
    // IC data takes priority if it exists and is different
    if (icValue && icValue !== existingValue) {
      return { value: icValue, changed: true };
    }
    return { value: existingValue || icValue, changed: false };
  };

  const firstName = getMergedValue(icData.firstName, existingRecord?.first_name);
  const lastName = getMergedValue(icData.lastName, existingRecord?.last_name);
  const email = recordType === 'teacher' ? getMergedValue(icData.email, existingRecord?.email) : null;
  const studentId = recordType === 'student' ? getMergedValue(icData.studentId, existingRecord?.student_id) : null;
  const gradeLevel = recordType === 'student' ? getMergedValue(icData.gradeLevel, existingRecord?.grade_level) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-primary" />
            Merge Preview
          </DialogTitle>
          <DialogDescription>
            Review the final merged record before confirming. Fields with new data from IC are highlighted.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Merge Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Merge Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Record Type:</span>
                <Badge>{recordType}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Match Confidence:</span>
                <Badge variant="outline" className={
                  merge.match_confidence >= 90 ? "bg-green-100 text-green-800" :
                  merge.match_confidence >= 70 ? "bg-blue-100 text-blue-800" :
                  "bg-amber-100 text-amber-800"
                }>
                  {Math.round(merge.match_confidence || 0)}%
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Match Criteria:</span>
                <span className="text-sm">{merge.match_criteria}</span>
              </div>
            </CardContent>
          </Card>

          {/* Field-by-Field Comparison */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Final Merged Record
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Current Value */}
              <Card className="bg-muted/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-xs text-muted-foreground">Current Value</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <FieldDisplay label="First Name" value={existingRecord?.first_name} />
                  <FieldDisplay label="Last Name" value={existingRecord?.last_name} />
                  {email && <FieldDisplay label="Email" value={existingRecord?.email} />}
                  {studentId && <FieldDisplay label="Student ID" value={existingRecord?.student_id} />}
                  {gradeLevel && <FieldDisplay label="Grade Level" value={existingRecord?.grade_level} />}
                </CardContent>
              </Card>

              {/* Arrow */}
              <div className="flex items-center justify-center">
                <ArrowRight className="h-8 w-8 text-muted-foreground" />
              </div>

              {/* Merged Value */}
              <Card className="bg-primary/5 border-primary/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-xs text-primary">After Merge</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <FieldDisplay label="First Name" value={firstName.value} changed={firstName.changed} />
                  <FieldDisplay label="Last Name" value={lastName.value} changed={lastName.changed} />
                  {email && <FieldDisplay label="Email" value={email.value} changed={email.changed} />}
                  {studentId && <FieldDisplay label="Student ID" value={studentId.value} changed={studentId.changed} />}
                  {gradeLevel && <FieldDisplay label="Grade Level" value={gradeLevel.value} changed={gradeLevel.changed} />}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Additional Info */}
          <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
            <CardContent className="pt-4">
              <div className="flex gap-2 text-sm">
                <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <p className="text-blue-900 dark:text-blue-100 font-medium">What happens after merge:</p>
                  <ul className="text-blue-800 dark:text-blue-200 text-xs space-y-1 list-disc list-inside">
                    <li>Existing record will be updated with IC data</li>
                    <li>IC External ID will be linked for future syncs</li>
                    <li>All relationships (classes, groups) will be preserved</li>
                    <li>This action can be reviewed in the Merge Audit Log</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={onConfirm}
              disabled={isProcessing}
            >
              {isProcessing ? "Processing..." : "Confirm Merge"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface FieldDisplayProps {
  label: string;
  value: any;
  changed?: boolean;
}

const FieldDisplay = ({ label, value, changed = false }: FieldDisplayProps) => (
  <div className={changed ? "bg-green-50 dark:bg-green-950/20 border-l-2 border-green-500 pl-2 py-1" : ""}>
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className="font-medium flex items-center gap-2">
      {value || <span className="text-muted-foreground">N/A</span>}
      {changed && <Badge variant="outline" className="text-xs bg-green-100 text-green-800 border-green-200">Updated</Badge>}
    </div>
  </div>
);
