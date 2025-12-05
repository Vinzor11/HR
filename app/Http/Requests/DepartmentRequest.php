<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class DepartmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $departmentId = $this->route('department')?->id;

        return [
            'code' => [
                'required',
                'string',
                'max:50',
                'regex:/^[A-Z0-9\-_]+$/i',
                Rule::unique('departments', 'code')->ignore($departmentId),
            ],
            'name' => [
                'required',
                'string',
                'max:150',
                Rule::unique('departments', 'name')->ignore($departmentId),
            ],
            'type' => ['required', Rule::in(['academic', 'administrative'])],
            'faculty_id' => [
                Rule::requiredIf(fn () => $this->input('type') === 'academic'),
                'nullable',
                'integer',
                'exists:faculties,id',
                function ($attribute, $value, $fail) {
                    // For administrative departments, faculty_id must be null
                    if ($this->input('type') === 'administrative' && $value !== null) {
                        $fail('Faculty must not be selected for administrative offices.');
                    }
                },
            ],
            'description' => ['nullable', 'string', 'max:500'],
        ];
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        // Force faculty_id to null for administrative departments
        if ($this->input('type') === 'administrative') {
            $this->merge([
                'faculty_id' => null,
            ]);
        }
        
        // Convert empty string to null for faculty_id
        if ($this->has('faculty_id') && $this->input('faculty_id') === '') {
            $this->merge([
                'faculty_id' => null,
            ]);
        }
    }

    public function messages(): array
    {
        return [
            'code.required' => 'Department code is required.',
            'code.unique' => 'This department code already exists. Please use a different code.',
            'code.max' => 'Department code must not exceed 50 characters.',
            'code.regex' => 'Department code can only contain letters, numbers, hyphens, and underscores.',
            'name.required' => 'Department name is required.',
            'name.unique' => 'This department name already exists. Please use a different name.',
            'name.max' => 'Department name must not exceed 150 characters.',
            'type.required' => 'Department type is required.',
            'type.in' => 'Department type must be either academic or administrative.',
            'faculty_id.required' => 'Faculty is required for academic departments.',
            'faculty_id.exists' => 'The selected faculty does not exist.',
            'description.max' => 'Description must not exceed 500 characters.',
        ];
    }
}
