<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class RoleRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $roleId = $this->route('role')?->id;
        $label = $this->input('label');
        $generatedName = $label ? Str::slug($label) : null;

        return [
            'label' => [
                'required',
                'string',
                function ($attribute, $value, $fail) use ($roleId, $generatedName) {
                    if ($generatedName) {
                        $exists = \Spatie\Permission\Models\Role::where('name', $generatedName)
                            ->where('guard_name', 'web')
                            ->when($roleId, function ($query) use ($roleId) {
                                $query->where('id', '!=', $roleId);
                            })
                            ->exists();
                        
                        if ($exists) {
                            $fail('A role with this name already exists. Please choose a different label.');
                        }
                    }
                },
            ],
            'description' => 'nullable|string',
            'permissions' => 'required|array',
            'permissions.*' => 'string|exists:permissions,name',
        ];
    }
}
