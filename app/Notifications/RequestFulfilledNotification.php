<?php

namespace App\Notifications;

use App\Models\RequestSubmission;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class RequestFulfilledNotification extends Notification
{
    use Queueable;

    public function __construct(protected RequestSubmission $submission)
    {
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $requestTypeName = $this->submission->requestType?->name ?? 'HR Request';
        $downloadUrl = $this->submission->fulfillment?->file_url;
        $notes = $this->submission->fulfillment?->notes;

        $mail = (new MailMessage())
            ->subject("{$requestTypeName} Request Completed ({$this->submission->reference_code})")
            ->greeting("Hi {$notifiable->name},")
            ->line("Your {$requestTypeName} request has been completed.")
            ->line("Reference Code: {$this->submission->reference_code}");

        if ($notes) {
            $mail->line("Notes from HR: {$notes}");
        }

        if ($downloadUrl) {
            $mail->action('View Request & Download Files', route('requests.show', $this->submission));
        } else {
            $mail->action('View Request Details', route('requests.show', $this->submission));
        }

        $mail->line('Thank you for using the HR Request Management System.');

        return $mail;
    }

    public function toArray(object $notifiable): array
    {
        return [
            'submission_id' => $this->submission->id,
            'reference_code' => $this->submission->reference_code,
            'status' => $this->submission->status,
        ];
    }
}
