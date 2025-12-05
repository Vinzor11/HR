<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreRequestTypeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('access-request-types-module') ?? false;
    }

    public function rules(): array
    {
        $fieldTypes = ['text', 'number', 'date', 'textarea', 'checkbox', 'dropdown', 'radio', 'file'];

        return [
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'has_fulfillment' => ['required', 'boolean'],
            'is_published' => ['sometimes', 'boolean'],
            'approval_steps' => ['nullable', 'array'],
            'approval_steps.*.name' => ['required_with:approval_steps', 'string', 'max:255'],
            'approval_steps.*.description' => ['nullable', 'string'],
            'approval_steps.*.approvers' => ['required_with:approval_steps', 'array', 'min:1'],
            'approval_steps.*.approvers.*.approver_type' => ['required', Rule::in(['user', 'role', 'position'])],
            'approval_steps.*.approvers.*.approver_id' => ['nullable', 'integer', 'exists:users,id'],
            'approval_steps.*.approvers.*.approver_role_id' => ['nullable', 'integer', 'exists:roles,id'],
            'approval_steps.*.approvers.*.approver_position_id' => ['nullable', 'integer', 'exists:positions,id'],
            'fields' => ['required', 'array', 'min:1'],
            'fields.*.id' => ['nullable', 'integer', 'exists:request_fields,id'],
            'fields.*.label' => ['required', 'string', 'max:255'],
            'fields.*.field_type' => ['required', Rule::in($fieldTypes)],
            'fields.*.is_required' => ['sometimes', 'boolean'],
            'fields.*.description' => ['nullable', 'string'],
            'fields.*.options' => ['nullable', 'array'],
            'fields.*.options.*.label' => ['required_with:fields.*.options', 'string', 'max:255'],
            'fields.*.options.*.value' => ['required_with:fields.*.options', 'string', 'max:255'],
            'fields.*.sort_order' => ['nullable', 'integer', 'min:0'],
            'fields.*.field_key' => ['nullable', 'string', 'max:255'],
            'certificate_template_id' => ['nullable', 'integer', 'exists:certificate_templates,id'],
            'certificate_config' => ['nullable', 'array'],
            'certificate_config.field_mappings' => ['nullable', 'array'],
            'certificate_config.field_mappings.*' => ['nullable', 'string', 'max:255'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $v): void {
            $steps = $this->input('approval_steps', []);
            foreach ($steps as $index => $step) {
                $approvers = $step['approvers'] ?? [];

                if (empty($approvers)) {
                    $v->errors()->add("approval_steps.{$index}.approvers", 'Add at least one approver.');
                    continue;
                }

                foreach ($approvers as $approverIndex => $approver) {
                    $type = $approver['approver_type'] ?? null;

                    if ($type === 'user' && empty($approver['approver_id'])) {
                        $v->errors()->add("approval_steps.{$index}.approvers.{$approverIndex}.approver_id", 'Select a user.');
                    }

                    if ($type === 'role' && empty($approver['approver_role_id'])) {
                        $v->errors()->add("approval_steps.{$index}.approvers.{$approverIndex}.approver_role_id", 'Select a role.');
                    }

                    if ($type === 'position' && empty($approver['approver_position_id'])) {
                        $v->errors()->add("approval_steps.{$index}.approvers.{$approverIndex}.approver_position_id", 'Select a position.');
                    }
                }
            }

            $fields = $this->input('fields', []);
            foreach ($fields as $index => $field) {
                if (in_array($field['field_type'] ?? null, ['dropdown', 'radio'], true) && empty($field['options'])) {
                    $v->errors()->add("fields.{$index}.options", 'Options are required for selection-based fields.');
                }
            }
        });
    }
}
