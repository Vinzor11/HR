import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  User,
  Briefcase,
  Phone,
  Mail,
  MapPin,
  Award,
  GraduationCap,
  BriefcaseBusiness,
  Users,
  FileText,
  BookOpen,
  CreditCard,
  Home,
  UserCircle,
  Baby,
  HeartHandshake,
  CalendarDays,
} from 'lucide-react';

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
  birth_date?: string;
  birth_place?: string;
  sex?: string;
  civil_status?: string;
  height_m?: string;
  weight_kg?: string;
  blood_type?: string;
  mobile_no?: string;
  telephone_no?: string;
  email_address?: string;
  gsis_id_no?: string;
  pagibig_id_no?: string;
  philhealth_no?: string;
  sss_no?: string;
  tin_no?: string;
  agency_employee_no?: string;
  citizenship?: string;
  dual_citizenship?: boolean;
  citizenship_type?: string;
  dual_citizenship_country?: string;
  res_house_no?: string;
  res_street?: string;
  res_subdivision?: string;
  res_barangay?: string;
  res_city?: string;
  res_province?: string;
  res_zip_code?: string;
  perm_house_no?: string;
  perm_street?: string;
  perm_subdivision?: string;
  perm_barangay?: string;
  perm_city?: string;
  perm_province?: string;
  perm_zip_code?: string;
  government_issued_id?: string;
  id_number?: string;
  id_date_issued?: string;
  id_place_of_issue?: string;
  indigenous_group?: string;
  pwd_id_no?: string;
  solo_parent_id_no?: string;
  family_background?: any[];
  children?: any[];
  educational_background?: any[];
  civil_service_eligibility?: any[];
  work_experience?: any[];
  voluntary_work?: any[];
  learning_development?: any[];
  references?: any[];
  other_information?: any;
  questionnaire?: any[];
  [key: string]: any;
}

interface ProfilePageProps {
  employee: Employee;
}

const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return 'N/A';
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

const formatAddress = (employee: Employee, type: 'res' | 'perm'): string => {
  const parts = [];
  if (type === 'res') {
    if (employee.res_house_no) parts.push(employee.res_house_no);
    if (employee.res_street) parts.push(employee.res_street);
    if (employee.res_subdivision) parts.push(employee.res_subdivision);
    if (employee.res_barangay) parts.push(employee.res_barangay);
    if (employee.res_city) parts.push(employee.res_city);
    if (employee.res_province) parts.push(employee.res_province);
    if (employee.res_zip_code) parts.push(employee.res_zip_code);
  } else {
    if (employee.perm_house_no) parts.push(employee.perm_house_no);
    if (employee.perm_street) parts.push(employee.perm_street);
    if (employee.perm_subdivision) parts.push(employee.perm_subdivision);
    if (employee.perm_barangay) parts.push(employee.perm_barangay);
    if (employee.perm_city) parts.push(employee.perm_city);
    if (employee.perm_province) parts.push(employee.perm_province);
    if (employee.perm_zip_code) parts.push(employee.perm_zip_code);
  }
  return parts.length > 0 ? parts.join(', ') : 'N/A';
};

const StatusBadge = ({ status }: { status: string }) => {
  const statusConfig: Record<string, { variant: 'default' | 'destructive' | 'secondary' | 'outline'; className?: string }> = {
    active: { variant: 'default', className: 'bg-green-500 hover:bg-green-600' },
    inactive: { variant: 'destructive' },
    'on-leave': { variant: 'secondary', className: 'bg-yellow-500 hover:bg-yellow-600' },
  };
  const config = statusConfig[status.toLowerCase()] || { variant: 'outline' as const };
  return (
    <Badge variant={config.variant} className={`capitalize ${config.className || ''}`}>
      {status.replace('-', ' ')}
    </Badge>
  );
};

export default function EmployeeProfile({ employee }: ProfilePageProps) {
  const fullName = [
    employee.surname,
    employee.first_name,
    employee.middle_name,
    employee.name_extension,
  ]
    .filter(Boolean)
    .join(' ');

  const breadcrumbs = [
    { title: 'Employees', href: '/employees' },
    { title: fullName, href: '#' },
  ];

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title={`${fullName} - Employee Profile`} />
      
      <div className="space-y-8 pb-8">
        {/* Header Section */}
        <div className="relative">
          {/* Background Banner with improved gradient */}
          <div className="h-56 bg-gradient-to-br from-green-600 via-emerald-700 to-teal-800 rounded-t-xl overflow-hidden relative">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                backgroundSize: '60px 60px'
              }}></div>
            </div>
          </div>
          
          {/* Profile Card with improved styling */}
          <div className="relative -mt-32 px-4 sm:px-6 lg:px-8">
            <Card className="shadow-2xl border-0 overflow-hidden">
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 h-2"></div>
              <CardContent className="pt-8 pb-10 px-6 sm:px-8">
                <div className="flex flex-col md:flex-row gap-8">
                  {/* Avatar Section - Enhanced */}
                  <div className="flex-shrink-0 flex flex-col items-center md:items-start">
                    <div className="w-36 h-36 rounded-2xl bg-gradient-to-br from-green-500 via-emerald-600 to-teal-700 flex items-center justify-center text-white text-5xl font-bold shadow-2xl border-4 border-background ring-4 ring-green-100 dark:ring-green-900/50">
                      {employee.first_name?.[0]?.toUpperCase() || 'E'}
                      {employee.surname?.[0]?.toUpperCase() || ''}
                    </div>
                  </div>

                  {/* Name and Basic Info - Improved layout */}
                  <div className="flex-1 space-y-5">
                    <div>
                      <div className="flex flex-wrap items-center gap-3 mb-3">
                        <h1 className="text-4xl font-bold text-foreground tracking-tight">{fullName}</h1>
                        <StatusBadge status={employee.status} />
                      </div>
                      <div className="space-y-1">
                        <p className="text-foreground text-xl font-semibold">
                          {employee.position?.pos_name || employee.position?.name || 'No Position'}
                        </p>
                        <p className="text-muted-foreground text-base">
                          {employee.department?.faculty_name || employee.department?.name || (employee.department?.type === 'administrative' ? 'No Office' : 'No Department')}
                        </p>
                      </div>
                    </div>

                    {/* Quick Info Grid - Enhanced */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border/50">
                        <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                          <UserCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">Employee ID</p>
                          <p className="text-sm font-semibold text-foreground">{employee.id}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border/50">
                        <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                          <Briefcase className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">Type</p>
                          <p className="text-sm font-semibold text-foreground">{employee.employee_type || 'N/A'}</p>
                        </div>
                      </div>
                      {employee.employment_status && (
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border/50">
                          <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                            <BriefcaseBusiness className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Employment Status</p>
                            <p className="text-sm font-semibold text-foreground">{employee.employment_status}</p>
                          </div>
                        </div>
                      )}
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border/50">
                        <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                          <CalendarDays className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">Date Hired</p>
                          <p className="text-sm font-semibold text-foreground">{formatDate(employee.date_hired)}</p>
                        </div>
                      </div>
                      {employee.date_regularized && (
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border/50">
                          <div className="p-2 rounded-lg bg-rose-100 dark:bg-rose-900/30">
                            <CalendarDays className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Date Regularized</p>
                            <p className="text-sm font-semibold text-foreground">{formatDate(employee.date_regularized)}</p>
                          </div>
                        </div>
                      )}
                      {employee.email_address && (
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border/50">
                          <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                            <Mail className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Email</p>
                            <p className="text-sm font-semibold text-foreground truncate">{employee.email_address}</p>
                          </div>
                        </div>
                      )}
                      {employee.mobile_no && (
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border/50">
                          <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                            <Phone className="h-5 w-5 text-green-600 dark:text-green-400" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Mobile</p>
                            <p className="text-sm font-semibold text-foreground">{employee.mobile_no}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Main Content Grid - Improved spacing */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 px-4 sm:px-6 lg:px-8">
          {/* Left Column - Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal Information */}
            <Card className="shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                    <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <CardTitle className="text-xl">Personal Information</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Birth Date</label>
                    <p className="mt-1 text-sm font-medium">{formatDate(employee.birth_date)}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Birth Place</label>
                    <p className="mt-1 text-sm font-medium">{employee.birth_place || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sex</label>
                    <p className="mt-1 text-sm font-medium">{employee.sex || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Civil Status</label>
                    <p className="mt-1 text-sm font-medium">{employee.civil_status || 'N/A'}</p>
                  </div>
                  {(employee.height_m || employee.weight_kg || employee.blood_type) && (
                    <>
                      {employee.height_m && (
                        <div>
                          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Height</label>
                          <p className="mt-1 text-sm font-medium">{employee.height_m} m</p>
                        </div>
                      )}
                      {employee.weight_kg && (
                        <div>
                          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Weight</label>
                          <p className="mt-1 text-sm font-medium">{employee.weight_kg} kg</p>
                        </div>
                      )}
                      {employee.blood_type && (
                        <div>
                          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Blood Type</label>
                          <p className="mt-1 text-sm font-medium">{employee.blood_type}</p>
                        </div>
                      )}
                    </>
                  )}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Citizenship</label>
                    <p className="mt-1 text-sm font-medium">
                      {employee.citizenship || 'N/A'}
                      {employee.dual_citizenship && employee.dual_citizenship_country && (
                        <span className="text-muted-foreground ml-2">
                          (Dual: {employee.dual_citizenship_country})
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card className="shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                    <Phone className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <CardTitle className="text-xl">Contact Information</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {employee.mobile_no && (
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Mobile Number</label>
                      <p className="mt-1 text-sm font-medium">{employee.mobile_no}</p>
                    </div>
                  )}
                  {employee.telephone_no && (
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Telephone Number</label>
                      <p className="mt-1 text-sm font-medium">{employee.telephone_no}</p>
                    </div>
                  )}
                  {employee.email_address && (
                    <div className="md:col-span-2">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Email Address</label>
                      <p className="mt-1 text-sm font-medium">{employee.email_address}</p>
                    </div>
                  )}
                </div>

                <Separator />

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2 mb-2">
                      <Home className="h-4 w-4" />
                      Residential Address
                    </label>
                    <p className="text-sm font-medium">{formatAddress(employee, 'res')}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2 mb-2">
                      <MapPin className="h-4 w-4" />
                      Permanent Address
                    </label>
                    <p className="text-sm font-medium">{formatAddress(employee, 'perm')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Government IDs */}
            {(employee.gsis_id_no || employee.pagibig_id_no || employee.philhealth_no || employee.sss_no || employee.tin_no || employee.agency_employee_no) && (
              <Card className="shadow-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                      <CreditCard className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <CardTitle className="text-xl">Government IDs & Numbers</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {employee.agency_employee_no && (
                      <div>
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Agency Employee No.</label>
                        <p className="mt-1 text-sm font-medium">{employee.agency_employee_no}</p>
                      </div>
                    )}
                    {employee.gsis_id_no && (
                      <div>
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">GSIS ID No.</label>
                        <p className="mt-1 text-sm font-medium">{employee.gsis_id_no}</p>
                      </div>
                    )}
                    {employee.pagibig_id_no && (
                      <div>
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">PAG-IBIG ID No.</label>
                        <p className="mt-1 text-sm font-medium">{employee.pagibig_id_no}</p>
                      </div>
                    )}
                    {employee.philhealth_no && (
                      <div>
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">PhilHealth No.</label>
                        <p className="mt-1 text-sm font-medium">{employee.philhealth_no}</p>
                      </div>
                    )}
                    {employee.sss_no && (
                      <div>
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">SSS No.</label>
                        <p className="mt-1 text-sm font-medium">{employee.sss_no}</p>
                      </div>
                    )}
                    {employee.tin_no && (
                      <div>
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">TIN No.</label>
                        <p className="mt-1 text-sm font-medium">{employee.tin_no}</p>
                      </div>
                    )}
                    {employee.government_issued_id && (
                      <div>
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Government Issued ID</label>
                        <p className="mt-1 text-sm font-medium">{employee.government_issued_id}</p>
                        {employee.id_number && (
                          <p className="mt-1 text-xs text-muted-foreground">ID No: {employee.id_number}</p>
                        )}
                      </div>
                    )}
                    {employee.pwd_id_no && (
                      <div>
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">PWD ID No.</label>
                        <p className="mt-1 text-sm font-medium">{employee.pwd_id_no}</p>
                      </div>
                    )}
                    {employee.solo_parent_id_no && (
                      <div>
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Solo Parent ID No.</label>
                        <p className="mt-1 text-sm font-medium">{employee.solo_parent_id_no}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Family Background */}
            {employee.family_background && employee.family_background.length > 0 && (
              <Card className="shadow-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-pink-100 dark:bg-pink-900/30">
                      <Users className="h-5 w-5 text-pink-600 dark:text-pink-400" />
                    </div>
                    <CardTitle className="text-xl">Family Background</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-5">
                    {employee.family_background.map((member: any, idx: number) => {
                      const name = [member.surname, member.first_name, member.middle_name]
                        .filter(Boolean)
                        .join(' ');
                      if (!name && !member.occupation) return null;
                      
                      return (
                        <div key={idx} className="border border-border rounded-lg p-4 bg-muted/30">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Relation</label>
                              <p className="mt-1 text-sm font-medium">{member.relation || 'N/A'}</p>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Name</label>
                              <p className="mt-1 text-sm font-medium">{name || 'N/A'}</p>
                            </div>
                            {member.occupation && (
                              <div>
                                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Occupation</label>
                                <p className="mt-1 text-sm font-medium">{member.occupation}</p>
                              </div>
                            )}
                            {member.employer && (
                              <div>
                                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Employer</label>
                                <p className="mt-1 text-sm font-medium">{member.employer}</p>
                              </div>
                            )}
                            {member.business_address && (
                              <div className="md:col-span-2">
                                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Business Address</label>
                                <p className="mt-1 text-sm font-medium">{member.business_address}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Children */}
            {employee.children && employee.children.length > 0 && (
              <Card className="shadow-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-rose-100 dark:bg-rose-900/30">
                      <Baby className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                    </div>
                    <CardTitle className="text-xl">Children</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    {employee.children.map((child: any, idx: number) => {
                      // Use full_name if available, otherwise construct from parts
                      const name = child.full_name || [child.surname, child.first_name, child.middle_name]
                        .filter(Boolean)
                        .join(' ');
                      return (
                        <div key={idx} className="flex items-center justify-between p-3 border border-border rounded-lg bg-muted/30">
                          <div>
                            <p className="font-medium">{name || 'Unnamed'}</p>
                            {child.birth_date && (
                              <p className="text-sm text-muted-foreground">
                                Born: {formatDate(child.birth_date)}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Educational Background */}
            {employee.educational_background && employee.educational_background.length > 0 && (
              <Card className="shadow-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                      <GraduationCap className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <CardTitle className="text-xl">Educational Background</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-5">
                    {employee.educational_background.map((edu: any, idx: number) => (
                      <div key={idx} className="border-l-4 border-primary pl-4 py-2">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold text-lg">{edu.level || 'N/A'}</h4>
                            {edu.school_name && (
                              <p className="text-sm text-muted-foreground mt-1">{edu.school_name}</p>
                            )}
                            {edu.degree_course && (
                              <p className="text-sm font-medium mt-1">{edu.degree_course}</p>
                            )}
                            <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                              {edu.year_graduated && (
                                <span>Graduated: {edu.year_graduated}</span>
                              )}
                              {edu.highest_level_units_earned && (
                                <span>Units: {edu.highest_level_units_earned}</span>
                              )}
                            </div>
                            {edu.scholarship_academic_honors && (
                              <p className="text-sm text-muted-foreground mt-1">
                                Honors: {edu.scholarship_academic_honors}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Civil Service Eligibility */}
            {employee.civil_service_eligibility && employee.civil_service_eligibility.length > 0 && (
              <Card className="shadow-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                      <Award className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                    </div>
                    <CardTitle className="text-xl">Civil Service Eligibility</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    {employee.civil_service_eligibility.map((eligibility: any, idx: number) => (
                      <div key={idx} className="flex items-start gap-3 p-3 border border-border rounded-lg bg-muted/30">
                        <Award className="h-5 w-5 text-primary mt-0.5" />
                        <div className="flex-1">
                          <p className="font-medium">{eligibility.career_service || 'N/A'}</p>
                          <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
                            {eligibility.rating && <span>Rating: {eligibility.rating}</span>}
                            {eligibility.date_of_examination && (
                              <span>Date: {formatDate(eligibility.date_of_examination)}</span>
                            )}
                            {eligibility.place_of_examination && (
                              <span>Place: {eligibility.place_of_examination}</span>
                            )}
                          </div>
                          {eligibility.license_number && (
                            <p className="text-sm text-muted-foreground mt-1">
                              License No: {eligibility.license_number}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Work Experience */}
            {employee.work_experience && employee.work_experience.length > 0 && (
              <Card className="shadow-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-teal-100 dark:bg-teal-900/30">
                      <BriefcaseBusiness className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                    </div>
                    <CardTitle className="text-xl">Work Experience</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-5">
                    {employee.work_experience.map((exp: any, idx: number) => (
                      <div key={idx} className="border-l-4 border-primary pl-4 py-3">
                        <h4 className="font-semibold text-lg">{exp.position_title || 'N/A'}</h4>
                        <p className="text-sm font-medium text-primary mt-1">{exp.company_name || 'N/A'}</p>
                        <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                          {exp.date_from && (
                            <span>From: {formatDate(exp.date_from)}</span>
                          )}
                          {exp.date_to && (
                            <span>To: {formatDate(exp.date_to)}</span>
                          )}
                          {!exp.date_to && <span className="text-green-600 font-medium">Present</span>}
                        </div>
                        {exp.monthly_salary && (
                          <p className="text-sm text-muted-foreground mt-1">
                            Salary: ₱{parseFloat(exp.monthly_salary).toLocaleString()}/month
                          </p>
                        )}
                        {exp.salary_job_pay_grade && (
                          <p className="text-sm text-muted-foreground">
                            Pay Grade: {exp.salary_job_pay_grade}
                          </p>
                        )}
                        {exp.status_of_appointment && (
                          <p className="text-sm text-muted-foreground">
                            Status: {exp.status_of_appointment}
                          </p>
                        )}
                        {exp.is_government_service !== undefined && (
                          <Badge variant="outline" className="mt-2">
                            {exp.is_government_service ? 'Government Service' : 'Private Service'}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Voluntary Work */}
            {employee.voluntary_work && employee.voluntary_work.length > 0 && (
              <Card className="shadow-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                      <HeartHandshake className="h-5 w-5 text-red-600 dark:text-red-400" />
                    </div>
                    <CardTitle className="text-xl">Voluntary Work</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-5">
                    {employee.voluntary_work.map((work: any, idx: number) => (
                      <div key={idx} className="border border-border rounded-lg p-4 bg-muted/30">
                        <h4 className="font-semibold">{work.name_address_organization || 'N/A'}</h4>
                        <p className="text-sm text-muted-foreground mt-1">{work.inclusive_dates || 'N/A'}</p>
                        {work.number_of_hours && (
                          <p className="text-sm text-muted-foreground mt-1">
                            Hours: {work.number_of_hours}
                          </p>
                        )}
                        {work.position_nature_of_work && (
                          <p className="text-sm font-medium mt-1">
                            Position: {work.position_nature_of_work}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Learning and Development */}
            {employee.learning_development && employee.learning_development.length > 0 && (
              <Card className="shadow-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/30">
                      <BookOpen className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                    </div>
                    <CardTitle className="text-xl">Learning and Development</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    {employee.learning_development.map((ld: any, idx: number) => (
                      <div key={idx} className="border border-border rounded-lg p-4 bg-muted/30">
                        <h4 className="font-semibold">{ld.title_of_learning || 'N/A'}</h4>
                        <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                          {ld.inclusive_dates && <span>{ld.inclusive_dates}</span>}
                          {ld.number_of_hours && <span>{ld.number_of_hours} hours</span>}
                        </div>
                        {ld.type_of_ld && (
                          <p className="text-sm font-medium mt-1">Type: {ld.type_of_ld}</p>
                        )}
                        {ld.sponsor && (
                          <p className="text-sm text-muted-foreground mt-1">Sponsor: {ld.sponsor}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Other Information */}
            {employee.other_information && (
              <Card className="shadow-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-900/30">
                      <FileText className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                    </div>
                    <CardTitle className="text-xl">Other Information</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {employee.other_information.skill_or_hobby && (
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Skills / Hobbies</label>
                      <p className="mt-1 text-sm font-medium">{employee.other_information.skill_or_hobby}</p>
                    </div>
                  )}
                  {employee.other_information.non_academic_distinctions && (
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Non-Academic Distinctions</label>
                      <p className="mt-1 text-sm font-medium">{employee.other_information.non_academic_distinctions}</p>
                    </div>
                  )}
                  {employee.other_information.memberships && (
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Memberships</label>
                      <p className="mt-1 text-sm font-medium">{employee.other_information.memberships}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* References */}
            {employee.references && employee.references.length > 0 && (
              <Card className="shadow-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-cyan-100 dark:bg-cyan-900/30">
                      <UserCircle className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                    </div>
                    <CardTitle className="text-xl">References</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {employee.references.map((ref: any, idx: number) => (
                      <div key={idx} className="border border-border rounded-lg p-4 bg-muted/30">
                        <p className="font-semibold">{ref.fullname || 'N/A'}</p>
                        {ref.address && (
                          <p className="text-sm text-muted-foreground mt-1">{ref.address}</p>
                        )}
                        {ref.telephone_no && (
                          <p className="text-sm text-muted-foreground mt-1">Tel: {ref.telephone_no}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Quick Stats */}
          <div className="space-y-6">
            {/* Quick Stats Card */}
            <Card className="shadow-sm lg:sticky lg:top-24">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl">Quick Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Employee ID</span>
                  <span className="font-semibold">{employee.id}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <StatusBadge status={employee.status} />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Type</span>
                  <span className="font-semibold">{employee.employee_type || 'N/A'}</span>
                </div>
                <Separator />
                {employee.birth_date && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Age</span>
                      <span className="font-semibold">
                        {new Date().getFullYear() - new Date(employee.birth_date).getFullYear()} years
                      </span>
                    </div>
                    <Separator />
                  </>
                )}
                {employee.educational_background && employee.educational_background.length > 0 && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Education</span>
                      <span className="font-semibold">
                        {employee.educational_background.length} record{employee.educational_background.length > 1 ? 's' : ''}
                      </span>
                    </div>
                    <Separator />
                  </>
                )}
                {employee.work_experience && employee.work_experience.length > 0 && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Experience</span>
                      <span className="font-semibold">
                        {employee.work_experience.length} position{employee.work_experience.length > 1 ? 's' : ''}
                      </span>
                    </div>
                    <Separator />
                  </>
                )}
                {employee.children && employee.children.length > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Children</span>
                    <span className="font-semibold">{employee.children.length}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Additional Info Card */}
            {(employee.indigenous_group || employee.government_issued_id) && (
              <Card className="shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl">Additional Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {employee.indigenous_group && (
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Indigenous Group</label>
                      <p className="mt-1 text-sm font-medium">{employee.indigenous_group}</p>
                    </div>
                  )}
                  {employee.government_issued_id && (
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Government ID</label>
                      <p className="mt-1 text-sm font-medium">{employee.government_issued_id}</p>
                      {employee.id_number && (
                        <p className="mt-1 text-xs text-muted-foreground">No: {employee.id_number}</p>
                      )}
                      {employee.id_date_issued && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Issued: {formatDate(employee.id_date_issued)}
                        </p>
                      )}
                      {employee.id_place_of_issue && (
                        <p className="mt-1 text-xs text-muted-foreground">Place: {employee.id_place_of_issue}</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

