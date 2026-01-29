<?php

namespace App\Console\Commands;

use App\Models\ApprovalDelegation;
use App\Models\RequestApprovalAction;
use App\Models\RequestSubmission;
use App\Models\User;
use App\Notifications\ApprovalReminderNotification;
use App\Services\ApprovalRoutingService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class SendApprovalReminders extends Command
{
    protected $signature = 'approvals:send-reminders 
                            {--escalate : Also escalate overdue approvals}
                            {--dry-run : Show what would be done without actually doing it}';

    protected $description = 'Send reminders for pending approvals and optionally escalate overdue ones';

    public function handle(ApprovalRoutingService $routingService): int
    {
        $dryRun = $this->option('dry-run');
        $shouldEscalate = $this->option('escalate');

        $this->info('Processing approval reminders...');

        // Get all pending actions with due dates
        $pendingActions = RequestApprovalAction::with(['submission.requestType', 'submission.user', 'approver'])
            ->where('status', RequestApprovalAction::STATUS_PENDING)
            ->whereNotNull('due_at')
            ->get();

        $remindersCount = 0;
        $escalationsCount = 0;

        foreach ($pendingActions as $action) {
            $submission = $action->submission;
            
            // Skip if submission is not pending
            if ($submission->status !== RequestSubmission::STATUS_PENDING) {
                continue;
            }

            // Skip if not the current step
            if ($submission->current_step_index !== $action->step_index) {
                continue;
            }

            $isOverdue = $action->isOverdue();
            $isDueSoon = $action->isDueSoon(24); // Due within 24 hours

            // Handle overdue escalation
            if ($isOverdue && $shouldEscalate && !$action->is_escalated) {
                if ($dryRun) {
                    $this->line("[DRY RUN] Would escalate: {$submission->reference_code}");
                } else {
                    $this->escalateAction($action, $routingService);
                    $escalationsCount++;
                }
            }

            // Send reminder if due soon or overdue (and not already reminded today)
            if (($isDueSoon || $isOverdue) && $this->shouldSendReminder($action)) {
                $approvers = $this->getApproversForAction($action);

                foreach ($approvers as $approver) {
                    if ($dryRun) {
                        $this->line("[DRY RUN] Would remind {$approver->name} for: {$submission->reference_code}");
                    } else {
                        $approver->notify(new ApprovalReminderNotification($submission, $action, $isOverdue));
                        $remindersCount++;
                    }
                }

                if (!$dryRun) {
                    $action->update([
                        'reminded_at' => now(),
                        'reminder_count' => $action->reminder_count + 1,
                    ]);
                }
            }
        }

        $this->info("Reminders sent: {$remindersCount}");
        $this->info("Escalations processed: {$escalationsCount}");

        return Command::SUCCESS;
    }

    /**
     * Check if we should send a reminder (not already reminded in last 24 hours).
     */
    protected function shouldSendReminder(RequestApprovalAction $action): bool
    {
        if (!$action->reminded_at) {
            return true;
        }

        // Don't remind more than once per day
        return $action->reminded_at->diffInHours(now()) >= 24;
    }

    /**
     * Get the users who should be notified for this action.
     */
    protected function getApproversForAction(RequestApprovalAction $action): array
    {
        $approvers = [];

        // Direct approver
        if ($action->approver_id) {
            $approver = User::find($action->approver_id);
            if ($approver) {
                $approvers[] = $approver;
                
                // Check for delegate
                $delegate = ApprovalDelegation::getActiveDelegateFor($approver->id);
                if ($delegate) {
                    $approvers[] = $delegate;
                }
            }
        }

        // Role-based approvers
        if ($action->approver_role_id) {
            $roleApprovers = User::whereHas('roles', function ($query) use ($action) {
                $query->where('id', $action->approver_role_id);
            })->get();

            foreach ($roleApprovers as $approver) {
                $approvers[] = $approver;
            }
        }

        // Position-based approvers
        if ($action->approver_position_id) {
            $positionApprovers = User::whereHas('employee.designations', function ($query) use ($action) {
                $query->where('position_id', $action->approver_position_id)
                    ->where('is_primary', true);
            })->get();

            foreach ($positionApprovers as $approver) {
                $approvers[] = $approver;
            }
        }

        return array_unique($approvers, SORT_REGULAR);
    }

    /**
     * Escalate an overdue action to a higher authority.
     */
    protected function escalateAction(RequestApprovalAction $action, ApprovalRoutingService $routingService): void
    {
        $submission = $action->submission;
        $requesterEmployee = $submission->user?->employee;

        if (!$requesterEmployee) {
            Log::warning("Cannot escalate action {$action->id}: No requester employee found");
            return;
        }

        // Find next approver in hierarchy
        $currentAuthorityLevel = $action->meta['resolved_authority_level'] ?? 1;
        $nextApprover = $routingService->findNextApprover($requesterEmployee, $currentAuthorityLevel + 1);

        if (!$nextApprover) {
            Log::warning("Cannot escalate action {$action->id}: No higher authority found");
            return;
        }

        DB::transaction(function () use ($action, $nextApprover, $submission) {
            // Update the action with escalation info
            $action->update([
                'is_escalated' => true,
                'escalated_at' => now(),
                'escalated_from_user_id' => $action->approver_id,
                'approver_id' => $nextApprover->id,
                'meta' => array_merge($action->meta ?? [], [
                    'escalation_reason' => 'overdue',
                    'original_due_at' => $action->due_at?->toIso8601String(),
                ]),
            ]);

            // Create a system comment
            \App\Models\ApprovalComment::createSystemComment(
                $submission->id,
                "Approval escalated to {$nextApprover->name} due to overdue deadline.",
                null,
                $action->id
            );

            // Notify the new approver
            $nextApprover->notify(new \App\Notifications\ApprovalRequestedNotification($submission, $action));

            $this->info("Escalated {$submission->reference_code} to {$nextApprover->name}");
        });
    }
}
