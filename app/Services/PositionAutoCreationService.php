<?php

namespace App\Services;

use App\Models\Department;
use App\Models\Faculty;
use App\Services\AuditLogService;
use App\Models\Position;
use Illuminate\Support\Str;

class PositionAutoCreationService
{
    /**
     * Automatically create faculty-level positions when a faculty is created.
     */
    public function createPositionsForFaculty(Faculty $faculty): void
    {
        $facultyPositions = $this->getFacultyLevelPositions();

        foreach ($facultyPositions as $positionData) {
            $this->createFacultyPosition($faculty, $positionData);
        }
    }

    /**
     * Automatically create positions for a department when it's created under a faculty.
     */
    public function createPositionsForDepartment(Department $department): void
    {
        // Only create positions for academic departments under a faculty
        if ($department->type !== 'academic' || !$department->faculty_id) {
            return;
        }

        $positions = $this->getDepartmentLevelPositions();

        foreach ($positions as $positionData) {
            $this->createDepartmentPosition($department, $positionData);
        }
    }

    /**
     * Get faculty-level positions (Dean, Associate Dean).
     */
    protected function getFacultyLevelPositions(): array
    {
        return [
            [
                'name' => 'Dean',
                'type' => 'faculty_leadership',
                'level' => 10,
            ],
            [
                'name' => 'Associate Dean',
                'type' => 'faculty_leadership',
                'level' => 9,
            ],
        ];
    }

    /**
     * Get department-level positions (excluding Dean and Associate Dean).
     */
    protected function getDepartmentLevelPositions(): array
    {
        return [
            // Department-Level Leadership
            [
                'name' => 'Department Head',
                'type' => 'department_leadership',
                'level' => 8,
            ],
            [
                'name' => 'Vice-Chair',
                'type' => 'department_leadership',
                'level' => 7,
            ],
            [
                'name' => 'Program Coordinator',
                'type' => 'department_leadership',
                'level' => 6,
            ],
            
            // Faculty Members
            [
                'name' => 'Professor',
                'type' => 'faculty_member',
                'level' => 5,
            ],
            [
                'name' => 'Associate Professor',
                'type' => 'faculty_member',
                'level' => 4,
            ],
            [
                'name' => 'Assistant Professor',
                'type' => 'faculty_member',
                'level' => 3,
            ],
            [
                'name' => 'Lecturer',
                'type' => 'faculty_member',
                'level' => 2,
            ],
            [
                'name' => 'Graduate Assistant',
                'type' => 'faculty_member',
                'level' => 1,
            ],
            
            // Administrative Staff
            [
                'name' => 'Secretary',
                'type' => 'administrative_staff',
                'level' => 4,
            ],
            [
                'name' => 'Admin Staff',
                'type' => 'administrative_staff',
                'level' => 3,
            ],
            [
                'name' => 'Lab Staff',
                'type' => 'administrative_staff',
                'level' => 2,
            ],
            [
                'name' => 'Library Staff',
                'type' => 'administrative_staff',
                'level' => 2,
            ],
            [
                'name' => 'Other Support',
                'type' => 'administrative_staff',
                'level' => 1,
            ],
        ];
    }

    /**
     * Create a faculty-level position (Dean, Associate Dean).
     */
    protected function createFacultyPosition(Faculty $faculty, array $positionData): void
    {
        $facultyCode = $faculty->code ?? strtoupper(substr($faculty->name, 0, 3));
        $positionName = $facultyCode . ' ' . $positionData['name'];
        $code = $this->generateFacultyPositionCode($faculty, $positionData['name']);
        $slug = $this->generateFacultySlug($faculty, $positionData['name']);

        // Ensure position name doesn't exceed 100 characters
        if (strlen($positionName) > 100) {
            $positionName = substr($positionName, 0, 100);
        }

        // Check if position already exists by name and faculty
        $existing = Position::where('faculty_id', $faculty->id)
            ->where('pos_name', $positionName)
            ->first();

        if (!$existing) {
            try {
                // Set capacity to 1 for Dean, leave others empty (null)
                $capacity = ($positionData['name'] === 'Dean') ? 1 : null;
                
                $position = Position::create([
                    'faculty_id' => $faculty->id,
                    'department_id' => null,
                    'pos_code' => $code,
                    'pos_name' => $positionName,
                    'hierarchy_level' => $positionData['level'],
                    'position_type' => $positionData['type'],
                    'capacity' => $capacity,
                    'slug' => $slug,
                    'description' => $this->generateDescription($positionData),
                    'creation_type' => 'auto',
                ]);

                // Log the auto-created position
                $this->logAutoCreatedPosition($position, 'faculty', $faculty->id, null);
            } catch (\Exception $e) {
                \Log::error('Failed to create faculty position', [
                    'faculty_id' => $faculty->id,
                    'position_name' => $positionName,
                    'position_code' => $code,
                    'error' => $e->getMessage(),
                ]);
                throw $e;
            }
        }
    }

    /**
     * Create a department-level position.
     */
    protected function createDepartmentPosition(Department $department, array $positionData): void
    {
        $deptCode = $department->code ?? strtoupper(substr($department->name, 0, 3));
        $positionName = $deptCode . ' ' . $positionData['name'];
        $code = $this->generateDepartmentPositionCode($department, $positionData['name']);
        $slug = $this->generateDepartmentSlug($department, $positionData['name']);

        // Check if position already exists by name and department
        $existing = Position::where('department_id', $department->id)
            ->where('pos_name', $positionName)
            ->first();

        if (!$existing) {
            // Set capacity to 1 for Department Head, leave others empty (null)
            $capacity = ($positionData['name'] === 'Department Head') ? 1 : null;
            
            $position = Position::create([
                'faculty_id' => $department->faculty_id,
                'department_id' => $department->id,
                'pos_code' => $code,
                'pos_name' => $positionName,
                'hierarchy_level' => $positionData['level'],
                'position_type' => $positionData['type'],
                'capacity' => $capacity,
                'slug' => $slug,
                'description' => $this->generateDescription($positionData),
                'creation_type' => 'auto',
            ]);

            // Log the auto-created position
            $this->logAutoCreatedPosition($position, 'department', $department->faculty_id, $department->id);
        }
    }

    /**
     * Generate a faculty position code.
     * Note: pos_code has a max length of 10 characters.
     */
    protected function generateFacultyPositionCode(Faculty $faculty, string $positionName): string
    {
        $facultyCode = $faculty->code ?? strtoupper(substr($faculty->name, 0, 3));
        $posAbbr = $this->getPositionAbbreviation($positionName);
        
        // Ensure total length doesn't exceed 10 characters
        // Format: {FACULTY_CODE}-{POS_ABBR}
        // If the total would exceed 10 chars, use a shorter format
        $totalLength = strlen($facultyCode) + strlen($posAbbr) + 1; // +1 for hyphen
        
        if ($totalLength > 10) {
            // Truncate faculty code to fit
            $maxFacultyCodeLength = max(1, 10 - strlen($posAbbr) - 1); // -1 for hyphen, min 1 char
            $facultyCode = substr($facultyCode, 0, $maxFacultyCodeLength);
        }
        
        $code = strtoupper($facultyCode) . '-' . $posAbbr;
        
        // Final safety check - truncate if still too long
        if (strlen($code) > 10) {
            $code = substr($code, 0, 10);
        }
        
        return $code;
    }

    /**
     * Generate a department position code.
     * Note: pos_code has a max length of 10 characters.
     */
    protected function generateDepartmentPositionCode(Department $department, string $positionName): string
    {
        $deptCode = $department->code ?? strtoupper(substr($department->name, 0, 3));
        $posAbbr = $this->getPositionAbbreviation($positionName);
        
        // Ensure total length doesn't exceed 10 characters
        // Format: {DEPT_CODE}-{POS_ABBR}
        // If the total would exceed 10 chars, use a shorter format
        $totalLength = strlen($deptCode) + strlen($posAbbr) + 1; // +1 for hyphen
        
        if ($totalLength > 10) {
            // Truncate department code to fit
            $maxDeptCodeLength = max(1, 10 - strlen($posAbbr) - 1); // -1 for hyphen, min 1 char
            $deptCode = substr($deptCode, 0, $maxDeptCodeLength);
        }
        
        $code = strtoupper($deptCode) . '-' . $posAbbr;
        
        // Final safety check - truncate if still too long
        if (strlen($code) > 10) {
            $code = substr($code, 0, 10);
        }
        
        return $code;
    }

    /**
     * Generate a unique slug for a faculty position.
     */
    protected function generateFacultySlug(Faculty $faculty, string $positionName): string
    {
        $facultyCode = $faculty->code ?? strtoupper(substr($faculty->name, 0, 3));
        $positionFullName = $facultyCode . ' ' . $positionName;
        $baseSlug = Str::slug($positionFullName);
        $slug = $baseSlug;
        $counter = 1;

        while (Position::where('slug', $slug)->where('faculty_id', $faculty->id)->exists()) {
            $slug = $baseSlug . '-' . $counter;
            $counter++;
        }

        return $slug;
    }

    /**
     * Generate a unique slug for a department position.
     */
    protected function generateDepartmentSlug(Department $department, string $positionName): string
    {
        $deptCode = $department->code ?? strtoupper(substr($department->name, 0, 3));
        $positionFullName = $deptCode . ' ' . $positionName;
        $baseSlug = Str::slug($positionFullName);
        $slug = $baseSlug;
        $counter = 1;

        while (Position::where('slug', $slug)->where('department_id', $department->id)->exists()) {
            $slug = $baseSlug . '-' . $counter;
            $counter++;
        }

        return $slug;
    }

    /**
     * Get abbreviation for position name.
     */
    protected function getPositionAbbreviation(string $name): string
    {
        $abbreviations = [
            'Dean' => 'DEAN',
            'Associate Dean' => 'ADEAN',
            'Department Head' => 'DHEAD',
            'Vice-Chair' => 'VCHAIR',
            'Program Coordinator' => 'PCOORD',
            'Professor' => 'PROF',
            'Associate Professor' => 'APROF',
            'Assistant Professor' => 'ASPROF',
            'Lecturer' => 'LECT',
            'Graduate Assistant' => 'GA',
            'Secretary' => 'SEC',
            'Admin Staff' => 'ADMIN',
            'Lab Staff' => 'LAB',
            'Library Staff' => 'LIB',
            'Other Support' => 'SUPP',
        ];

        return $abbreviations[$name] ?? strtoupper(substr($name, 0, 4));
    }

    /**
     * Generate description for position.
     */
    protected function generateDescription(array $positionData): string
    {
        $typeDescriptions = [
            'faculty_leadership' => 'Faculty-level leadership position',
            'department_leadership' => 'Department-level leadership position',
            'faculty_member' => 'Academic faculty member position',
            'administrative_staff' => 'Administrative support staff position',
        ];

        return $typeDescriptions[$positionData['type']] ?? 'Position in department';
    }

    /**
     * Log an auto-created position to the organizational audit log.
     */
    protected function logAutoCreatedPosition(Position $position, string $parentType, ?int $facultyId, ?int $departmentId): void
    {
        try {
            // Build a clean, readable log message
            $message = $this->buildAutoCreatedLogMessage($position, $parentType, $facultyId, $departmentId);

            app(AuditLogService::class)->logCreated(
                'organizational',
                'Position',
                (string)$position->id,
                $message,
                null,
                $position
            );
        } catch (\Exception $e) {
            // Log error but don't fail position creation
            \Log::error('Failed to log auto-created position', [
                'position_id' => $position->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Build a clean, readable log message for auto-created positions.
     */
    protected function buildAutoCreatedLogMessage(Position $position, string $parentType, ?int $facultyId, ?int $departmentId): string
    {
        $parts = [];
        
        // Position details
        $parts[] = "Position: {$position->pos_name} ({$position->pos_code})";
        
        // Parent entity information
        if ($parentType === 'faculty' && $facultyId) {
            $faculty = \App\Models\Faculty::find($facultyId);
            $facultyName = $faculty ? $faculty->name : "Faculty ID: {$facultyId}";
            $parts[] = "Belongs to: {$facultyName} (Faculty)";
        } elseif ($parentType === 'department' && $departmentId) {
            $department = \App\Models\Department::find($departmentId);
            $departmentName = $department ? $department->name : "Department ID: {$departmentId}";
            $parts[] = "Belongs to: {$departmentName} (Department)";
            
            // Also include faculty if available
            if ($facultyId) {
                $faculty = \App\Models\Faculty::find($facultyId);
                $facultyName = $faculty ? $faculty->name : "Faculty ID: {$facultyId}";
                $parts[] = "Under Faculty: {$facultyName}";
            }
        }
        
        // Position type and hierarchy
        if ($position->position_type) {
            $typeLabel = $this->formatPositionType($position->position_type);
            $parts[] = "Type: {$typeLabel}";
        }
        
        if ($position->hierarchy_level) {
            $parts[] = "Hierarchy Level: {$position->hierarchy_level}";
        }
        
        // Creation metadata
        $parts[] = "Creation Type: Auto-created";
        $parts[] = "Created: " . ($position->created_at ? $position->created_at->format('Y-m-d H:i:s') : 'N/A');
        
        return implode("\n", $parts);
    }

    /**
     * Format position type for display.
     */
    protected function formatPositionType(string $type): string
    {
        return match($type) {
            'faculty_leadership' => 'Faculty Leadership',
            'department_leadership' => 'Department Leadership',
            'faculty_member' => 'Faculty Member',
            'administrative_staff' => 'Administrative Staff',
            default => ucfirst(str_replace('_', ' ', $type)),
        };
    }
}

