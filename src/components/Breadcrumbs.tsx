import { Link, useLocation } from "react-router-dom";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Home } from "lucide-react";

const routeNameMap: Record<string, string> = {
  dashboard: "Dashboard",
  "district-dash": "Dashboard",
  people: "People",
  dismissals: "Dismissals",
  classes: "Classes",
  coverage: "Coverage",
  absences: "Absences",
  manage: "Manage People",
  "groups-teams": "Groups & Teams",
  plans: "Dismissal Plans",
  transportation: "Transportation",
  "special-runs": "Special Runs",
  reports: "Reports",
  settings: "Settings",
  integrations: "Integrations",
  "ic-integrations": "Infinite Campus",
  "infinite-campus": "Infinite Campus",
  help: "Help & Support",
};

export function Breadcrumbs() {
  const location = useLocation();
  const pathnames = location.pathname.split("/").filter((x) => x);

  // Don't show breadcrumbs on root pages
  if (pathnames.length <= 1) return null;

  return (
    <div className="px-4 md:px-6 py-2 md:py-3 border-b bg-card/30 backdrop-blur-sm max-w-full overflow-x-hidden">
      <Breadcrumb>
        <BreadcrumbList className="text-sm md:text-base">
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/dashboard">
                <Home className="h-4 w-4" />
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          
          {pathnames.map((pathname, index) => {
            const routeTo = `/${pathnames.slice(0, index + 1).join("/")}`;
            const isLast = index === pathnames.length - 1;
            const name = routeNameMap[pathname] || pathname.charAt(0).toUpperCase() + pathname.slice(1);

            return (
              <div key={routeTo} className="flex items-center">
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  {isLast ? (
                    <BreadcrumbPage className="truncate max-w-[150px] md:max-w-none">{name}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink asChild>
                      <Link to={routeTo} className="truncate max-w-[150px] md:max-w-none block">{name}</Link>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </div>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
}
