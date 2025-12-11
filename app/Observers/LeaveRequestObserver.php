<?php

namespace App\Observers;

use App\Models\RequestSubmission;
use App\Models\LeaveRequest;
use App\Models\LeaveType;
use App\Models\LeaveBalance;
use App\Models\RequestAnswer;
use App\Services\LeaveService;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

/**
 * LeaveRequestObserver - CS Form No. 6 Compliant
 * 
 * Handles leave request lifecycle events:
 * - Created: Reserve balance when submitted
 * - Updated: Deduct balance on approval, release on rejection
 */
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

            $leaveType = LeaveType::where('code', $answers['leave_type'])->first();
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

            // For credit-based leaves or leaves that use other credits
            $sourceType = $leaveType->getCreditsSource() ?? $leaveType;
            
            // Only reserve balance for credit-based leaves
            if ($leaveType->isCreditBased() || !$leaveType->is_special_leave) {
                $reserved = $this->leaveService->reserveBalance($employeeId, $sourceType->id, $days);
                
                if (!$reserved) {
                    Log::warning('Failed to reserve leave balance', [
                        'submission_id' => $submission->id,
                        'employee_id' => $employeeId,
                        'leave_type_id' => $leaveType->id,
                        'source_leave_type_id' => $sourceType->id,
                        'days' => $days,
                    ]);
                }
            }

            Log::info('Leave request submitted', [
                'submission_id' => $submission->id,
                'employee_id' => $employeeId,
                'leave_type' => $leaveType->code,
                'days' => $days,
            ]);
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

                $leaveType = LeaveType::where('code', $answers['leave_type'])->first();
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

                // Get current leave credits for CS Form No. 6 Section 7
                $credits = $this->leaveService->getLeaveCreditsAsOfDate($employeeId);

                // Create or update leave request record with CS Form No. 6 fields
                $leaveRequest = LeaveRequest::updateOrCreate(
                    ['request_submission_id' => $submission->id],
                    [
                        'employee_id' => $employeeId,
                        'leave_type_id' => $leaveType->id,
                        'start_date' => $startDate,
                        'end_date' => $endDate,
                        'days' => $days,
                        'reason' => $answers['reason'] ?? null,
                        // CS Form No. 6 Section 6 fields
                        'location' => $answers['leave_location'] ?? null,
                        'location_details' => $answers['location_details'] ?? null,
                        'sick_leave_type' => $answers['sick_leave_type'] ?? null,
                        'illness_description' => $answers['illness_description'] ?? null,
                        'women_special_illness' => $answers['women_special_illness'] ?? null,
                        'study_leave_type' => $answers['study_leave_type'] ?? null,
                        'study_leave_details' => $answers['study_leave_details'] ?? null,
                        'other_leave_type' => $answers['other_purpose_type'] ?? null,
                        // Commutation
                        'commutation_requested' => ($answers['commutation_requested'] ?? 'not_requested') === 'requested',
                        // Leave credits at time of filing (Section 7)
                        'vacation_leave_balance' => $credits['vacation_leave']['balance'] ?? 0,
                        'sick_leave_balance' => $credits['sick_leave']['balance'] ?? 0,
                        // Status
                        'status' => 'approved',
                        'approved_at' => now(),
                        'approved_by' => auth()->id(),
                        // Default to all days with pay
                        'days_with_pay' => $days,
                        'days_without_pay' => 0,
                    ]
                );

                // For credit-based leaves, deduct balance
                $sourceType = $leaveType->getCreditsSource() ?? $leaveType;
                if ($leaveType->isCreditBased() || !$leaveType->is_special_leave) {
                    $this->leaveService->deductBalance($employeeId, $sourceType->id, $days);
                }

                Log::info('Leave request approved and balance deducted', [
                    'submission_id' => $submission->id,
                    'leave_request_id' => $leaveRequest->id,
                    'employee_id' => $employeeId,
                    'leave_type' => $leaveType->code,
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

                    $leaveType = LeaveType::where('code', $answers['leave_type'])->first();
                    if (!$leaveType) {
                        return;
                    }

                    $startDate = Carbon::parse($answers['start_date']);
                    $endDate = Carbon::parse($answers['end_date']);
                    $days = $this->leaveService->calculateWorkingDays($startDate, $endDate);

                    // For credit-based leaves, release reserved balance
                    $sourceType = $leaveType->getCreditsSource() ?? $leaveType;
                    if ($leaveType->isCreditBased() || !$leaveType->is_special_leave) {
                        $this->leaveService->releaseBalance($employeeId, $sourceType->id, $days);
                    }

                    // Create rejected leave request record
                    LeaveRequest::create([
                        'request_submission_id' => $submission->id,
                        'employee_id' => $employeeId,
                        'leave_type_id' => $leaveType->id,
                        'start_date' => $startDate,
                        'end_date' => $endDate,
                        'days' => $days,
                        'reason' => $answers['reason'] ?? null,
                        'status' => 'rejected',
                        'rejected_at' => now(),
                        'rejected_by' => auth()->id(),
                        'rejection_reason' => $this->getRejectionReason($submission),
                    ]);
                    return;
                }

                // Update existing leave request status
                $leaveRequest->update([
                    'status' => 'rejected',
                    'rejected_at' => now(),
                    'rejected_by' => auth()->id(),
                    'rejection_reason' => $this->getRejectionReason($submission),
                ]);

                // Release reserved balance for credit-based leaves
                $leaveType = $leaveRequest->leaveType;
                $sourceType = $leaveType->getCreditsSource() ?? $leaveType;
                if ($leaveType->isCreditBased() || !$leaveType->is_special_leave) {
                    $this->leaveService->releaseBalance(
                        $leaveRequest->employee_id,
                        $sourceType->id,
                        $leaveRequest->days
                    );
                }

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
     * Get rejection reason from approval actions
     */
    protected function getRejectionReason(RequestSubmission $submission): ?string
    {
        return $submission->approvalActions()
            ->where('status', 'rejected')
            ->latest()
            ->first()?->notes;
    }

    /**
     * Get leave request answers from submission
     * Maps CS Form No. 6 fields
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

        // Map all CS Form No. 6 field keys
        $fieldKeys = [
            // Required fields
            'leave_type',
            'start_date',
            'end_date',
            'total_days',
            'reason',
            // Section 6 - Details of Leave
            'leave_location',
            'location_details',
            'sick_leave_type',
            'illness_description',
            'women_special_illness',
            'study_leave_type',
            'study_leave_details',
            'other_purpose_type',
            'other_leave_specify',
            // Commutation
            'commutation_requested',
            // Contact info
            'contact_number',
            'contact_address',
        ];

        $result = [];
        foreach ($fieldKeys as $key) {
            if ($answers->has($key)) {
                $result[$key] = $answers[$key]->value;
            }
        }

        return $result;
    }
}
