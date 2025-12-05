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
            'position_category' => [
                'required',
                'string',
                'in:executive,academic_teaching,academic_support,administrative_non_teaching,technical_skilled,support_utility,specialized_compliance',
            ],
            'faculty_id' => [
                'nullable',
                'integer',
                'exists:faculties,id',
                function ($attribute, $value, $fail) {
                    $category = $this->input('position_category');
                    
                    // Executive, Administrative, Support/Utility, Specialized/Compliance: No Faculty
                    if (in_array($category, ['executive', 'administrative_non_teaching', 'support_utility', 'specialized_compliance']) && $value !== null) {
                        $fail('Faculty must not be selected for this position category.');
                    }
                    
                    // Academic Teaching: Always require Faculty
                    if ($category === 'academic_teaching' && !$value) {
                        $fail('Faculty is required for Academic (Teaching) positions.');
                    }
                    
                    // Academic Support: Faculty required if Department (academic) is selected, but not if Office (administrative) is selected
                    if ($category === 'academic_support') {
                        $departmentId = $this->input('department_id');
                        if ($departmentId) {
                            $department = \App\Models\Department::find($departmentId);
                            // If academic department is selected, faculty is required
                            if ($department && $department->type === 'academic' && !$value) {
                                $fail('Faculty is required when an academic Department is selected for Academic Support positions.');
                            }
                            // If administrative department (office) is selected, faculty should not be set
                            if ($department && $department->type === 'administrative' && $value !== null) {
                                $fail('Faculty must not be selected when Office is selected for Academic Support positions.');
                            }
                        }
                    }
                    
                    // Technical/Skilled: Faculty required if Department (academic) is selected
                    if ($category === 'technical_skilled') {
                        $departmentId = $this->input('department_id');
                        if ($departmentId) {
                            $department = \App\Models\Department::find($departmentId);
                            // If academic department is selected, faculty is required
                            if ($department && $department->type === 'academic' && !$value) {
                                $fail('Faculty is required when Department is selected for Technical/Skilled positions.');
                            }
                            // If administrative department (office) is selected, faculty should not be set
                            if ($department && $department->type === 'administrative' && $value !== null) {
                                $fail('Faculty must not be selected when Office is selected for Technical/Skilled positions.');
                            }
                        }
                    }
                },
            ],
            'department_id' => [
                'nullable',
                'integer',
                'exists:departments,id',
                function ($attribute, $value, $fail) {
                    $category = $this->input('position_category');
                    $facultyId = $this->input('faculty_id');
                    
                    // For categories that require Office (administrative department)
                    if (in_array($category, ['executive', 'administrative_non_teaching', 'support_utility', 'specialized_compliance'])) {
                        // Office is required - must be an administrative department
                        if (!$value) {
                            $fail('Office is required for this position category.');
                        } else {
                            // Verify it's an administrative department
                            $department = \App\Models\Department::find($value);
                            if ($department && $department->type !== 'administrative') {
                                $fail('Office must be an administrative department for this position category.');
                            }
                        }
                    }
                    
                    // Academic Teaching: Require Department (academic)
                    if ($category === 'academic_teaching') {
                        if (!$value) {
                            $fail('Department is required for Academic (Teaching) positions.');
                        } else {
                            // Verify it's an academic department
                            $department = \App\Models\Department::find($value);
                            if ($department && $department->type !== 'academic') {
                                $fail('Department must be an academic department for Academic (Teaching) positions.');
                            }
                        }
                    }
                    
                    // Academic Support: Can be Faculty+Department OR Faculty only OR Office only
                    if ($category === 'academic_support' && $value) {
                        $department = \App\Models\Department::find($value);
                        if ($department) {
                            if ($department->type === 'academic') {
                                // Academic department requires faculty
                                if (!$facultyId) {
                                    $fail('Faculty is required when an academic Department is selected for Academic Support positions.');
                                }
                            } elseif ($department->type === 'administrative') {
                                // Office (administrative) should not have faculty
                                if ($facultyId) {
                                    $fail('Faculty must not be selected when Office is selected for Academic Support positions.');
                                }
                            }
                        }
                    }
                    
                    // Technical/Skilled: Can be Faculty+Department OR Office only
                    if ($category === 'technical_skilled' && $value) {
                        $department = \App\Models\Department::find($value);
                        if ($department) {
                            if ($department->type === 'academic') {
                                // Academic department requires faculty
                                if (!$facultyId) {
                                    $fail('Faculty is required when Department is selected for Technical/Skilled positions.');
                                }
                            } elseif ($department->type === 'administrative') {
                                // Office (administrative) should not have faculty
                                if ($facultyId) {
                                    $fail('Faculty must not be selected when Office is selected for Technical/Skilled positions.');
                                }
                            }
                        }
                    }
                },
            ],
            'hierarchy_level' => ['required', 'integer', 'min:1', 'max:100'],
            'capacity' => ['nullable', 'integer', 'min:1'],
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
            'position_category.required' => 'Position category is required.',
            'position_category.in' => 'The selected position category is invalid.',
            'faculty_id.exists' => 'The selected faculty does not exist.',
            'department_id.exists' => 'The selected department does not exist.',
            'hierarchy_level.required' => 'Hierarchy level is required.',
            'hierarchy_level.integer' => 'Hierarchy level must be a number.',
            'hierarchy_level.min' => 'Hierarchy level must be at least 1.',
            'hierarchy_level.max' => 'Hierarchy level must not exceed 100.',
            'description.max' => 'Description must not exceed 500 characters.',
        ];
    }
}
