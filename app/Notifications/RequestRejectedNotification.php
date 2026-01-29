<?php

namespace App\Notifications;

use App\Models\RequestSubmission;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

class RequestRejectedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public RequestSubmission $submission,
        public ?User $rejector = null,
        public ?string $reason = null
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'request_rejected',
            'submission_id' => $this->submission->id,
            'reference_code' => $this->submission->reference_code,
            'request_type' => $this->submission->requestType?->name ?? 'Request',
            'rejector_name' => $this->rejector?->name,
            'reason' => $this->reason,
            'message' => "Your request {$this->submission->reference_code} has been rejected.",
            'url' => route('requests.show', $this->submission->id),
        ];
    }
}
