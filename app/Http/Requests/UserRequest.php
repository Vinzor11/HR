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

        return [
            'name'             => 'required|string',
            'email'            => [
                'required',
                'email',
                Rule::unique('users', 'email')->ignore($userId),
            ],
            'employee_id'      => [
                'required',
                'string',
                'max:15',
                'exists:employees,id',
                Rule::unique('users', 'employee_id')->ignore($userId),
            ],
            'password'         => $this->isMethod('POST') ? 'required|string|min:6' : 'nullable|string|min:6',
            'confirm_password' => $this->isMethod('POST') ? 'required|same:password' : 'nullable|same:password',
            'roles'            => 'required|array',
            'roles.*'          => 'exists:roles,id',
        ];
    }
}
