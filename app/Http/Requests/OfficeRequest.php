<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class OfficeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $office = $this->route('office');
        $officeId = is_object($office) ? $office->id : $office;

        return [
            'code' => [
                'required',
                'string',
                'max:25',
                'regex:/^[A-Z0-9\-_]+$/i',
                Rule::unique('departments', 'code')->ignore($officeId),
            ],
            'name' => [
                'required',
                'string',
                'max:150',
                Rule::unique('departments', 'name')->ignore($officeId),
            ],
            'description' => ['nullable', 'string', 'max:500'],
        ];
    }

    public function messages(): array
    {
        return [
            'code.required' => 'Office code is required.',
            'code.unique' => 'This office code already exists. Please use a different code.',
            'code.max' => 'Office code must not exceed 25 characters.',
            'code.regex' => 'Office code can only contain letters, numbers, hyphens, and underscores.',
            'name.required' => 'Office name is required.',
            'name.unique' => 'This office name already exists. Please use a different name.',
            'name.max' => 'Office name must not exceed 150 characters.',
            'description.max' => 'Description must not exceed 500 characters.',
        ];
    }
}
