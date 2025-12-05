<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class FacultyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $facultyId = $this->route('faculty')?->id;

        return [
            'code' => [
                'required',
                'string',
                'max:25',
                'regex:/^[A-Z0-9\-_]+$/i',
                Rule::unique('faculties', 'code')->ignore($facultyId),
            ],
            'name' => [
                'required',
                'string',
                'max:150',
                Rule::unique('faculties', 'name')->ignore($facultyId),
            ],
            'description' => ['nullable', 'string', 'max:500'],
            'status' => ['required', Rule::in(['active', 'inactive'])],
        ];
    }

    public function messages(): array
    {
        return [
            'code.required' => 'Faculty code is required.',
            'code.unique' => 'This faculty code already exists. Please use a different code.',
            'code.max' => 'Faculty code must not exceed 25 characters.',
            'code.regex' => 'Faculty code can only contain letters, numbers, hyphens, and underscores.',
            'name.required' => 'Faculty name is required.',
            'name.unique' => 'This faculty name already exists. Please use a different name.',
            'name.max' => 'Faculty name must not exceed 150 characters.',
            'status.required' => 'Status is required.',
            'status.in' => 'Status must be either active or inactive.',
            'description.max' => 'Description must not exceed 500 characters.',
        ];
    }
}
