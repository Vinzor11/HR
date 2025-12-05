import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from './ui/sheet';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { User, Briefcase, Phone, Users, GraduationCap, BriefcaseBusiness, Award, ArrowRight } from 'lucide-react';
import { router } from '@inertiajs/react';

interface Employee {
  id: string;
  surname: string;
  first_name: string;
  middle_name?: string;
  name_extension?: string;
  status: string;
  employment_status?: string;
  employee_type: string;
  date_hired?: string;
  date_regularized?: string;
  department?: { faculty_name?: string; name?: string; type?: string };
  position?: { pos_name?: string; name?: string };
  mobile_no?: string;
  email_address?: string;
  birth_date?: string;
  birth_place?: string;
  sex?: string;
  civil_status?: string;
  [key: string]: any;
}

interface EmployeeDetailDrawerProps {
  employee: Employee | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Helper to get nested value
const getNestedValue = (obj: any, path: string): any => {
  if (!obj || typeof obj !== 'object') return null;
  return path.split('.').reduce((acc, key) => {
    if (acc === null || acc === undefined || typeof acc !== 'object') return null;
    return acc[key] !== undefined ? acc[key] : null;
  }, obj);
};

// Format date
const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return '-';
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
};

// Status Badge
const StatusBadge = ({ status }: { status: string }) => {
  const statusConfig: Record<string, { variant: 'default' | 'destructive' | 'secondary' | 'outline' }> = {
    active: { variant: 'default' },
    inactive: { variant: 'destructive' },
    'on-leave': { variant: 'secondary' },
  };
  const config = statusConfig[status.toLowerCase()] || { variant: 'outline' as const };
  return (
    <Badge variant={config.variant} className="capitalize">
      {status.replace('-', ' ')}
    </Badge>
  );
};

export const EmployeeDetailDrawer = ({
  employee,
  open,
  onOpenChange,
}: EmployeeDetailDrawerProps) => {
  if (!employee) return null;

  const fullName = [
    employee.surname,
    employee.first_name,
    employee.middle_name,
    employee.name_extension,
  ]
    .filter(Boolean)
    .join(' ');

  const handleViewMore = () => {
    onOpenChange(false);
    router.visit(route('employees.profile', employee.id));
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto p-0">
        <SheetHeader className="border-b border-border p-6 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-1">
              <SheetTitle className="text-2xl font-bold text-foreground">{fullName}</SheetTitle>
              <SheetDescription className="text-muted-foreground">
                Employee ID: {employee.id}
              </SheetDescription>
            </div>
            <Button
              variant="default"
              size="sm"
              onClick={handleViewMore}
              className="gap-2 shrink-0"
            >
              View More
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        <div className="p-6 space-y-8">
          {/* Basic Information */}
          <section className="space-y-6">
            <div className="flex items-center gap-3 pb-2 border-b border-border">
              <Briefcase className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">Basic Information</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</label>
                <div className="mt-1">
                  <StatusBadge status={employee.status} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Employee Type</label>
                <p className="mt-1 text-sm text-foreground">{employee.employee_type || '-'}</p>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Employment Status</label>
                <p className="mt-1 text-sm text-foreground">{employee.employment_status || '-'}</p>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Date Hired</label>
                <p className="mt-1 text-sm text-foreground">{formatDate(employee.date_hired)}</p>
              </div>
              {employee.date_regularized && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Date Regularized</label>
                  <p className="mt-1 text-sm text-foreground">{formatDate(employee.date_regularized)}</p>
                </div>
              )}
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {employee.department?.type === 'administrative' ? 'Office' : 'Department'}
                </label>
                <p className="mt-1 text-sm text-foreground">
                  {employee.department?.faculty_name || employee.department?.name || '-'}
                </p>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Position</label>
                <p className="mt-1 text-sm text-foreground">
                  {employee.position?.pos_name || employee.position?.name || '-'}
                </p>
              </div>
            </div>
          </section>

          {/* Personal Details */}
          <section className="space-y-6">
            <div className="flex items-center gap-3 pb-2 border-b border-border">
              <User className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">Personal Details</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Birth Date</label>
                <p className="mt-1 text-sm text-foreground">{formatDate(employee.birth_date)}</p>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Birth Place</label>
                <p className="mt-1 text-sm text-foreground">{employee.birth_place || '-'}</p>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sex</label>
                <p className="mt-1 text-sm text-foreground">{employee.sex || '-'}</p>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Civil Status</label>
                <p className="mt-1 text-sm text-foreground">{employee.civil_status || '-'}</p>
              </div>
            </div>
          </section>

          {/* Contact Information */}
          <section className="space-y-6">
            <div className="flex items-center gap-3 pb-2 border-b border-border">
              <Phone className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">Contact Information</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Mobile</label>
                <p className="mt-1 text-sm text-foreground">{employee.mobile_no || '-'}</p>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Email</label>
                <p className="mt-1 text-sm text-foreground">{employee.email_address || '-'}</p>
              </div>
            </div>
          </section>

          {/* Government IDs */}
          {(employee.gsis_id_no || employee.pagibig_id_no || employee.philhealth_no || employee.sss_no || employee.tin_no) && (
            <section className="space-y-6">
              <div className="flex items-center gap-3 pb-2 border-b border-border">
                <Award className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">Government IDs</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {employee.gsis_id_no && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">GSIS</label>
                    <p className="mt-1 text-sm text-foreground">{employee.gsis_id_no}</p>
                  </div>
                )}
                {employee.pagibig_id_no && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">PAGIBIG</label>
                    <p className="mt-1 text-sm text-foreground">{employee.pagibig_id_no}</p>
                  </div>
                )}
                {employee.philhealth_no && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">PhilHealth</label>
                    <p className="mt-1 text-sm text-foreground">{employee.philhealth_no}</p>
                  </div>
                )}
                {employee.sss_no && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">SSS</label>
                    <p className="mt-1 text-sm text-foreground">{employee.sss_no}</p>
                  </div>
                )}
                {employee.tin_no && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">TIN</label>
                    <p className="mt-1 text-sm text-foreground">{employee.tin_no}</p>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Family Background */}
          {employee.family_background && Array.isArray(employee.family_background) && employee.family_background.length > 0 && (
            <section className="space-y-6">
              <div className="flex items-center gap-3 pb-2 border-b border-border">
                <Users className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">Family Background</h3>
              </div>
              <div className="space-y-4">
                {employee.family_background.map((member: any, idx: number) => (
                  <div key={idx} className="border border-border rounded-lg p-4 bg-card shadow-sm">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Relation</label>
                        <p className="mt-1 text-sm text-foreground">{member.relation || '-'}</p>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Name</label>
                        <p className="mt-1 text-sm text-foreground">
                          {[member.surname, member.first_name, member.middle_name]
                            .filter(Boolean)
                            .join(' ') || '-'}
                        </p>
                      </div>
                      {member.occupation && (
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Occupation</label>
                          <p className="mt-1 text-sm text-foreground">{member.occupation}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Education */}
          {employee.educational_background && Array.isArray(employee.educational_background) && employee.educational_background.length > 0 && (
            <section className="space-y-6">
              <div className="flex items-center gap-3 pb-2 border-b border-border">
                <GraduationCap className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">Education</h3>
              </div>
              <div className="space-y-4">
                {employee.educational_background.map((edu: any, idx: number) => (
                  <div key={idx} className="border border-border rounded-lg p-4 bg-card shadow-sm">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Level</label>
                        <p className="mt-1 text-sm text-foreground">{edu.level || '-'}</p>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">School</label>
                        <p className="mt-1 text-sm text-foreground">{edu.school_name || '-'}</p>
                      </div>
                      {edu.degree_course && (
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Degree/Course</label>
                          <p className="mt-1 text-sm text-foreground">{edu.degree_course}</p>
                        </div>
                      )}
                      {edu.year_graduated && (
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Year Graduated</label>
                          <p className="mt-1 text-sm text-foreground">{edu.year_graduated}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Work Experience */}
          {employee.work_experience && Array.isArray(employee.work_experience) && employee.work_experience.length > 0 && (
            <section className="space-y-6">
              <div className="flex items-center gap-3 pb-2 border-b border-border">
                <BriefcaseBusiness className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">Work Experience</h3>
              </div>
              <div className="space-y-4">
                {employee.work_experience.map((exp: any, idx: number) => (
                  <div key={idx} className="border border-border rounded-lg p-4 bg-card shadow-sm">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Position</label>
                        <p className="mt-1 text-sm text-foreground">{exp.position_title || '-'}</p>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Company</label>
                        <p className="mt-1 text-sm text-foreground">{exp.company_name || '-'}</p>
                      </div>
                      {exp.date_from && (
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">From</label>
                          <p className="mt-1 text-sm text-foreground">{formatDate(exp.date_from)}</p>
                        </div>
                      )}
                      {exp.date_to && (
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">To</label>
                          <p className="mt-1 text-sm text-foreground">{formatDate(exp.date_to)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

