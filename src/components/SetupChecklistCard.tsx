import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { CheckCircle2, Circle } from "lucide-react";
import type { SchoolSetupStatuses } from "@/hooks/useSchoolSetupStatus";

interface Props {
  statuses: SchoolSetupStatuses;
}

const Row = ({ done, children }: { done: boolean; children: React.ReactNode }) => (
  <li className="flex items-start gap-3">
    {done ? (
      <CheckCircle2 className="h-5 w-5 text-primary" aria-hidden />
    ) : (
      <Circle className="h-5 w-5 text-muted-foreground" aria-hidden />
    )}
    <div className="space-y-1 text-sm">{children}</div>
  </li>
);

export default function SetupChecklistCard({ statuses }: Props) {
  const peopleReady = statuses.hasTeacher && statuses.hasStudent;
  return (
    <section aria-label="Getting your school ready">
      <Card className="shadow-elevated border-0 bg-card/80 backdrop-blur">
        <CardHeader>
          <CardTitle>Getting your school ready</CardTitle>
          <CardDescription>Complete the steps below to start using the system.</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3">
            <Row done={statuses.schoolUpdated}>
              <div>
                <div>
                  <Button asChild variant="link" className="p-0 h-auto">
                    <Link to="/dashboard/settings">1) Confirm details for your school</Link>
                  </Button>
                </div>
              </div>
            </Row>
            <Row done={statuses.transportationReady}>
              <div>
                <div>
                  <Button asChild variant="link" className="p-0 h-auto">
                    <Link to="/dashboard/transportation">2) Establish Transportation Options</Link>
                  </Button>
                </div>
              </div>
            </Row>
            <Row done={peopleReady}>
              <div>
                <div className="flex flex-wrap gap-2 items-center">
                  <Button asChild variant="link" className="p-0 h-auto">
                    <Link to="/dashboard/people">3) Add Students, Teachers, and other School Admins</Link>
                  </Button>
                  <span className="text-muted-foreground">or</span>
                  <Button asChild variant="link" className="p-0 h-auto">
                    <Link to="/dashboard/import">Import them</Link>
                  </Button>
                </div>
                {!peopleReady && (
                  <p className="text-xs text-muted-foreground mt-1">Need at least 1 teacher and 1 student.</p>
                )}
              </div>
            </Row>
            <Row done={statuses.hasClass}>
              <div>
                <div>
                  <Button asChild variant="link" className="p-0 h-auto">
                    <Link to="/dashboard/classes">4) Create at least one class</Link>
                  </Button>
                </div>
              </div>
            </Row>
          </ol>
        </CardContent>
      </Card>
    </section>
  );
}
