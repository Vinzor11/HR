import { CustomToast, toast } from '@/components/custom-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { CalendarDays, Clock3, MapPin, Users } from 'lucide-react';
import { useEffect } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Join Training',
        href: '/trainings/join',
    },
];

interface TrainingSummary {
    training_id: number;
    training_title: string;
    date_from: string;
    date_to: string;
    hours: string | number;
    facilitator?: string | null;
    venue?: string | null;
    remarks?: string | null;
    capacity?: number | null;
    available_spots?: number | null;
    has_capacity?: boolean;
    allowed_faculties?: { id: number; name: string }[];
    allowed_departments: { id: number; faculty_name: string }[];
    allowed_positions: { id: number; pos_name: string }[];
    is_eligible: boolean;
    already_applied: boolean;
}

interface EmployeeSummary {
    id: string;
    name: string;
    department?: string;
    position?: string;
}

interface JoinProps {
    trainings: TrainingSummary[];
    employee: EmployeeSummary | null;
}

const formatDateRange = (from?: string, to?: string) => {
    if (!from || !to) return 'Schedule TBA';
    const formatter = new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
    });

    return `${formatter.format(new Date(from))} - ${formatter.format(new Date(to))}`;
};

export default function JoinTraining({ trainings, employee }: JoinProps) {
    const { flash } = usePage<{ flash?: { success?: string; error?: string } }>().props;

    useEffect(() => {
        if (flash?.success) toast.success(flash.success);
        if (flash?.error) toast.error(flash.error);
    }, [flash]);

    const handleApply = (trainingId: number, isEligible: boolean) => {
        if (!employee) {
            toast.error('An employee profile is required before joining trainings.');
            return;
        }

        if (!isEligible) {
            toast.error('You are not eligible to join this training.');
            return;
        }

        router.post(
            route('trainings.apply'),
            { training_id: trainingId },
            {
                preserveScroll: true,
                onError: (errors) => {
                    if (errors.training_id) {
                        toast.error(errors.training_id);
                    }
                },
            },
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Join Training" />
            <CustomToast />

            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h1 className="text-2xl font-semibold text-foreground">Available Trainings</h1>
                            <p className="text-sm text-muted-foreground">
                                Choose a training and apply instantly
                            </p>
                        </div>
                    </div>

                    <div className="mt-6 grid gap-4 lg:grid-cols-2">
                        {trainings.length === 0 ? (
                            <div className="col-span-full rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
                                {employee
                                    ? 'No trainings match your eligibility at the moment. Please check back later.'
                                    : 'No trainings can be joined until your employee profile is linked. Please contact HR.'}
                            </div>
                        ) : (
                            trainings.map((training) => (
                                <article key={training.training_id} className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 shadow-sm">
                                    <div className="flex flex-col gap-1">
                                        <h3 className="text-lg font-semibold text-foreground">{training.training_title}</h3>
                                        <p className="text-sm text-muted-foreground">{training.remarks ?? 'No remarks added.'}</p>
                                    </div>

                                    <div className="grid gap-2 text-sm text-muted-foreground">
                                        <div className="flex items-center gap-2">
                                            <CalendarDays className="h-4 w-4" />
                                            <span>{formatDateRange(training.date_from, training.date_to)}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Clock3 className="h-4 w-4" />
                                            <span>{training.hours ?? 0} hours</span>
                                        </div>
                                        {training.venue && (
                                            <div className="flex items-center gap-2">
                                                <MapPin className="h-4 w-4" />
                                                <span>{training.venue}</span>
                                            </div>
                                        )}
                                        {training.facilitator && (
                                            <p>
                                                Facilitator:{' '}
                                                <span className="font-medium text-foreground">{training.facilitator}</span>
                                            </p>
                                        )}
                                        {training.capacity !== null && training.capacity !== undefined && (
                                            <div className="flex items-center gap-2">
                                                <Users className="h-4 w-4" />
                                                <span>
                                                    {training.available_spots !== null && training.available_spots !== undefined
                                                        ? `${training.available_spots} of ${training.capacity} spots available`
                                                        : `${training.capacity} total spots`}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid gap-2 text-xs text-muted-foreground">
                                        {training.allowed_faculties && training.allowed_faculties.length > 0 && (
                                            <div>
                                                <p className="font-semibold text-foreground">Allowed Faculties</p>
                                                <div className="mt-1 flex flex-wrap gap-1">
                                                    {training.allowed_faculties.map((faculty) => (
                                                        <Badge key={faculty.id} className="bg-primary/20 text-black border border-primary/30 dark:bg-primary/30 dark:text-black">
                                                            {faculty.name}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        <div>
                                            <p className="font-semibold text-foreground">Allowed Departments</p>
                                            <div className="mt-1 flex flex-wrap gap-1">
                                                {training.allowed_departments.length ? (
                                                    training.allowed_departments.map((dept) => (
                                                        <Badge key={dept.id} className="bg-primary/20 text-black border border-primary/30 dark:bg-primary/30 dark:text-black">
                                                            {dept.faculty_name}
                                                        </Badge>
                                                    ))
                                                ) : (
                                                    <span>Open to all departments</span>
                                                )}
                                            </div>
                                        </div>
                                        <div>
                                            <p className="font-semibold text-foreground">Allowed Positions</p>
                                            <div className="mt-1 flex flex-wrap gap-1">
                                                {training.allowed_positions.length ? (
                                                    training.allowed_positions.map((pos) => (
                                                        <Badge key={pos.id} className="bg-primary/20 text-black border border-primary/30 dark:bg-primary/30 dark:text-black">
                                                            {pos.pos_name}
                                                        </Badge>
                                                    ))
                                                ) : (
                                                    <span>Open to all positions</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-auto flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                        <Badge
                                            className={
                                                training.already_applied
                                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                        : training.is_eligible && training.has_capacity !== false
                                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                                                    : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                            }
                                        >
                                            {training.already_applied
                                                ? 'Already Applied'
                                                    : !training.is_eligible
                                                    ? 'Not Eligible'
                                                    : training.has_capacity === false
                                                    ? 'Full'
                                                    : 'Eligible'}
                                        </Badge>
                                            {training.has_capacity === false && (
                                                <span className="text-xs text-muted-foreground">Training is full</span>
                                            )}
                                        </div>

                                        <Button
                                            type="button"
                                            disabled={!employee || training.already_applied || training.has_capacity === false}
                                            onClick={() => handleApply(training.training_id, training.is_eligible)}
                                        >
                                            {training.already_applied ? 'Applied' : training.has_capacity === false ? 'Full' : 'Apply Now'}
                                        </Button>
                                    </div>
                                </article>
                            ))
                        )}
                    </div>
                </section>
            </div>
        </AppLayout>
    );
}

