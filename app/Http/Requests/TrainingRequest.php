<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class TrainingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'training_title' => 'required|string|max:100',
            'training_category_id' => 'nullable|integer',
            'date_from' => 'required|date',
            'date_to' => 'required|date|after_or_equal:date_from',
            'hours' => 'required|numeric|min:0',
            'facilitator' => 'nullable|string|max:100',
            'venue' => 'nullable|string|max:100',
            'capacity' => 'nullable|integer|min:1',
            'remarks' => 'nullable|string',
            'faculty_ids' => 'nullable|array',
            'faculty_ids.*' => 'exists:faculties,id',
            'department_ids' => 'nullable|array',
            'department_ids.*' => 'exists:departments,id',
            'position_ids' => 'nullable|array',
            'position_ids.*' => 'exists:positions,id',
            'requires_approval' => 'nullable|boolean',
            'request_type_id' => [
                'nullable',
                'integer',
                'exists:request_types,id',
                // Note: If requires_approval is true and request_type_id is null,
                // the system will auto-create a request type in the controller
            ],
        ];
    }
}

