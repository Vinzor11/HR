import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from '@/components/ui/sheet';
import EmployeeDocuments from '@/components/EmployeeDocuments';
import { PromotionsPanel } from '@/components/employee/PromotionsPanel';
import { useState, useEffect, useRef } from 'react';
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
  ChevronRight,
  Landmark,
  History,
  ArrowRight,
  Building2,
  DollarSign,
  Menu,
  X,
  FileDown,
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
  salary?: number | string;
  date_hired?: string;
  date_regularized?: string;
  // Legacy fields removed - use primary_designation instead
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
  primary_designation?: {
    id: number;
    start_date?: string | null;
    end_date?: string | null;
    unit?: { id: number; name: string; unit_type?: string } | null;
    position?: { id: number; pos_name: string } | null;
    academic_rank?: { id: number; name: string } | null;
    staff_grade?: { id: number; name: string } | null;
  } | null;
  [key: string]: any;
}

interface EmploymentHistoryItem {
  id: number;
  field: string;
  field_key: string;
  old_value: string | null;
  new_value: string | null;
  action_date: string | null;
  performed_by: string | null;
}

interface ProfilePageProps {
  employee: Employee;
  employmentHistory?: EmploymentHistoryItem[];
  canEdit?: boolean;
  canPromote?: boolean;
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

const formatCurrency = (amount: number | string | undefined): string => {
  if (amount === undefined || amount === null || amount === '') return 'N/A';
  const numeric = Number(amount);
  if (Number.isNaN(numeric)) return String(amount);
  return `₱${numeric.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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

export default function EmployeeProfile({ 
  employee, 
  employmentHistory = [], 
  canEdit = false, 
  canPromote = false
}: ProfilePageProps) {
  // Safety check: ensure employee exists and has an ID
  if (!employee || !employee.id) {
    return (
      <AppLayout>
        <Card className="p-4">
          <div className="text-center py-8 text-muted-foreground">
            <p>Employee data not available. Please refresh the page.</p>
          </div>
        </Card>
      </AppLayout>
    )
  }

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

  // Get unit name from primary designation
  const unitName = employee.primary_designation?.unit?.name || 'No Unit Assigned';

  const hasGovernmentIds = Boolean(
    employee.gsis_id_no ||
      employee.pagibig_id_no ||
      employee.philhealth_no ||
      employee.sss_no ||
      employee.tin_no ||
      employee.agency_employee_no ||
      employee.government_issued_id ||
      employee.id_number ||
      employee.id_date_issued ||
      employee.id_place_of_issue ||
      employee.pwd_id_no ||
      employee.solo_parent_id_no
  );
  const hasFamilyBackground = Boolean(employee.family_background && employee.family_background.length > 0);
  const hasChildren = Boolean(employee.children && employee.children.length > 0);
  const hasEducation = Boolean(employee.educational_background && employee.educational_background.length > 0);
  const hasEligibility = Boolean(employee.civil_service_eligibility && employee.civil_service_eligibility.length > 0);
  const currentDesignationAsWork = employee.primary_designation
    ? {
        position_title: employee.primary_designation.position?.pos_name ?? 'N/A',
        company_name: 'Eastern Samar State University (Main Campus)',
        date_from: employee.primary_designation.start_date ?? employee.date_hired ?? null,
        date_to: employee.primary_designation.end_date ?? null,
        monthly_salary: employee.salary ?? null,
        status_of_appointment: employee.employment_status ?? null,
      }
    : null;
  const displayWorkExperience =
    currentDesignationAsWork != null
      ? [currentDesignationAsWork, ...(employee.work_experience ?? [])]
      : (employee.work_experience ?? []);
  const hasWorkExperience = displayWorkExperience.length > 0;
  const hasVoluntaryWork = Boolean(employee.voluntary_work && employee.voluntary_work.length > 0);
  const hasLearningDevelopment = Boolean(employee.learning_development && employee.learning_development.length > 0);
  const hasOtherInformation = Boolean(
    employee.other_information &&
      (employee.other_information.skill_or_hobby ||
        employee.other_information.non_academic_distinctions ||
        employee.other_information.memberships)
  );
  const hasReferences = Boolean(employee.references && employee.references.length > 0);
  const hasQuestionnaire = Boolean(employee.questionnaire && employee.questionnaire.length > 0 && employee.questionnaire.some((q: any) => q.answer === true || q.details));
  const hasEmploymentHistory = Boolean(employmentHistory && employmentHistory.length > 0);
  const quickLinks = [
    { id: 'personal-information', label: 'Personal Information', icon: User, show: true },
    { id: 'contact-information', label: 'Contact Information', icon: Phone, show: true },
    { id: 'assignments', label: 'Designation', icon: Building2, show: true },
    { id: 'promotions', label: 'Promotion History', icon: Award, show: true },
    { id: 'employment-history', label: 'Employment History', icon: History, show: hasEmploymentHistory },
    { id: 'government-ids', label: 'Government IDs', icon: CreditCard, show: hasGovernmentIds },
    { id: 'family-background', label: 'Family Background', icon: Users, show: hasFamilyBackground },
    { id: 'children', label: 'Children', icon: Baby, show: hasChildren },
    { id: 'education', label: 'Educational Background', icon: GraduationCap, show: hasEducation },
    { id: 'civil-service', label: 'Civil Service Eligibility', icon: Award, show: hasEligibility },
    { id: 'work-experience', label: 'Work Experience', icon: Briefcase, show: hasWorkExperience },
    { id: 'voluntary-work', label: 'Voluntary Work', icon: HeartHandshake, show: hasVoluntaryWork },
    { id: 'learning-development', label: 'Learning & Development', icon: BookOpen, show: hasLearningDevelopment },
    { id: 'other-information', label: 'Other Information', icon: FileText, show: hasOtherInformation },
    { id: 'questionnaire', label: 'Questionnaire', icon: FileText, show: hasQuestionnaire },
    { id: 'references', label: 'References', icon: UserCircle, show: hasReferences },
    { id: 'documents', label: 'Employee Documents', icon: FileText, show: true },
  ].filter((link) => link.show);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Track scroll position to toggle between fixed and relative positioning
  const quickOverviewRef = useRef<HTMLDivElement>(null);
  const [isFixed, setIsFixed] = useState(false);
  const [initialTop, setInitialTop] = useState(0);
  const [cardWidth, setCardWidth] = useState(0);
  const [mobileQuickOverviewOpen, setMobileQuickOverviewOpen] = useState(false);

  useEffect(() => {
    // Get the initial position and width of the Quick Overview
    const updateInitialPosition = () => {
      const personalInfoCard = document.getElementById('personal-information');
      if (personalInfoCard) {
        const rect = personalInfoCard.getBoundingClientRect();
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        setInitialTop(rect.top + scrollTop);
      }
      // Capture the original width of the column
      if (quickOverviewRef.current) {
        setCardWidth(quickOverviewRef.current.offsetWidth);
      }
    };

    // Small delay to ensure DOM is ready
    setTimeout(updateInitialPosition, 100);
    window.addEventListener('resize', updateInitialPosition);

    return () => window.removeEventListener('resize', updateInitialPosition);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      // Add offset for header (80px)
      const threshold = initialTop - 80;
      setIsFixed(scrollTop > threshold && threshold > 0);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Check initial state

    return () => window.removeEventListener('scroll', handleScroll);
  }, [initialTop]);

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title={`${fullName} - Employee Profile`} />
      
      <div className="space-y-8 pb-24 lg:pb-8">
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
                        <a href={`/employees/${employee.id}/export/cs-form-212`} className="inline-flex ml-auto">
                          <Button
                            size="sm"
                            type="button"
                            className="pointer-events-none bg-green-600 text-white hover:bg-green-700 focus-visible:ring-green-500/50"
                          >
                            <FileDown className="h-4 w-4 mr-2" />
                            Export CS Form 212
                          </Button>
                        </a>
                      </div>
                      <div className="space-y-1">
                        <p className="text-foreground text-xl font-semibold">
                          {employee.primary_designation?.position?.pos_name || 'No Position'}
                        </p>
                        <p className="text-muted-foreground text-base">
                          {employee.primary_designation?.unit?.name || 'No Unit Assigned'}
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
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border/50">
                      <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                        <Landmark className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Unit</p>
                        <p className="text-sm font-semibold text-foreground truncate">{unitName}</p>
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
                      {employee.salary !== undefined && employee.salary !== null && employee.salary !== '' && (
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border/50">
                          <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                            <CreditCard className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Salary</p>
                            <p className="text-sm font-semibold text-foreground">{formatCurrency(employee.salary)}</p>
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 px-4 sm:px-6 lg:px-8 items-start">
          {/* Left Column - Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal Information */}
            <Card className="shadow-sm" id="personal-information">
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
            <Card className="shadow-sm" id="contact-information">
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

            {/* Assignments Summary - Read Only */}
            <div id="assignments">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Briefcase className="h-5 w-5" />
                        Current Designation
                      </CardTitle>
                      <CardDescription>
                        Primary unit and position designation
                      </CardDescription>
                    </div>
                    <Link href={`/employees/${employee.id}/designations/manage`}>
                      <Button variant="outline" size="sm">
                        Manage Designations
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  {employee.primary_designation ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="default">
                          <Award className="h-3 w-3 mr-1" />
                          Primary
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Position</label>
                          <p className="text-sm font-medium">{employee.primary_designation.position?.pos_name || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Unit</label>
                          <p className="text-sm font-medium">{employee.primary_designation.unit?.name || 'N/A'}</p>
                        </div>
                        {employee.primary_designation.academic_rank && (
                          <div>
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Academic Rank</label>
                            <p className="text-sm font-medium">{employee.primary_designation.academic_rank.name}</p>
                          </div>
                        )}
                        {employee.primary_designation.staff_grade && (
                          <div>
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Staff Grade</label>
                            <p className="text-sm font-medium">{employee.primary_designation.staff_grade.name}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <Building2 className="h-8 w-8 mx-auto text-muted-foreground opacity-50 mb-2" />
                      <p className="text-sm text-muted-foreground">No primary designation</p>
                      <Link href={`/employees/${employee.id}/designations/manage`}>
                        <Button variant="link" size="sm">
                          Add Designation
                        </Button>
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Promotions Panel */}
            <div id="promotions">
              {employee?.id ? (
                <PromotionsPanel 
                  employeeId={employee.id} 
                  canPromote={canPromote} 
                />
              ) : (
                <Card className="p-4">
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Employee ID not available. Please refresh the page.</p>
                  </div>
                </Card>
              )}
            </div>

            {/* Employment History Timeline */}
            {hasEmploymentHistory && (
              <Card className="shadow-sm" id="employment-history">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                      <History className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">Employment History</CardTitle>
                      <CardDescription>Timeline of position, department, and salary changes</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="relative">
                    {/* Timeline line */}
                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
                    
                    <div className="space-y-6">
                      {employmentHistory.map((item, idx) => {
                        const getIcon = () => {
                          switch (item.field_key) {
                            case 'position_id':
                              return <Briefcase className="h-4 w-4" />;
                            case 'department_id':
                              return <Building2 className="h-4 w-4" />;
                            case 'salary':
                              return <DollarSign className="h-4 w-4" />;
                            default:
                              return <BriefcaseBusiness className="h-4 w-4" />;
                          }
                        };
                        
                        const getColor = () => {
                          switch (item.field_key) {
                            case 'position_id':
                              return 'bg-blue-500';
                            case 'department_id':
                              return 'bg-emerald-500';
                            case 'salary':
                              return 'bg-amber-500';
                            default:
                              return 'bg-purple-500';
                          }
                        };
                        
                        return (
                          <div key={item.id} className="relative pl-10">
                            {/* Timeline dot */}
                            <div className={`absolute left-2 w-5 h-5 rounded-full ${getColor()} flex items-center justify-center text-white`}>
                              {getIcon()}
                            </div>
                            
                            <div className="bg-muted/30 border border-border rounded-lg p-4">
                              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
                                <div>
                                  <Badge variant="outline" className="mb-2">
                                    {item.field}
                                  </Badge>
                                  <div className="flex items-center gap-2 text-sm">
                                    {item.old_value ? (
                                      <>
                                        <span className="text-muted-foreground line-through">{item.old_value}</span>
                                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                        <span className="font-medium text-foreground">{item.new_value || 'N/A'}</span>
                                      </>
                                    ) : (
                                      <span className="font-medium text-foreground">Set to: {item.new_value || 'N/A'}</span>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right text-xs text-muted-foreground">
                                  {item.action_date && (
                                    <p>{formatDate(item.action_date)}</p>
                                  )}
                                  {item.performed_by && (
                                    <p className="mt-1">by {item.performed_by}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Government IDs */}
            {hasGovernmentIds && (
              <Card className="shadow-sm" id="government-ids">
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
              <Card className="shadow-sm" id="family-background">
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
                      // Use fullname from backend, fallback to combining fields for backward compatibility
                      const name = member.fullname || [member.surname, member.first_name, member.middle_name, member.name_extension]
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
              <Card className="shadow-sm" id="children">
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
              <Card className="shadow-sm" id="education">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                      <GraduationCap className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <CardTitle className="text-xl">Educational Background</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="relative">
                    {/* Vertical line through center of circles */}
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-border -translate-x-1/2"
                      style={{ left: '24px' }}
                      aria-hidden
                    />
                    {employee.educational_background.map((edu: any, idx: number) => (
                      <div key={idx} className="relative flex gap-4 pb-8 last:pb-0">
                        {/* Green circle centered on line */}
                        <div className="relative z-10 flex w-12 shrink-0 items-center justify-center">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary">
                            <GraduationCap className="h-5 w-5 text-primary-foreground" />
                          </div>
                        </div>
                        {/* Content */}
                        <div className="flex-1 pt-0.5 min-w-0">
                          <h4 className="font-semibold text-lg">
                            {edu.degree_course || edu.level || 'N/A'}
                          </h4>
                          {edu.level && edu.degree_course && (
                            <p className="text-sm text-muted-foreground mt-1">{edu.level}</p>
                          )}
                          {edu.school_name && (
                            <p className="text-sm font-medium text-primary mt-1">{edu.school_name}</p>
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
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Civil Service Eligibility */}
            {employee.civil_service_eligibility && employee.civil_service_eligibility.length > 0 && (
              <Card className="shadow-sm" id="civil-service">
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
            {hasWorkExperience && (
              <Card className="shadow-sm" id="work-experience">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-teal-100 dark:bg-teal-900/30">
                      <BriefcaseBusiness className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                    </div>
                    <CardTitle className="text-xl">Work Experience</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="relative">
                    {/* Vertical line through center of circles */}
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-border -translate-x-1/2"
                      style={{ left: '24px' }}
                      aria-hidden
                    />
                    {displayWorkExperience.map((exp: any, idx: number) => (
                      <div key={idx} className="relative flex gap-4 pb-8 last:pb-0">
                        {/* Green circle centered on line */}
                        <div className="relative z-10 flex w-12 shrink-0 items-center justify-center">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary">
                            <BriefcaseBusiness className="h-5 w-5 text-primary-foreground" />
                          </div>
                        </div>
                        {/* Content */}
                        <div className="flex-1 pt-0.5 min-w-0">
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
                          {exp.monthly_salary != null && exp.monthly_salary !== '' && (
                            <p className="text-sm text-muted-foreground mt-1">
                              Salary: ₱{parseFloat(String(exp.monthly_salary)).toLocaleString()}/month
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
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Voluntary Work */}
            {employee.voluntary_work && employee.voluntary_work.length > 0 && (
              <Card className="shadow-sm" id="voluntary-work">
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
              <Card className="shadow-sm" id="learning-development">
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
              <Card className="shadow-sm" id="other-information">
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

            {/* Questionnaire */}
            {employee.questionnaire && employee.questionnaire.length > 0 && employee.questionnaire.some((q: any) => q.answer === true || q.details) && (
              <Card className="shadow-sm" id="questionnaire">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                      <FileText className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <CardTitle className="text-xl">Questionnaire</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    {employee.questionnaire.map((q: any, idx: number) => {
                      // Only show questions that have been answered (answer === true) or have details
                      if (q.answer !== true && !q.details) return null;

                      const getQuestionText = () => {
                        switch (q.question_number) {
                          case 341: return '34. a. Are you related by consanguinity or affinity to the appointing or recommending authority, or to the chief of bureau or office or to the person who has immediate supervision over you in the Office, Bureau or Department where you will be appointed, within the third degree?';
                          case 342: return '34. b. Are you related by consanguinity or affinity to the appointing or recommending authority, or to the chief of bureau or office or to the person who has immediate supervision over you in the Office, Bureau or Department where you will be appointed, within the fourth degree (for Local Government Unit - Career Employees)?';
                          case 351: return '35. a. Have you ever been found guilty of any administrative offense?';
                          case 352: return '35. b. Have you been criminally charged before any court?';
                          case 36: return '36. Have you ever been convicted of any crime or violation of any law, decree, ordinance or regulation by any court or tribunal?';
                          case 37: return '37. Have you ever been separated from the service in any of the following modes: resignation, retirement, dropped from the rolls, dismissal, termination, end of term, finished contract or phased out (abolition) in the public or private sector?';
                          case 381: return '38. a. Have you ever been a candidate in a national or local election held within the last year (except Barangay election)?';
                          case 382: return '38. b. Have you resigned from the government service during the three (3)-month period before the last election to promote/actively campaign for a national or local candidate?';
                          case 39: return '39. Have you acquired the status of an immigrant or permanent resident of another country?';
                          case 401: return '40. a. Are you a member of any indigenous group?';
                          case 402: return '40. b. Are you a person with disability?';
                          case 403: return '40. c. Are you a solo parent?';
                          default: return `Question ${q.question_number}`;
                        }
                      };

                      return (
                        <div key={idx} className="border border-border rounded-lg p-4 bg-muted/30">
                          <p className="font-medium text-sm mb-2">{getQuestionText()}</p>
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant={q.answer === true ? 'default' : 'secondary'}>
                              {q.answer === true ? 'Yes' : 'No'}
                            </Badge>
                            {q.date_filed && (
                              <span className="text-xs text-muted-foreground">
                                Filed: {formatDate(q.date_filed)}
                              </span>
                            )}
                            {q.status_of_case && (
                              <span className="text-xs text-muted-foreground">
                                Status: {q.status_of_case}
                              </span>
                            )}
                          </div>
                          {q.details && (
                            <div className="mt-2">
                              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Details</label>
                              <p className="mt-1 text-sm font-medium">{q.details}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* References */}
            {employee.references && employee.references.length > 0 && (
              <Card className="shadow-sm" id="references">
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

            {/* Documents */}
            <div className="col-span-1 md:col-span-2">
              <Card id="documents">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                      <FileText className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <CardTitle className="text-xl">Employee Documents</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <EmployeeDocuments employee={employee} />
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Right Column - Quick Stats (Desktop only) */}
          <div className="hidden lg:block lg:col-span-1" ref={quickOverviewRef}>
            {/* Desktop: Toggles between relative and fixed based on scroll */}
            <div
              className={`z-40 ${isFixed ? 'fixed right-8 top-16' : ''}`}
              style={isFixed && cardWidth ? { width: cardWidth } : undefined}
            >
              <Card className={`shadow-sm overflow-y-auto ${isFixed ? 'max-h-[calc(100vh-5rem)]' : ''}`}>
                <CardHeader className="pb-3 space-y-1">
                  <CardTitle className="text-xl">Quick Overview</CardTitle>
                  <CardDescription>Jump to key sections</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {quickLinks.map((link) => {
                    const Icon = link.icon;
                    return (
                      <Button
                        key={link.id}
                        variant="ghost"
                        className="w-full justify-between rounded-lg border border-transparent px-3 py-2 hover:border-border"
                        onClick={() => scrollToSection(link.id)}
                      >
                        <span className="flex items-center gap-3">
                          <Icon className="h-4 w-4 text-primary" />
                          <span className="font-medium">{link.label}</span>
                        </span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile/Tablet: Floating Action Button + Bottom Sheet for Quick Overview */}
      <div className="lg:hidden">
        <Sheet open={mobileQuickOverviewOpen} onOpenChange={setMobileQuickOverviewOpen}>
          <SheetTrigger asChild>
            <Button
              size="lg"
              className="fixed bottom-20 right-4 z-50 h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Menu className="h-6 w-6" />
              <span className="sr-only">Quick Overview</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[70vh] rounded-t-2xl p-0">
            <SheetHeader className="px-4 pt-2 pb-3 border-b border-border">
              <SheetTitle className="text-lg font-semibold">Quick Overview</SheetTitle>
              <SheetDescription className="text-sm">Jump to key sections</SheetDescription>
            </SheetHeader>
            
            {/* Navigation Links */}
            <div className="flex-1 overflow-y-auto px-4 py-3 pb-safe">
              <div className="grid grid-cols-2 gap-2">
                {quickLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <Button
                      key={link.id}
                      variant="outline"
                      className="h-auto flex-col items-center justify-center gap-2 py-4 px-3 rounded-xl border-border hover:bg-primary/10 hover:border-primary/50 transition-all"
                      onClick={() => {
                        setMobileQuickOverviewOpen(false);
                        // Small delay to allow sheet to close before scrolling
                        setTimeout(() => scrollToSection(link.id), 150);
                      }}
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <span className="text-xs font-medium text-center leading-tight line-clamp-2">{link.label}</span>
                    </Button>
                  );
                })}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </AppLayout>
  );
}

