<?php

namespace App\Services;

use App\Models\RequestField;
use App\Models\RequestType;
use App\Models\Training;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class TrainingRequestBuilderService
{
    /**
     * Create a request type (and default fields) for a training that requires approval.
     */
    public function createRequestTypeForTraining(Training $training, User $user): RequestType
    {
        if ($training->request_type_id) {
            return RequestType::findOrFail($training->request_type_id);
        }

        return DB::transaction(function () use ($training, $user) {
            $requestType = RequestType::create([
                'created_by' => $user->id,
                'name' => sprintf('Training Approval - %s (#%s)', $training->training_title, $training->training_id),
                'description' => sprintf('Auto-generated request type for training "%s". Configure approvers in the Request Builder.', $training->training_title),
                'has_fulfillment' => false,
                'approval_steps' => [],
                'is_published' => false,
            ]);

            $fields = [
                [
                    'field_key' => 'training_title',
                    'label' => 'Training Title',
                    'field_type' => 'text',
                ],
                [
                    'field_key' => 'training_id',
                    'label' => 'Training ID',
                    'field_type' => 'text',
                ],
                [
                    'field_key' => 'employee_id',
                    'label' => 'Employee ID',
                    'field_type' => 'text',
                ],
                [
                    'field_key' => 'employee_name',
                    'label' => 'Employee Name',
                    'field_type' => 'text',
                ],
                [
                    'field_key' => 'date_from',
                    'label' => 'Training Start Date',
                    'field_type' => 'date',
                ],
                [
                    'field_key' => 'date_to',
                    'label' => 'Training End Date',
                    'field_type' => 'date',
                ],
                [
                    'field_key' => 'hours',
                    'label' => 'Hours',
                    'field_type' => 'number',
                ],
                [
                    'field_key' => 'venue',
                    'label' => 'Venue',
                    'field_type' => 'text',
                ],
                [
                    'field_key' => 'facilitator',
                    'label' => 'Facilitator',
                    'field_type' => 'text',
                ],
            ];

            foreach ($fields as $index => $field) {
                RequestField::create([
                    'request_type_id' => $requestType->id,
                    'field_key' => $field['field_key'],
                    'label' => $field['label'],
                    'field_type' => $field['field_type'],
                    'is_required' => false,
                    'description' => null,
                    'options' => null,
                    'sort_order' => $index,
                ]);
            }

            $training->request_type_id = $requestType->id;
            $training->save();

            return $requestType;
        });
    }
}

