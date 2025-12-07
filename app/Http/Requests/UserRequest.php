<?php
namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $userId = $this->route('user')?->id;
        
        $rules = [
            'name'             => 'required|string',
            'email'            => [
                'required',
                'email',
                Rule::unique('users', 'email')->ignore($userId),
            ],
            'password'         => $this->isMethod('POST') ? 'required|string|min:6' : 'nullable|string|min:6',
            'confirm_password' => $this->isMethod('POST') ? 'required|same:password' : 'nullable|same:password',
            'roles'            => 'required|array',
            'roles.*'          => 'exists:roles,id',
        ];
        
        // Conditionally add employee_id validation
        if ($this->filled('employee_id')) {
            $rules['employee_id'] = [
                'nullable',
                'string',
                'max:15',
                Rule::exists('employees', 'id'),
                Rule::unique('users', 'employee_id')->ignore($userId),
            ];
        } else {
            $rules['employee_id'] = [
                'nullable',
                'string',
                'max:15',
                Rule::unique('users', 'employee_id')->ignore($userId),
            ];
        }
        
        return $rules;
    }
}
