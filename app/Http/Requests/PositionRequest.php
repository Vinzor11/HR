<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class PositionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'pos_code' => [
                'required',
                'string',
                'max:10',
                'regex:/^[A-Z0-9\-_]+$/i',
            ],
            'pos_name' => [
                'required',
                'string',
                'max:100',
            ],
            'sector_id' => [
                'required',
                'integer',
                'exists:sectors,id',
            ],
            'authority_level' => [
                'nullable',
                'integer',
                'min:1',
                'max:100',
            ],
            'description' => ['nullable', 'string', 'max:500'],
        ];
    }

    public function messages(): array
    {
        return [
            'pos_code.required' => 'Position code is required.',
            'pos_code.max' => 'Position code must not exceed 10 characters.',
            'pos_code.regex' => 'Position code can only contain letters, numbers, hyphens, and underscores.',
            'pos_name.required' => 'Position name is required.',
            'pos_name.max' => 'Position name must not exceed 100 characters.',
            'sector_id.required' => 'Sector is required.',
            'sector_id.exists' => 'The selected sector does not exist.',
            'authority_level.integer' => 'Authority level must be a number.',
            'authority_level.min' => 'Authority level must be at least 1.',
            'authority_level.max' => 'Authority level must not exceed 100.',
            'description.max' => 'Description must not exceed 500 characters.',
        ];
    }
}
