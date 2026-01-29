<?php

namespace App\Notifications;

use App\Models\RequestSubmission;
use App\Models\RequestApprovalAction;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

class ApprovalReminderNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public RequestSubmission $submission,
        public RequestApprovalAction $action,
        public bool $isOverdue = false
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => $this->isOverdue ? 'approval_overdue' : 'approval_reminder',
            'submission_id' => $this->submission->id,
            'reference_code' => $this->submission->reference_code,
            'request_type' => $this->submission->requestType?->name ?? 'Request',
            'requester_name' => $this->submission->user?->name ?? 'Unknown',
            'due_at' => $this->action->due_at?->toIso8601String(),
            'is_overdue' => $this->isOverdue,
            'message' => $this->isOverdue
                ? "OVERDUE: {$this->submission->requestType?->name} ({$this->submission->reference_code})"
                : "Reminder: {$this->submission->requestType?->name} ({$this->submission->reference_code})",
            'url' => route('requests.show', $this->submission->id),
        ];
    }
}
