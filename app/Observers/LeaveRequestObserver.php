<?php

namespace App\Observers;

use App\Models\RequestSubmission;
use App\Models\LeaveRequest;
use App\Models\RequestAnswer;
use App\Services\LeaveService;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class LeaveRequestObserver
{
    protected LeaveService $leaveService;

    public function __construct(LeaveService $leaveService)
    {
        $this->leaveService = $leaveService;
    }

    /**
     * Handle the RequestSubmission "updated" event.
     * This fires when a request status changes (approved/rejected)
     */
    public function updated(RequestSubmission $submission): void
    {
        // Check if this is a leave request type
        if ($submission->requestType->name !== 'Leave Request') {
            return;
        }

        // Get the original status before update
        $originalStatus = $submission->getOriginal('status');
        $newStatus = $submission->status;

        // Handle approval
        if ($originalStatus !== 'approved' && $newStatus === 'approved') {
            $this->handleLeaveApproval($submission);
        }

        // Handle rejection
        if ($originalStatus !== 'rejected' && $newStatus === 'rejected') {
            $this->handleLeaveRejection($submission);
        }
    }

    /**
     * Handle the RequestSubmission "created" event.
     * Reserve balance when leave request is submitted
     */
    public function created(RequestSubmission $submission): void
    {
        // Check if this is a leave request type
        if ($submission->requestType->name !== 'Leave Request') {
            return;
        }

        // Only reserve balance if status is pending (has approval workflow)
        if ($submission->status === 'pending') {
            $this->handleLeaveSubmission($submission);
        }
    }

    /**
     * Handle leave request submission - reserve balance
     */
    protected function handleLeaveSubmission(RequestSubmission $submission): void
    {
        try {
            $answers = $this->getLeaveRequestAnswers($submission);
            
            if (!$answers) {
                return;
            }

            $employeeId = $submission->user->employee_id ?? null;
            if (!$employeeId) {
                Log::warning('Leave request submitted but user has no employee_id', [
                    'submission_id' => $submission->id,
                    'user_id' => $submission->user_id,
                ]);
                return;
            }

            $leaveType = \App\Models\LeaveType::where('code', $answers['leave_type'])->first();
            if (!$leaveType) {
                Log::warning('Leave type not found', [
                    'submission_id' => $submission->id,
                    'leave_type_code' => $answers['leave_type'],
                ]);
                return;
            }

            $startDate = Carbon::parse($answers['start_date']);
            $endDate = Carbon::parse($answers['end_date']);
            $days = $this->leaveService->calculateWorkingDays($startDate, $endDate);

            // Reserve balance
            $reserved = $this->leaveService->reserveBalance($employeeId, $leaveType->id, $days);
            
            if (!$reserved) {
                Log::warning('Failed to reserve leave balance', [
                    'submission_id' => $submission->id,
                    'employee_id' => $employeeId,
                    'leave_type_id' => $leaveType->id,
                    'days' => $days,
                ]);
            }
        } catch (\Exception $e) {
            Log::error('Error handling leave submission', [
                'submission_id' => $submission->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
        }
    }

    /**
     * Handle leave request approval - deduct balance and create leave request record
     */
    protected function handleLeaveApproval(RequestSubmission $submission): void
    {
        DB::transaction(function () use ($submission) {
            try {
                $answers = $this->getLeaveRequestAnswers($submission);
                
                if (!$answers) {
                    return;
                }

                $employeeId = $submission->user->employee_id ?? null;
                if (!$employeeId) {
                    Log::warning('Leave request approved but user has no employee_id', [
                        'submission_id' => $submission->id,
                    ]);
                    return;
                }

                $leaveType = \App\Models\LeaveType::where('code', $answers['leave_type'])->first();
                if (!$leaveType) {
                    Log::warning('Leave type not found on approval', [
                        'submission_id' => $submission->id,
                        'leave_type_code' => $answers['leave_type'],
                    ]);
                    return;
                }

                $startDate = Carbon::parse($answers['start_date']);
                $endDate = Carbon::parse($answers['end_date']);
                $days = $this->leaveService->calculateWorkingDays($startDate, $endDate);

                // Create or update leave request record
                $leaveRequest = LeaveRequest::updateOrCreate(
                    ['request_submission_id' => $submission->id],
                    [
                        'employee_id' => $employeeId,
                        'leave_type_id' => $leaveType->id,
                        'start_date' => $startDate,
                        'end_date' => $endDate,
                        'days' => $days,
                        'reason' => $answers['reason'] ?? null,
                        'status' => 'approved',
                        'approved_at' => now(),
                        'approved_by' => auth()->id(),
                    ]
                );

                // Deduct balance (moves from pending to used)
                $this->leaveService->deductBalance($employeeId, $leaveType->id, $days);

                Log::info('Leave request approved and balance deducted', [
                    'submission_id' => $submission->id,
                    'leave_request_id' => $leaveRequest->id,
                    'employee_id' => $employeeId,
                    'days' => $days,
                ]);
            } catch (\Exception $e) {
                Log::error('Error handling leave approval', [
                    'submission_id' => $submission->id,
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString(),
                ]);
                throw $e;
            }
        });
    }

    /**
     * Handle leave request rejection - release reserved balance
     */
    protected function handleLeaveRejection(RequestSubmission $submission): void
    {
        DB::transaction(function () use ($submission) {
            try {
                $leaveRequest = LeaveRequest::where('request_submission_id', $submission->id)->first();
                
                if (!$leaveRequest) {
                    // If leave request record doesn't exist, try to get from answers
                    $answers = $this->getLeaveRequestAnswers($submission);
                    if (!$answers) {
                        return;
                    }

                    $employeeId = $submission->user->employee_id ?? null;
                    if (!$employeeId) {
                        return;
                    }

                    $leaveType = \App\Models\LeaveType::where('code', $answers['leave_type'])->first();
                    if (!$leaveType) {
                        return;
                    }

                    $startDate = Carbon::parse($answers['start_date']);
                    $endDate = Carbon::parse($answers['end_date']);
                    $days = $this->leaveService->calculateWorkingDays($startDate, $endDate);

                    // Release reserved balance
                    $this->leaveService->releaseBalance($employeeId, $leaveType->id, $days);
                    return;
                }

                // Update leave request status
                $leaveRequest->update([
                    'status' => 'rejected',
                    'rejected_at' => now(),
                    'rejected_by' => auth()->id(),
                    'rejection_reason' => $submission->approvalActions()
                        ->where('status', 'rejected')
                        ->latest()
                        ->first()?->notes,
                ]);

                // Release reserved balance
                $this->leaveService->releaseBalance(
                    $leaveRequest->employee_id,
                    $leaveRequest->leave_type_id,
                    $leaveRequest->days
                );

                Log::info('Leave request rejected and balance released', [
                    'submission_id' => $submission->id,
                    'leave_request_id' => $leaveRequest->id,
                ]);
            } catch (\Exception $e) {
                Log::error('Error handling leave rejection', [
                    'submission_id' => $submission->id,
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString(),
                ]);
            }
        });
    }

    /**
     * Get leave request answers from submission
     */
    protected function getLeaveRequestAnswers(RequestSubmission $submission): ?array
    {
        $answers = RequestAnswer::where('submission_id', $submission->id)
            ->with('field')
            ->get()
            ->keyBy(function ($answer) {
                return $answer->field->field_key;
            });

        if ($answers->isEmpty()) {
            return null;
        }

        $result = [];
        foreach (['leave_type', 'start_date', 'end_date', 'reason'] as $key) {
            if ($answers->has($key)) {
                $result[$key] = $answers[$key]->value;
            }
        }

        return $result;
    }
}



