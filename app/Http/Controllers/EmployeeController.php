<?php

namespace App\Http\Controllers;

use App\Imports\CsForm212Importer;
use App\Models\Employee;
use App\Models\EmployeeChildren;
use App\Models\EmployeeEducationalBackground;
use App\Models\EmployeeFamilyBackground;
use App\Models\EmployeeCivilServiceEligibility;
use App\Models\EmployeeLearningDevelopment;
use App\Models\EmployeeOtherInformation;
use App\Models\EmployeeVoluntaryWork;
use App\Models\EmployeeWorkExperience;
use App\Models\Department;
use App\Models\Faculty;
use App\Models\Position;
use App\Models\Questionnaire;
use App\Models\Reference;
use App\Models\EmployeeAuditLog;
use App\Models\LeaveType;
use App\Services\LeaveService;
use App\Rules\PhilHealthNumber;
use App\Rules\SSSNumber;
use App\Rules\TINNumber;
use App\Rules\PagIbigNumber;
use App\Rules\PhilippineMobileNumber;
use App\Rules\NameField;
use App\Rules\ZipCode;
use App\Rules\DateNotFuture;
use App\Rules\DateRange;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Inertia\Inertia;
use App\Services\EmployeeScopeService;
use App\Models\User;

class EmployeeController extends Controller
{
    protected EmployeeScopeService $scopeService;

    public function __construct(EmployeeScopeService $scopeService)
    {
        $this->scopeService = $scopeService;
    }

    public function index(Request $request)
    {
        abort_unless($request->user()->can('access-employees-module'), 403, 'Unauthorized action.');
        
        $perPage = $request->integer('per_page', 10);
        $search = $request->input('search', '');
        $searchMode = $request->input('search_mode', 'any');
        $status = $request->input('status', '');
        // Handle both single value and array for department_id
        $departmentId = $request->input('department_id', '');
        $departmentIds = $request->input('department_ids', []);
        if (is_string($departmentIds)) {
            $departmentIds = json_decode($departmentIds, true) ?? [];
        }
        if (!empty($departmentId) && empty($departmentIds)) {
            $departmentIds = [$departmentId];
        }
        // Handle both single value and array for position_id
        $positionId = $request->input('position_id', '');
        $positionIds = $request->input('position_ids', []);
        if (is_string($positionIds)) {
            $positionIds = json_decode($positionIds, true) ?? [];
        }
        if (!empty($positionId) && empty($positionIds)) {
            $positionIds = [$positionId];
        }
        $employeeType = $request->input('employee_type', '');
        $sortBy = $request->input('sort_by', 'created_at');
        $sortOrder = $request->input('sort_order', 'asc');
        $showDeleted = $request->boolean('show_deleted', false);
        
        // Get visible columns from request
        $visibleColumns = $request->input('visible_columns', []);
        if (is_string($visibleColumns)) {
            $visibleColumns = json_decode($visibleColumns, true) ?? [];
        }

        // Map frontend column keys to backend relationships
        $relationshipMap = [
            'department.faculty_name' => 'department',
            'position.pos_name' => 'position',
            'family_background' => 'familyBackground',
            'children' => 'children',
            'educational_background' => 'educationalBackground',
            'civil_service_eligibility' => 'civilServiceEligibility',
            'work_experience' => 'workExperience',
            'voluntary_work' => 'voluntaryWork',
            'learning_development' => 'learningDevelopment',
            'questionnaire' => 'questionnaire',
            'references' => 'references',
            'other_information' => 'otherInformation',
        ];

        // Build relationships array based on visible columns
        $relationshipsToLoad = [];
        // Always load department and position as they're commonly used
        $relationshipsToLoad[] = 'department';
        $relationshipsToLoad[] = 'position';
        
        foreach ($visibleColumns as $columnKey) {
            if (isset($relationshipMap[$columnKey])) {
                $relation = $relationshipMap[$columnKey];
                if (!in_array($relation, $relationshipsToLoad)) {
                    $relationshipsToLoad[] = $relation;
                }
            }
        }

        // Validate sort parameters
        $allowedSortColumns = [
            'id', 'surname', 'first_name', 'middle_name', 'status',
            'employment_status', 'employee_type', 'birth_date',
            'date_hired', 'date_regularized', 'created_at', 'updated_at',
            'department.faculty_name', 'position.pos_name'
        ];
        if (!in_array($sortBy, $allowedSortColumns)) {
            $sortBy = 'created_at';
        }
        $sortOrder = strtolower($sortOrder) === 'desc' ? 'desc' : 'asc';

        // Apply scope restrictions based on user's role/position
        $scopeQuery = $this->scopeService->getEmployeeScope($request->user());

        $employees = Employee::with($relationshipsToLoad)
            ->when($scopeQuery !== null, function ($query) use ($scopeQuery) {
                // Apply scope restrictions
                $query->whereIn('id', $scopeQuery->select('id'));
            })
        ->when($showDeleted, function ($query) {
            // Show only soft-deleted employees
            $query->onlyTrashed();
        })
        // When showDeleted is false, default SoftDeletes behavior applies (excludes deleted)
        ->when($search, function ($query) use ($search, $searchMode) {
            $query->where(function ($q) use ($search, $searchMode) {
                switch ($searchMode) {
                    case 'id':
                        $q->where('id', 'like', "%{$search}%");
                        break;
                    case 'name':
                        $q->where(function ($nameQuery) use ($search) {
                            $nameQuery->where('surname', 'like', "%{$search}%")
                                     ->orWhere('first_name', 'like', "%{$search}%")
                                     ->orWhere('middle_name', 'like', "%{$search}%");
                        });
                        break;
                    case 'position':
                        $q->whereHas('position', function ($posQuery) use ($search) {
                            $posQuery->where('pos_name', 'like', "%{$search}%");
                        });
                        break;
                    case 'department':
                        $q->whereHas('department', function ($deptQuery) use ($search) {
                            $deptQuery->where('faculty_name', 'like', "%{$search}%");
                        });
                        break;
                    default: // 'any'
                        $q->where('id', 'like', "%{$search}%")
                          ->orWhere('surname', 'like', "%{$search}%")
                          ->orWhere('first_name', 'like', "%{$search}%")
                          ->orWhere('middle_name', 'like', "%{$search}%")
                          ->orWhere('email_address', 'like', "%{$search}%")
                          ->orWhere('mobile_no', 'like', "%{$search}%")
                          ->orWhereHas('position', function ($posQuery) use ($search) {
                              $posQuery->where('pos_name', 'like', "%{$search}%");
                          })
                          ->orWhereHas('department', function ($deptQuery) use ($search) {
                              $deptQuery->where('faculty_name', 'like', "%{$search}%");
                          });
                        break;
                }
            });
        })
        ->when($status && in_array($status, ['active', 'inactive', 'on-leave']), function ($query) use ($status) {
            $query->where('status', $status);
        })
        ->when(!empty($departmentIds) && is_array($departmentIds), function ($query) use ($departmentIds) {
            $query->whereIn('department_id', array_filter($departmentIds));
        })
        ->when(!empty($departmentId) && empty($departmentIds), function ($query) use ($departmentId) {
            $query->where('department_id', $departmentId);
        })
        ->when(!empty($positionIds) && is_array($positionIds), function ($query) use ($positionIds) {
            $query->whereIn('position_id', array_filter($positionIds));
        })
        ->when(!empty($positionId) && empty($positionIds), function ($query) use ($positionId) {
            $query->where('position_id', $positionId);
        })
        ->when($employeeType && in_array($employeeType, ['Teaching', 'Non-Teaching']), function ($query) use ($employeeType) {
            $query->where('employee_type', $employeeType);
        })
        ->when($sortBy === 'department.faculty_name' || $sortBy === 'department', function ($query) use ($sortOrder) {
            $query->join('departments', 'employees.department_id', '=', 'departments.id')
                  ->orderBy('departments.faculty_name', $sortOrder)
                  ->select('employees.*')
                  ->distinct();
        })
        ->when($sortBy === 'position.pos_name' || $sortBy === 'position', function ($query) use ($sortOrder) {
            $query->join('positions', 'employees.position_id', '=', 'positions.id')
                  ->orderBy('positions.pos_name', $sortOrder)
                  ->select('employees.*')
                  ->distinct();
        })
        ->when(!in_array($sortBy, ['department.faculty_name', 'department', 'position.pos_name', 'position']), function ($query) use ($sortBy, $sortOrder) {
            $query->orderBy($sortBy, $sortOrder);
        })
        ->paginate($perPage)
        ->withQueryString();

        $employees->getCollection()->transform(function ($employee) {
            foreach ($employee->getRelations() as $relation => $value) {
                if ($value === null) {
                    $employee->setRelation(
                        $relation,
                        in_array($relation, ['department', 'position', 'otherInformation'])
                            ? (object)[]
                            : []
                    );
                }
            }
            return $employee;
        });

        return Inertia::render('employees/index', [
            'employees' => [
                'data' => $employees->items(),
                'links' => $employees->links()->elements,
                'meta' => [
                    'current_page' => $employees->currentPage(),
                    'from' => $employees->firstItem(),
                    'to' => $employees->lastItem(),
                    'total' => $employees->total(),
                    'last_page' => $employees->lastPage(),
                    'per_page' => $employees->perPage(),
                ]
            ],
            'filters' => [
                'search' => $search,
                'search_mode' => $searchMode,
                'per_page' => $perPage,
                'status' => $status,
                'department_id' => !empty($departmentIds) ? (count($departmentIds) === 1 ? $departmentIds[0] : '') : $departmentId,
                'department_ids' => $departmentIds,
                'position_id' => !empty($positionIds) ? (count($positionIds) === 1 ? $positionIds[0] : '') : $positionId,
                'position_ids' => $positionIds,
                'employee_type' => $employeeType,
                'sort_by' => $sortBy,
                'sort_order' => $sortOrder,
                'show_deleted' => $showDeleted,
            ],
            // Load departments/positions for filter dropdowns - filtered by scope
            'departments' => $this->getScopedDepartments($request->user()),
            'positions' => $this->getScopedPositions($request->user()),
        ]);
    }

    public function logs(Request $request)
    {
        $logs = EmployeeAuditLog::with(['employee' => function ($query) {
                $query->withTrashed()->select('id', 'first_name', 'surname', 'middle_name');
            }])
            ->orderBy('action_date', 'desc')
            ->limit(500)
            ->get();

        $employees = Employee::select('id', 'first_name', 'surname')
            ->orderBy('first_name')
            ->get();

        return Inertia::render('employees/logs', [
            'logs' => $logs,
            'employees' => $employees,
        ]);
    }

    public function create(Request $request)
    {
        abort_unless($request->user()->can('create-employee'), 403, 'Unauthorized action.');
        
        return Inertia::render('employees/Create', [
            'departments' => $this->getScopedDepartments($request->user()),
            'positions' => $this->getScopedPositions($request->user()),
            'faculties' => Faculty::active()
                ->select('id', 'name', 'code')
                ->orderBy('name')
                ->get(),
        ]);
    }

    public function importCsForm212(Request $request, CsForm212Importer $importer)
    {
        // Debug logging - check request details BEFORE accessing file
        Log::info('CS Form 212 upload attempt - Request details', [
            'content_length' => $request->header('Content-Length'),
            'content_type' => $request->header('Content-Type'),
            'has_file' => $request->hasFile('pds_file'),
            'all_input_keys' => array_keys($request->all()),
            'expects_json' => $request->expectsJson(),
            'is_ajax' => $request->ajax(),
            'method' => $request->method(),
        ]);
        
        $file = $request->file('pds_file');
        Log::info('CS Form 212 upload attempt - File details', [
            'has_file' => $request->hasFile('pds_file'),
            'file_name' => $file?->getClientOriginalName(),
            'file_size' => $file?->getSize(),
            'file_mime' => $file?->getMimeType(),
            'file_extension' => $file?->getClientOriginalExtension(),
            'file_is_valid' => $file?->isValid(),
            'file_error' => $file?->getError(),
            'file_error_message' => $file?->getErrorMessage(),
            'file_path' => $file?->getRealPath(),
            'file_path_exists' => $file ? file_exists($file->getRealPath()) : false,
        ]);
        
        // Check if file is missing or invalid BEFORE validation
        if (!$request->hasFile('pds_file')) {
            Log::error('CS Form 212 upload - No file in request', [
                'content_length' => $request->header('Content-Length'),
                'content_type' => $request->header('Content-Type'),
                'all_input' => $request->all(),
            ]);
            
            if ($request->expectsJson() || $request->ajax()) {
                return response()->json([
                    'message' => 'Validation failed',
                    'errors' => [
                        'pds_file' => ['No file was uploaded. Please select a file and try again.']
                    ],
                ], 422);
            }
            return back()->withErrors(['pds_file' => 'No file was uploaded. Please select a file and try again.']);
        }
        
        if (!$file || !$file->isValid()) {
            $errorMessage = 'The uploaded file is invalid or corrupted.';
            if ($file && $file->getError()) {
                $errorMessage = 'File upload error: ' . $file->getErrorMessage() . ' (Error code: ' . $file->getError() . ')';
            }
            
            Log::error('CS Form 212 upload - Invalid file', [
                'file_error' => $file?->getError(),
                'file_error_message' => $file?->getErrorMessage(),
                'file_name' => $file?->getClientOriginalName(),
            ]);
            
            if ($request->expectsJson() || $request->ajax()) {
                return response()->json([
                    'message' => 'Validation failed',
                    'errors' => [
                        'pds_file' => [$errorMessage]
                    ],
                ], 422);
            }
            return back()->withErrors(['pds_file' => $errorMessage]);
        }

        try {
            // More flexible validation - check extension and MIME type
        $validated = $request->validate([
                'pds_file' => [
                    'required', 
                    'file', 
                    'mimes:xlsx,xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel',
                    'max:10240' // This is in KB, so 10240 KB = 10 MB
                ],
            ], [
                'pds_file.required' => 'Please select a file to upload.',
                'pds_file.file' => 'The uploaded file is not valid.',
                'pds_file.mimes' => 'The file must be an Excel file (.xlsx or .xls).',
                'pds_file.max' => 'The file size must not exceed 10MB.',
            ]);
            
            // Additional validation: check file extension manually
            $file = $request->file('pds_file');
            
            // Check if file is valid
            if (!$file || !$file->isValid()) {
                $errorMessage = 'The uploaded file is invalid or corrupted.';
                if ($file && $file->getError()) {
                    $errorMessage = 'File upload error: ' . $file->getErrorMessage();
                }
                
                if ($request->expectsJson() || $request->ajax()) {
                    return response()->json([
                        'message' => 'Validation failed',
                        'errors' => [
                            'pds_file' => [$errorMessage]
                        ],
                    ], 422);
                }
                return back()->withErrors(['pds_file' => $errorMessage]);
            }
            
            $extension = strtolower($file->getClientOriginalExtension());
            if (!in_array($extension, ['xlsx', 'xls'])) {
                if ($request->expectsJson() || $request->ajax()) {
                    return response()->json([
                        'message' => 'Validation failed',
                        'errors' => [
                            'pds_file' => ['The file must be an Excel file (.xlsx or .xls). Received: ' . $extension]
                        ],
                    ], 422);
                }
                return back()->withErrors(['pds_file' => 'The file must be an Excel file (.xlsx or .xls).']);
            }
        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::error('CS Form 212 validation failed', [
                'errors' => $e->errors(),
                'file_info' => [
                    'has_file' => $request->hasFile('pds_file'),
                    'file_name' => $request->file('pds_file')?->getClientOriginalName(),
                ],
            ]);
            
            // Return JSON validation errors for AJAX requests
            if ($request->expectsJson() || $request->ajax()) {
                return response()->json([
                    'message' => 'Validation failed',
                    'errors' => $e->errors(),
                ], 422);
            }
            throw $e;
        }

        try {
            $file = $validated['pds_file'];
            $originalPath = $file->getRealPath();
            
            // Verify original file exists and is readable
            if (!$originalPath || !file_exists($originalPath)) {
                throw new \RuntimeException('Uploaded file path is invalid or file does not exist.');
            }
            
            $fileSize = filesize($originalPath);
            if ($fileSize === 0) {
                throw new \RuntimeException('Uploaded file is empty.');
            }
            
            Log::info('CS Form 212 file details', [
                'file_name' => $file->getClientOriginalName(),
                'original_path' => $originalPath,
                'file_size' => $fileSize,
                'file_exists' => file_exists($originalPath),
                'is_readable' => is_readable($originalPath),
                'is_valid' => $file->isValid(),
            ]);
            
            // Try to use the original file path directly first
            // If that doesn't work, we'll use store() as fallback
            $path = $originalPath;
            
            // Verify we can read from the original path
            if (!is_readable($path)) {
                // Fallback: Use store() method
                try {
                    $storedPath = $file->store('temp/cs_form_212', 'local');
                    $path = storage_path('app/' . $storedPath);
                    
                    if (!file_exists($path) || filesize($path) === 0) {
                        throw new \RuntimeException('File was not stored correctly via store() method.');
                    }
                    
                    Log::info('CS Form 212 file stored using store() method', [
                        'stored_path' => $path,
                        'file_size' => filesize($path),
                    ]);
                } catch (\Throwable $storeError) {
                    Log::error('Failed to store file using store() method', [
                        'error' => $storeError->getMessage(),
                    ]);
                    throw new \RuntimeException('Failed to store uploaded file: ' . $storeError->getMessage());
                }
            }
            Log::info('CS Form 212 file details before extraction', [
                'file_name' => $file->getClientOriginalName(),
                'file_path' => $path,
                'file_size' => $fileSize,
                'file_exists' => file_exists($path),
                'is_readable' => is_readable($path),
                'file_size_from_object' => $file->getSize(),
                'file_mime' => $file->getMimeType(),
                'file_extension' => $file->getClientOriginalExtension(),
            ]);
            
            // Double-check file is still valid right before extraction
            if (!file_exists($path)) {
                throw new \RuntimeException('File was deleted before extraction. Path: ' . $path);
            }
            
            if (!is_readable($path)) {
                throw new \RuntimeException('File became unreadable before extraction. Path: ' . $path);
            }
            
            $currentFileSize = filesize($path);
            if ($currentFileSize === 0) {
                throw new \RuntimeException('File became empty before extraction. Path: ' . $path);
            }
            
            if ($currentFileSize !== $fileSize) {
                Log::warning('File size changed before extraction', [
                    'original_size' => $fileSize,
                    'current_size' => $currentFileSize,
                ]);
            }
            
            // Verify file is not empty
            if ($fileSize === 0) {
                throw new \RuntimeException('Uploaded file is empty.');
            }
            
            // Check if file size matches what was uploaded
            if ($file->getSize() !== $fileSize) {
                Log::warning('File size mismatch', [
                    'uploaded_size' => $file->getSize(),
                    'actual_size' => $fileSize,
                ]);
            }
            
            // Copy file to a more permanent location to avoid temp file issues
            $tempStoragePath = storage_path('app/temp/' . uniqid('cs_form_212_', true) . '_' . $file->getClientOriginalName());
            $tempStorageDir = dirname($tempStoragePath);
            if (!is_dir($tempStorageDir)) {
                $created = @mkdir($tempStorageDir, 0755, true);
                if (!$created) {
                    Log::error('CS Form 212 - Failed to create temp directory', [
                        'directory' => $tempStorageDir,
                        'parent_exists' => is_dir(dirname($tempStorageDir)),
                        'parent_writable' => is_writable(dirname($tempStorageDir)),
                        'error' => error_get_last(),
                    ]);
                    throw new \RuntimeException('Failed to create temporary storage directory. Please check file permissions on storage/app/temp.');
                }
            }
            
            // Verify directory is writable
            if (!is_writable($tempStorageDir)) {
                Log::error('CS Form 212 - Temp directory not writable', [
                    'directory' => $tempStorageDir,
                    'permissions' => substr(sprintf('%o', fileperms($tempStorageDir)), -4),
                ]);
                throw new \RuntimeException('Temporary storage directory is not writable. Please check file permissions on storage/app/temp.');
            }
            
            // Read file content into memory using stream to avoid memory issues
            $originalHandle = fopen($path, 'rb');
            if (!$originalHandle) {
                throw new \RuntimeException('Cannot open uploaded file for reading.');
            }
            
            // Read file in chunks and write to temp location
            $tempHandle = fopen($tempStoragePath, 'wb');
            if (!$tempHandle) {
                fclose($originalHandle);
                throw new \RuntimeException('Cannot create temporary file for writing.');
            }
            
            // Copy file in chunks (8KB at a time) to handle large files
            $bytesCopied = 0;
            while (!feof($originalHandle)) {
                $chunk = fread($originalHandle, 8192);
                if ($chunk === false) {
                    fclose($originalHandle);
                    fclose($tempHandle);
                    @unlink($tempStoragePath);
                    throw new \RuntimeException('Error reading from uploaded file.');
                }
                $written = fwrite($tempHandle, $chunk);
                if ($written === false) {
                    fclose($originalHandle);
                    fclose($tempHandle);
                    @unlink($tempStoragePath);
                    throw new \RuntimeException('Error writing to temporary file.');
                }
                $bytesCopied += $written;
            }
            
            // Close handles and ensure data is written to disk
            fclose($originalHandle);
            fflush($tempHandle); // Flush any buffered data
            fclose($tempHandle);
            
            // Verify the copied file
            if (!file_exists($tempStoragePath) || filesize($tempStoragePath) === 0) {
                @unlink($tempStoragePath);
                throw new \RuntimeException('Copied file is invalid or empty. Expected ' . $fileSize . ' bytes, got ' . filesize($tempStoragePath) . ' bytes.');
            }
            
            if ($bytesCopied !== $fileSize) {
                @unlink($tempStoragePath);
                throw new \RuntimeException('File size mismatch. Expected ' . $fileSize . ' bytes, copied ' . $bytesCopied . ' bytes.');
            }
            
            Log::info('CS Form 212 file copied to temp storage', [
                'original_path' => $path,
                'original_size' => $fileSize,
                'temp_path' => $tempStoragePath,
                'temp_size' => filesize($tempStoragePath),
                'bytes_copied' => $bytesCopied,
                'file_mime' => $file->getMimeType(),
            ]);
            
            // Small delay to ensure file system has fully written the file
            usleep(100000); // 100ms delay
            
            // Verify file is readable
            if (!is_readable($tempStoragePath)) {
                @unlink($tempStoragePath);
                throw new \RuntimeException('Temporary file is not readable.');
            }
            
            // Verify file integrity - check first few bytes for Excel signature
            $verifyHandle = fopen($tempStoragePath, 'rb');
            if (!$verifyHandle) {
                @unlink($tempStoragePath);
                throw new \RuntimeException('Cannot open copied file for verification.');
            }
            
            $firstBytes = fread($verifyHandle, 8);
            fclose($verifyHandle);
            
            // Excel files start with specific signatures
            // XLSX: PK (ZIP signature) - 50 4B 03 04
            // XLS: D0 CF 11 E0 (OLE2 signature)
            if (substr($firstBytes, 0, 2) === 'PK') {
                // XLSX file (ZIP archive)
                Log::info('File signature check: XLSX format detected (ZIP signature)');
            } elseif (substr($firstBytes, 0, 4) === "\xD0\xCF\x11\xE0") {
                // XLS file (OLE2 format)
                Log::info('File signature check: XLS format detected (OLE2 signature)');
            } else {
                Log::warning('File signature check: Unknown format', [
                    'first_bytes_hex' => bin2hex($firstBytes),
                ]);
            }
            
            // Validate XLSX file structure before attempting to read
            try {
                // Verify it's a valid ZIP archive (XLSX files are ZIP archives)
                $zip = new \ZipArchive();
                $zipResult = $zip->open($tempStoragePath, \ZipArchive::CHECKCONS);
                
                if ($zipResult !== true) {
                    Log::error('CS Form 212 file is not a valid ZIP archive', [
                        'file_name' => $file->getClientOriginalName(),
                        'zip_error_code' => $zipResult,
                        'temp_path' => $tempStoragePath,
                        'file_size' => filesize($tempStoragePath),
                    ]);
                    throw new \RuntimeException('The Excel file appears to be corrupted. It is not a valid ZIP archive. Please re-save the file in Excel and try again.');
                }
                
                // Check for required XML files in the ZIP and validate their content
                $requiredFiles = ['[Content_Types].xml', '_rels/.rels'];
                $missingFiles = [];
                $emptyFiles = [];
                $invalidXmlFiles = [];
                
                foreach ($requiredFiles as $requiredFile) {
                    $index = $zip->locateName($requiredFile);
                    if ($index === false) {
                        $missingFiles[] = $requiredFile;
                        continue;
                    }
                    
                    // Read the file content
                    $content = $zip->getFromIndex($index);
                    
                    // Check if file is empty
                    if ($content === false || trim($content) === '') {
                        $emptyFiles[] = $requiredFile;
                        continue;
                    }
                    
                    // Try to parse as XML to check if it's valid
                    libxml_use_internal_errors(true);
                    $xml = @simplexml_load_string($content);
                    $xmlErrors = libxml_get_errors();
                    libxml_clear_errors();
                    
                    if ($xml === false || !empty($xmlErrors)) {
                        $invalidXmlFiles[] = $requiredFile;
                        Log::warning('Invalid XML in required file', [
                            'file' => $requiredFile,
                            'content_length' => strlen($content),
                            'xml_errors' => array_map(function($error) {
                                return $error->message;
                            }, $xmlErrors),
                        ]);
                    }
                }
                
                // Also check for xl/workbook.xml which is critical for PhpSpreadsheet
                $workbookIndex = $zip->locateName('xl/workbook.xml');
                if ($workbookIndex !== false) {
                    $workbookContent = $zip->getFromIndex($workbookIndex);
                    if ($workbookContent === false || trim($workbookContent) === '') {
                        $emptyFiles[] = 'xl/workbook.xml';
                    } else {
                        // Validate workbook.xml
                        libxml_use_internal_errors(true);
                        $workbookXml = @simplexml_load_string($workbookContent);
                        $workbookErrors = libxml_get_errors();
                        libxml_clear_errors();
                        
                        if ($workbookXml === false || !empty($workbookErrors)) {
                            $invalidXmlFiles[] = 'xl/workbook.xml';
                        }
                    }
                } else {
                    $missingFiles[] = 'xl/workbook.xml';
                }
                
                $zip->close();
                
                // Report all issues found
                if (!empty($missingFiles)) {
                    Log::error('CS Form 212 file missing required XML files', [
                        'file_name' => $file->getClientOriginalName(),
                        'missing_files' => $missingFiles,
                    ]);
                    throw new \RuntimeException('The Excel file structure is invalid. Required files are missing: ' . implode(', ', $missingFiles) . '. The file may be corrupted. Please re-save it in Excel.');
                }
                
                if (!empty($emptyFiles)) {
                    Log::error('CS Form 212 file has empty XML files', [
                        'file_name' => $file->getClientOriginalName(),
                        'empty_files' => $emptyFiles,
                    ]);
                    throw new \RuntimeException('The Excel file contains empty or corrupted XML files: ' . implode(', ', $emptyFiles) . '. The file appears to be corrupted. Please open it in Excel, re-save it, and try uploading again.');
                }
                
                if (!empty($invalidXmlFiles)) {
                    Log::error('CS Form 212 file has invalid XML files', [
                        'file_name' => $file->getClientOriginalName(),
                        'invalid_files' => $invalidXmlFiles,
                    ]);
                    throw new \RuntimeException('The Excel file contains invalid XML structure in: ' . implode(', ', $invalidXmlFiles) . '. The file appears to be corrupted. Please open it in Excel, re-save it, and try uploading again.');
                }
                
                Log::info('CS Form 212 file ZIP structure and XML validated', [
                    'file_name' => $file->getClientOriginalName(),
                ]);
            } catch (\RuntimeException $e) {
                // Re-throw our custom errors
                throw $e;
            } catch (\Throwable $zipError) {
                // Log ZIP validation errors but continue with PhpSpreadsheet
                Log::warning('ZIP validation failed, will try PhpSpreadsheet anyway', [
                    'error' => $zipError->getMessage(),
                ]);
            }
            
            // Additional validation: Try to read the file one more time to ensure it's fully written
            clearstatcache(true, $tempStoragePath);
            $finalCheckSize = filesize($tempStoragePath);
            if ($finalCheckSize !== $fileSize) {
                Log::warning('File size changed after copy', [
                    'original_size' => $fileSize,
                    'final_size' => $finalCheckSize,
                ]);
            }
            
            // Try to load with explicit Xlsx reader and better error handling
            try {
                // Use explicit Xlsx reader with error reporting enabled
                $reader = \PhpOffice\PhpSpreadsheet\IOFactory::createReader('Xlsx');
                $reader->setReadDataOnly(false);
                $reader->setReadEmptyCells(true);
                
                // Enable libxml error handling to catch XML parsing issues
                libxml_use_internal_errors(true);
                
                try {
                    $spreadsheet = $reader->load($tempStoragePath);
                } finally {
                    // Check for any XML errors that occurred during loading
                    $xmlErrors = libxml_get_errors();
                    libxml_clear_errors();
                    
                    if (!empty($xmlErrors)) {
                        $xmlErrorMessages = array_map(function($error) {
                            return trim($error->message);
                        }, $xmlErrors);
                        
                        Log::error('XML parsing errors during PhpSpreadsheet load', [
                            'file_name' => $file->getClientOriginalName(),
                            'xml_errors' => $xmlErrorMessages,
                            'temp_path' => $tempStoragePath,
                        ]);
                        
                        // If we have XML errors but the spreadsheet still loaded, log it
                        // If it didn't load, the exception below will handle it
                    }
                }
                
                $sheetNames = [];
                foreach ($spreadsheet->getWorksheetIterator() as $worksheet) {
                    $sheetNames[] = $worksheet->getTitle();
                }
                
                Log::info('CS Form 212 file sheets detected', [
                    'file_name' => $file->getClientOriginalName(),
                    'sheets_found' => $sheetNames,
                    'expected_sheets' => ['C1', 'C2', 'C3', 'C4'],
                ]);
            } catch (\PhpOffice\PhpSpreadsheet\Reader\Exception $e) {
                $errorMessage = $e->getMessage();
                $previousException = $e->getPrevious();
                
                Log::error('Could not inspect file sheets before extraction (PhpSpreadsheet error)', [
                    'error' => $errorMessage,
                    'exception_class' => get_class($e),
                    'previous_exception' => $previousException ? get_class($previousException) . ': ' . $previousException->getMessage() : null,
                    'temp_path' => $tempStoragePath,
                    'file_size' => filesize($tempStoragePath),
                    'file_exists' => file_exists($tempStoragePath),
                    'is_readable' => is_readable($tempStoragePath),
                    'trace' => $e->getTraceAsString(),
                ]);
                
                // Provide user-friendly error message
                if (str_contains($errorMessage, 'simplexml_load_string') || str_contains($errorMessage, 'Document is empty')) {
                    throw new \RuntimeException('The Excel file appears to be corrupted or incomplete. The XML structure inside the file is invalid or empty. This usually happens when a file is partially saved or corrupted during transfer. Please: 1) Open the file in Excel, 2) Re-save it (File > Save As), 3) Try uploading again.');
                } elseif (str_contains($errorMessage, 'password') || str_contains($errorMessage, 'encrypted')) {
                    throw new \RuntimeException('The Excel file is password-protected. Please remove the password protection and try again.');
                } else {
                    throw new \RuntimeException('Unable to read the Excel file. It may be corrupted or in an unsupported format. Please re-save the file in Excel and try again.');
                }
            } catch (\ErrorException $e) {
                // Catch libxml errors that might be thrown as ErrorException
                $errorMessage = $e->getMessage();
                
                Log::error('Could not inspect file sheets before extraction (XML parsing error)', [
                    'error' => $errorMessage,
                    'exception_class' => get_class($e),
                    'temp_path' => $tempStoragePath,
                    'file_size' => filesize($tempStoragePath),
                    'file_exists' => file_exists($tempStoragePath),
                    'is_readable' => is_readable($tempStoragePath),
                    'trace' => $e->getTraceAsString(),
                ]);
                
                if (str_contains($errorMessage, 'simplexml_load_string') || str_contains($errorMessage, 'Document is empty')) {
                    throw new \RuntimeException('The Excel file contains corrupted or empty XML files. Please open the file in Excel, re-save it, and try uploading again.');
                }
                
                throw new \RuntimeException('Unable to read the Excel file due to XML parsing error: ' . $errorMessage);
            } catch (\Throwable $e) {
                Log::error('Could not inspect file sheets before extraction (General error)', [
                    'error' => $e->getMessage(),
                    'exception_class' => get_class($e),
                    'temp_path' => $tempStoragePath,
                    'file_size' => filesize($tempStoragePath),
                    'file_exists' => file_exists($tempStoragePath),
                    'is_readable' => is_readable($tempStoragePath),
                    'trace' => $e->getTraceAsString(),
                ]);
                throw new \RuntimeException('Unable to read the Excel file. It may be corrupted or in an unsupported format: ' . $e->getMessage());
            }
            
            // Try extraction with detailed error handling
            try {
                // Use the temp storage path for extraction (not the original temp file)
                $data = $importer->extract($tempStoragePath);
                
                Log::info('CS Form 212 extraction successful', [
                    'file_name' => $file->getClientOriginalName(),
                    'fields_extracted' => count($data),
                ]);
                
                // Clean up temporary file after successful extraction
                if (isset($tempStoragePath) && file_exists($tempStoragePath)) {
                    @unlink($tempStoragePath);
                }
            } catch (\PhpOffice\PhpSpreadsheet\Reader\Exception $extractError) {
                // Clean up temporary file on error
                if (isset($tempStoragePath) && file_exists($tempStoragePath)) {
                    @unlink($tempStoragePath);
                }
                // PhpSpreadsheet specific errors (corrupted file, unsupported format, etc.)
                Log::error('CS Form 212 extraction failed (PhpSpreadsheet error)', [
                    'file_name' => $file->getClientOriginalName(),
                    'file_path' => $path,
                    'file_size' => $fileSize,
                    'error' => $extractError->getMessage(),
                    'exception_class' => get_class($extractError),
                    'trace' => $extractError->getTraceAsString(),
                ]);
                throw $extractError;
            } catch (\RuntimeException $extractError) {
                // Clean up temporary file on error
                if (isset($tempStoragePath) && file_exists($tempStoragePath)) {
                    @unlink($tempStoragePath);
                }
                
                // Runtime errors from the importer
                Log::error('CS Form 212 extraction failed (Runtime error)', [
                    'file_name' => $file->getClientOriginalName(),
                    'temp_path' => $tempStoragePath ?? null,
                    'file_size' => $fileSize,
                    'file_exists' => isset($tempStoragePath) ? file_exists($tempStoragePath) : null,
                    'is_readable' => isset($tempStoragePath) ? is_readable($tempStoragePath) : null,
                    'error' => $extractError->getMessage(),
                    'exception_class' => get_class($extractError),
                    'trace' => $extractError->getTraceAsString(),
                ]);
                throw $extractError;
            } catch (\Throwable $extractError) {
                // Clean up temporary file on error
                if (isset($tempStoragePath) && file_exists($tempStoragePath)) {
                    @unlink($tempStoragePath);
                }
                
                // Any other errors
                Log::error('CS Form 212 extraction failed (General error)', [
                    'file_name' => $file->getClientOriginalName(),
                    'temp_path' => $tempStoragePath ?? null,
                    'file_size' => $fileSize,
                    'error' => $extractError->getMessage(),
                    'exception_class' => get_class($extractError),
                    'trace' => $extractError->getTraceAsString(),
                ]);
                throw $extractError;
            }
        } catch (\PhpOffice\PhpSpreadsheet\Reader\Exception $e) {
            // Clean up temporary file on error
            if (isset($tempStoragePath) && file_exists($tempStoragePath)) {
                @unlink($tempStoragePath);
            }
            // PhpSpreadsheet couldn't read the file
            Log::error('Failed to read CS Form 212 file (PhpSpreadsheet error)', [
                'file_name' => $request->file('pds_file')?->getClientOriginalName(),
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            $errorMessage = 'The file could not be read. It may be corrupted or in an unsupported format.';
            
            if ($request->expectsJson() || $request->ajax()) {
                return response()->json([
                    'error' => $errorMessage,
                    'message' => $errorMessage,
                    'details' => 'Please ensure the file is a valid Excel file (.xlsx or .xls) and try again.',
                ], 422);
            }

            return back()->with('error', $errorMessage);
        } catch (\RuntimeException $e) {
            // Runtime errors from the importer (e.g., no sheets, can't read file)
            Log::error('Failed to import CS Form 212 (Runtime error)', [
                'file_name' => $request->file('pds_file')?->getClientOriginalName(),
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            $errorMessage = $e->getMessage();
            if (str_contains($errorMessage, 'readable sheets')) {
                $errorMessage = 'The file does not contain any readable sheets. Please check the file format.';
            } elseif (str_contains($errorMessage, 'Unable to read')) {
                $errorMessage = 'Unable to read the file. It may be corrupted or password-protected.';
            }
            
            if ($request->expectsJson() || $request->ajax()) {
                return response()->json([
                    'error' => $errorMessage,
                    'message' => $errorMessage,
                    'details' => 'Please ensure the file follows the CS Form 212 template format.',
                ], 422);
            }

            return back()->with('error', $errorMessage);
        } catch (\Throwable $exception) {
            // Catch any other exceptions
            $exceptionMessage = $exception->getMessage();
            $exceptionClass = get_class($exception);
            
            // Try to get sheet information for better error message
            $sheetInfo = null;
            try {
                $file = $validated['pds_file'] ?? $request->file('pds_file');
                if ($file) {
                    $path = $file->getRealPath();
                    $spreadsheet = \PhpOffice\PhpSpreadsheet\IOFactory::load($path);
                    $sheetNames = [];
                    foreach ($spreadsheet->getWorksheetIterator() as $worksheet) {
                        $sheetNames[] = $worksheet->getTitle();
                    }
                    $sheetInfo = [
                        'sheets_found' => $sheetNames,
                        'expected_sheets' => ['C1', 'C2', 'C3', 'C4'],
                        'has_c1' => in_array('C1', $sheetNames),
                        'has_c2' => in_array('C2', $sheetNames),
                        'has_c3' => in_array('C3', $sheetNames),
                        'has_c4' => in_array('C4', $sheetNames),
                    ];
                }
            } catch (\Throwable $e) {
                // Ignore errors when trying to get sheet info
            }
            
            Log::error('Failed to import CS Form 212 (Unexpected error)', [
                'file_name' => $request->file('pds_file')?->getClientOriginalName(),
                'error' => $exceptionMessage,
                'exception_class' => $exceptionClass,
                'sheet_info' => $sheetInfo,
                'trace' => $exception->getTraceAsString(),
            ]);

            $errorMessage = 'Unable to process the CS Form 212 file. The file may not match the expected template format.';
            $details = 'Please ensure the file follows the configured CS Form 212 template. If the file worked before, it may have been modified or saved in a different format.';
            
            // Provide more specific error based on exception message
            if (str_contains($exceptionMessage, 'sheet') || str_contains($exceptionMessage, 'cell')) {
                $errorMessage = 'The file structure does not match the expected CS Form 212 template. Please use the official template.';
            }
            
            // If we have sheet info, provide more specific guidance
            if ($sheetInfo) {
                $missingSheets = [];
                if (!$sheetInfo['has_c1']) $missingSheets[] = 'C1';
                if (!$sheetInfo['has_c2']) $missingSheets[] = 'C2';
                if (!$sheetInfo['has_c3']) $missingSheets[] = 'C3';
                if (!$sheetInfo['has_c4']) $missingSheets[] = 'C4';
                
                if (!empty($missingSheets)) {
                    $errorMessage = 'The file is missing required sheets: ' . implode(', ', $missingSheets) . '. Please use the official CS Form 212 template.';
                    $details = 'Found sheets: ' . implode(', ', $sheetInfo['sheets_found']) . '. Expected sheets: C1, C2, C3, C4.';
                } elseif (count($sheetInfo['sheets_found']) > 4) {
                    $errorMessage = 'The file has extra sheets or different sheet names than expected.';
                    $details = 'Found sheets: ' . implode(', ', $sheetInfo['sheets_found']) . '. Expected sheets: C1, C2, C3, C4.';
                }
            }

            // Return JSON for AJAX requests, otherwise redirect back
            if ($request->expectsJson() || $request->ajax()) {
                return response()->json([
                    'error' => $errorMessage,
                    'message' => $errorMessage,
                    'details' => $details,
                    'sheet_info' => $sheetInfo,
                ], 422);
            }

            return back()->with('error', $errorMessage);
        }

        // Return JSON for AJAX requests, otherwise redirect back
        if ($request->expectsJson() || $request->ajax()) {
            return response()->json([
                'importedData' => $data,
                'success' => 'CS Form 212 data extracted successfully. Review the auto-filled form before saving.',
                'message' => 'CS Form 212 data extracted successfully. Review the auto-filled form before saving.',
            ]);
        }

        return back()
            ->with('importedData', $data)
            ->with('success', 'CS Form 212 data extracted successfully. Review the auto-filled form before saving.');
    }

    public function store(Request $request)
    {
        abort_unless($request->user()->can('create-employee'), 403, 'Unauthorized action.');
        
        $validated = $request->validate(
            $this->employeeValidationRules(true, $request),
            $this->employeeValidationMessages()
        );
        
        // Validate related data
        $relatedErrors = $this->validateRelatedData($request);
        if (!empty($relatedErrors)) {
            return back()->withErrors($relatedErrors)->withInput();
        }

        DB::transaction(function () use ($request, $validated) {
            // Normalize empty department_id to null for faculty-level positions
            if (isset($validated['department_id']) && $validated['department_id'] === '') {
                $validated['department_id'] = null;
            }
            
            $employee = Employee::create($validated);
            $this->handleRelatedData($request, $employee);
            
            // Log employee creation - simple text message
            $employeeName = $this->getEmployeeFullName($employee);
            EmployeeAuditLog::create([
                'employee_id' => $employee->id,
                'action_type' => 'CREATE',
                'field_changed' => null,
                'old_value' => null,
                'new_value' => "Created a New Employee Record: {$employeeName}",
                'action_date' => now(),
                'performed_by' => auth()->user()?->name ?? 'System',
            ]);
            
            // Don't log position assignment during creation - it's already part of the CREATE log
            // Position assignment logging only happens during updates

            // Initialize leave balances for new employee
            $this->initializeLeaveBalances($employee);
        });

        return redirect()->route('employees.index')->with('success', 'Employee created successfully.');
    }

     /**
     * Get scoped departments based on user's access level.
     */
    protected function getScopedDepartments(User $user)
    {
        $manageableDeptIds = $this->scopeService->getManageableDepartmentIds($user);
        
        $query = Department::select('id', 'faculty_name as name', 'type', 'faculty_id')
            ->orderBy('faculty_name');
        
        // null means no restrictions (super admin/admin) - return all
        // array with values means filter by those IDs
        // empty array means no access
        if ($manageableDeptIds === null) {
            // Super admin/admin - return all departments
            // No filter needed
        } elseif (!empty($manageableDeptIds)) {
            $query->whereIn('id', $manageableDeptIds);
        } else {
            // Empty array - no access
            return collect();
        }
        
        return $query->get();
    }

    /**
     * Get scoped positions based on user's access level.
     */
    protected function getScopedPositions(User $user)
    {
        $manageableDeptIds = $this->scopeService->getManageableDepartmentIds($user);
        $manageableFacultyIds = $this->scopeService->getManageableFacultyIds($user);
        
        $query = Position::select('id', 'pos_name', 'pos_name as name', 'department_id', 'faculty_id')
            ->orderBy('pos_name');
        
        // Super admin/admin get all positions (null means no restrictions)
        if ($manageableDeptIds === null && $manageableFacultyIds === null) {
            // Return all - no filter needed
        } elseif (!empty($manageableDeptIds) || !empty($manageableFacultyIds)) {
            $query->where(function ($q) use ($manageableDeptIds, $manageableFacultyIds) {
                if (!empty($manageableDeptIds)) {
                    $q->whereIn('department_id', $manageableDeptIds);
                }
                if (!empty($manageableFacultyIds)) {
                    $q->orWhere(function ($q2) use ($manageableFacultyIds) {
                        $q2->whereIn('faculty_id', $manageableFacultyIds)
                           ->whereNull('department_id'); // Faculty-level positions
                    });
                }
            });
        } else {
            // No access - return empty
            return collect();
        }
        
        return $query->get();
    }

    public function show(Request $request, Employee $employee)
    {
        abort_unless($request->user()->can('view-employee'), 403, 'Unauthorized action.');
        
        // Check if user can view this employee (scope check)
        if (!$this->scopeService->canViewEmployee($request->user(), $employee)) {
            abort(403, 'You do not have permission to view this employee.');
        }

        $employee->load([
            'familyBackground',
            'children',
            'educationalBackground',
            'civilServiceEligibility',
            'workExperience',
            'voluntaryWork',
            'learningDevelopment',
            'otherInformation',
            'questionnaire',
            'references',
            'department',
            'position'
        ]);

        $employeeData = [
            ...$employee->toArray(),
            'family_background' => $employee->familyBackground->isEmpty() ? [
                [ 'relation' => 'Father', 'surname' => '', 'first_name' => '', 'middle_name' => '', 'name_extension' => '', 'occupation' => '', 'employer' => '', 'business_address' => '', 'telephone_no' => '' ],
                [ 'relation' => 'Mother', 'surname' => '', 'first_name' => '', 'middle_name' => '', 'name_extension' => '', 'occupation' => '', 'employer' => '', 'business_address' => '', 'telephone_no' => '' ]
            ] : $employee->familyBackground->toArray(),
            'children' => $employee->children->toArray(),
            'educational_background' => $employee->educationalBackground->toArray(),
            'civil_service_eligibility' => $employee->civilServiceEligibility->toArray(),
            'work_experience' => $employee->workExperience->toArray(),
            'voluntary_work' => $employee->voluntaryWork->toArray(),
            'learning_development' => $employee->learningDevelopment->toArray(),
            'questionnaire' => $employee->questionnaire->isEmpty() ? [
                ['question_number' => 341, 'answer' => false, 'details' => ''], // 34a
                ['question_number' => 342, 'answer' => false, 'details' => ''], // 34b
                ['question_number' => 351, 'answer' => false, 'details' => ''], // 35a
                ['question_number' => 352, 'answer' => false, 'details' => ''], // 35b
                ['question_number' => 36, 'answer' => false, 'details' => ''],
                ['question_number' => 37, 'answer' => false, 'details' => ''],
                ['question_number' => 381, 'answer' => false, 'details' => ''], // 38a
                ['question_number' => 382, 'answer' => false, 'details' => ''], // 38b
                ['question_number' => 39, 'answer' => false, 'details' => ''],
                ['question_number' => 401, 'answer' => false, 'details' => ''], // 40a
                ['question_number' => 402, 'answer' => false, 'details' => ''], // 40b
                ['question_number' => 403, 'answer' => false, 'details' => ''], // 40c
            ] : $employee->questionnaire->toArray(),
            'references' => $employee->references->map(function ($ref) {
                // Combine first_name, middle_initial, and surname into fullname
                $nameParts = array_filter([
                    $ref->first_name ?? '',
                    $ref->middle_initial ? strtoupper($ref->middle_initial) : '',
                    $ref->surname ?? ''
                ]);
                $fullname = implode(' ', $nameParts);
                
                return [
                    'fullname' => $fullname,
                    'address' => $ref->address ?? '',
                    'telephone_no' => $ref->telephone_no ?? '',
                ];
            })->toArray(),
            'other_information' => $employee->otherInformation ?? (object)['skill_or_hobby' => '', 'non_academic_distinctions' => '', 'memberships' => '']
        ];

        return Inertia::render('employees/Create', [
            'employee' => $employeeData,
            'departments' => $this->getScopedDepartments($request->user()),
            'positions' => $this->getScopedPositions($request->user()),
            'faculties' => Faculty::active()
                ->select('id', 'name', 'code')
                ->orderBy('name')
                ->get(),
            'mode' => 'view' // Pass view mode to component
        ]);
    }

    public function myProfile(Request $request)
    {
        $user = $request->user();
        
        if (!$user || !$user->employee_id) {
            return redirect()->route('dashboard')->with('error', 'No employee record found for your account.');
        }

        $employee = Employee::findOrFail($user->employee_id);
        return $this->profile($employee);
    }

    public function profile(Employee $employee)
    {
        // Use with() instead of load() to ensure relationships are eager loaded
        $employee = Employee::with([
            'familyBackground',
            'children',
            'educationalBackground',
            'civilServiceEligibility',
            'workExperience',
            'voluntaryWork',
            'learningDevelopment',
            'otherInformation',
            'questionnaire',
            'references',
            'department',
            'position'
        ])->findOrFail($employee->id);

        // Get base employee data without relationships
        $baseData = $employee->only([
            'id', 'surname', 'first_name', 'middle_name', 'name_extension', 'status', 'employment_status', 'employee_type', 'salary',
            'department_id', 'position_id', 'birth_date', 'birth_place', 'sex', 'civil_status',
            'height_m', 'weight_kg', 'blood_type', 'gsis_id_no', 'pagibig_id_no', 'philhealth_no',
            'sss_no', 'tin_no', 'agency_employee_no', 'citizenship', 'dual_citizenship', 'citizenship_type',
            'dual_citizenship_country', 'res_house_no', 'res_street', 'res_subdivision', 'res_barangay',
            'res_city', 'res_province', 'res_zip_code', 'perm_house_no', 'perm_street', 'perm_subdivision',
            'perm_barangay', 'perm_city', 'perm_province', 'perm_zip_code', 'telephone_no', 'mobile_no',
            'email_address', 'government_issued_id', 'id_number', 'id_date_issued', 'id_place_of_issue',
            'date_hired', 'date_regularized',
            'indigenous_group', 'pwd_id_no', 'solo_parent_id_no', 'created_at', 'updated_at', 'deleted_at'
        ]);

        $employeeData = array_merge($baseData, [
            'department' => $employee->department ? [
                'id' => $employee->department->id,
                'name' => $employee->department->faculty_name ?? $employee->department->name,
                'faculty_name' => $employee->department->faculty_name,
            ] : null,
            'position' => $employee->position ? [
                'id' => $employee->position->id,
                'name' => $employee->position->pos_name ?? $employee->position->name,
                'pos_name' => $employee->position->pos_name,
            ] : null,
            'family_background' => $employee->familyBackground->isEmpty() ? [
                [ 'relation' => 'Father', 'surname' => '', 'first_name' => '', 'middle_name' => '', 'name_extension' => '', 'occupation' => '', 'employer' => '', 'business_address' => '', 'telephone_no' => '' ],
                [ 'relation' => 'Mother', 'surname' => '', 'first_name' => '', 'middle_name' => '', 'name_extension' => '', 'occupation' => '', 'employer' => '', 'business_address' => '', 'telephone_no' => '' ]
            ] : $employee->familyBackground->map(function ($member) {
                // Combine name fields into fullname
                $nameParts = array_filter([
                    $member->surname ?? '',
                    $member->first_name ?? '',
                    $member->middle_name ?? '',
                    $member->name_extension ?? ''
                ]);
                $fullname = implode(' ', $nameParts);
                
                return [
                    'id' => $member->id,
                    'relation' => $member->relation,
                    'fullname' => $fullname,
                    'surname' => $member->surname ?? '',
                    'first_name' => $member->first_name ?? '',
                    'middle_name' => $member->middle_name ?? '',
                    'name_extension' => $member->name_extension ?? '',
                    'occupation' => $member->occupation ?? '',
                    'employer' => $member->employer ?? '',
                    'business_address' => $member->business_address ?? '',
                    'telephone_no' => $member->telephone_no ?? '',
                ];
            })->toArray(),
            'children' => $employee->children->map(function ($child) {
                // Map database fields - children table has full_name, Profile expects it
                return [
                    'id' => $child->id,
                    'full_name' => $child->full_name,
                    'birth_date' => $child->birth_date ? $child->birth_date->format('Y-m-d') : null,
                    // For backward compatibility
                    'surname' => '',
                    'first_name' => $child->full_name,
                    'middle_name' => '',
                ];
            })->toArray(),
            'educational_background' => $employee->educationalBackground->toArray(),
            'civil_service_eligibility' => $employee->civilServiceEligibility->map(function ($cs) {
                // Map database fields to Profile page expected fields
                return [
                    'id' => $cs->id,
                    'career_service' => $cs->eligibility, // Map eligibility to career_service
                    'rating' => $cs->rating,
                    'date_of_examination' => $cs->exam_date ? $cs->exam_date->format('Y-m-d') : null, // Map exam_date
                    'place_of_examination' => $cs->exam_place, // Map exam_place
                    'license_number' => $cs->license_no, // Map license_no
                    'license_validity' => $cs->license_validity ? $cs->license_validity->format('Y-m-d') : null,
                ];
            })->toArray(),
            'work_experience' => $employee->workExperience->toArray(),
            'voluntary_work' => $employee->voluntaryWork->map(function ($vw) {
                // Map database fields to Profile page expected fields
                $dateFrom = $vw->date_from ? $vw->date_from->format('Y-m-d') : '';
                $dateTo = $vw->date_to ? $vw->date_to->format('Y-m-d') : '';
                $inclusiveDates = trim($dateFrom . ($dateTo ? ' to ' . $dateTo : ''));
                
                return [
                    'id' => $vw->id,
                    'name_address_organization' => trim(($vw->organization_name ?? '') . ($vw->organization_address ? ', ' . $vw->organization_address : '')), // Combine org name and address
                    'inclusive_dates' => $inclusiveDates, // Combine date_from and date_to
                    'number_of_hours' => $vw->hours_rendered, // Map hours_rendered
                    'position_nature_of_work' => $vw->position_or_nature, // Map position_or_nature
                    'date_from' => $dateFrom,
                    'date_to' => $dateTo,
                ];
            })->toArray(),
            'learning_development' => $employee->learningDevelopment->map(function ($ld) {
                // Map database fields to Profile page expected fields
                $dateFrom = $ld->date_from ? $ld->date_from->format('Y-m-d') : '';
                $dateTo = $ld->date_to ? $ld->date_to->format('Y-m-d') : '';
                $inclusiveDates = trim($dateFrom . ($dateTo ? ' to ' . $dateTo : ''));
                
                return [
                    'id' => $ld->id,
                    'title_of_learning' => $ld->title, // Map title
                    'inclusive_dates' => $inclusiveDates, // Combine date_from and date_to
                    'number_of_hours' => $ld->hours, // Map hours
                    'type_of_ld' => $ld->type_of_ld,
                    'sponsor' => $ld->conducted_by, // Map conducted_by to sponsor
                    'date_from' => $dateFrom,
                    'date_to' => $dateTo,
                ];
            })->toArray(),
            'questionnaire' => $employee->questionnaire->isEmpty() ? [
                ['question_number' => 341, 'answer' => false, 'details' => ''], // 34a
                ['question_number' => 342, 'answer' => false, 'details' => ''], // 34b
                ['question_number' => 351, 'answer' => false, 'details' => ''], // 35a
                ['question_number' => 352, 'answer' => false, 'details' => ''], // 35b
                ['question_number' => 36, 'answer' => false, 'details' => ''],
                ['question_number' => 37, 'answer' => false, 'details' => ''],
                ['question_number' => 381, 'answer' => false, 'details' => ''], // 38a
                ['question_number' => 382, 'answer' => false, 'details' => ''], // 38b
                ['question_number' => 39, 'answer' => false, 'details' => ''],
                ['question_number' => 401, 'answer' => false, 'details' => ''], // 40a
                ['question_number' => 402, 'answer' => false, 'details' => ''], // 40b
                ['question_number' => 403, 'answer' => false, 'details' => ''], // 40c
            ] : $employee->questionnaire->map(function ($q) {
                return [
                    'id' => $q->id,
                    'question_number' => $q->question_number,
                    'answer' => $q->answer,
                    'details' => $q->details ?? '',
                    'date_filed' => $q->date_filed ? $q->date_filed->format('Y-m-d') : null,
                    'status_of_case' => $q->status_of_case ?? null,
                ];
            })->toArray(),
            'references' => $employee->references->map(function ($ref) {
                // Combine first_name, middle_initial, and surname into fullname
                $nameParts = array_filter([
                    $ref->first_name ?? '',
                    $ref->middle_initial ? strtoupper($ref->middle_initial) : '',
                    $ref->surname ?? ''
                ]);
                $fullname = implode(' ', $nameParts);
                
                return [
                    'fullname' => $fullname,
                    'address' => $ref->address ?? '',
                    'telephone_no' => $ref->telephone_no ?? '',
                ];
            })->toArray(),
            'other_information' => $employee->otherInformation ? $employee->otherInformation->toArray() : [
                'skill_or_hobby' => '',
                'non_academic_distinctions' => '',
                'memberships' => ''
            ]
        ]);

        return Inertia::render('employees/Profile', [
            'employee' => $employeeData,
        ]);
    }

    public function edit(Request $request, Employee $employee)
    {
        abort_unless($request->user()->can('edit-employee'), 403, 'Unauthorized action.');
        
        // Check if user can view this employee (scope check)
        if (!$this->scopeService->canViewEmployee($request->user(), $employee)) {
            abort(403, 'You do not have permission to edit this employee.');
        }

        $employee->load([
            'familyBackground',
            'children',
            'educationalBackground',
            'civilServiceEligibility',
            'workExperience',
            'voluntaryWork',
            'learningDevelopment',
            'questionnaire',
            'references',
            'department',
            'position',
            'otherInformation',
        ]);

        $employeeData = [
            ...$employee->toArray(),
            'family_background' => $employee->familyBackground->isEmpty() ? [
                [ 'relation' => 'Father', 'surname' => '', 'first_name' => '', 'middle_name' => '', 'name_extension' => '', 'occupation' => '', 'employer' => '', 'business_address' => '', 'telephone_no' => '' ],
                [ 'relation' => 'Mother', 'surname' => '', 'first_name' => '', 'middle_name' => '', 'name_extension' => '', 'occupation' => '', 'employer' => '', 'business_address' => '', 'telephone_no' => '' ]
            ] : $employee->familyBackground->toArray(),
            'children' => $employee->children->toArray(),
            'educational_background' => $employee->educationalBackground->toArray(),
            'civil_service_eligibility' => $employee->civilServiceEligibility->toArray(),
            'work_experience' => $employee->workExperience->toArray(),
            'voluntary_work' => $employee->voluntaryWork->toArray(),
            'learning_development' => $employee->learningDevelopment->toArray(),
            'questionnaire' => $employee->questionnaire->isEmpty() ? [
                ['question_number' => 341, 'answer' => false, 'details' => ''], // 34a
                ['question_number' => 342, 'answer' => false, 'details' => ''], // 34b
                ['question_number' => 351, 'answer' => false, 'details' => ''], // 35a
                ['question_number' => 352, 'answer' => false, 'details' => ''], // 35b
                ['question_number' => 36, 'answer' => false, 'details' => ''],
                ['question_number' => 37, 'answer' => false, 'details' => ''],
                ['question_number' => 381, 'answer' => false, 'details' => ''], // 38a
                ['question_number' => 382, 'answer' => false, 'details' => ''], // 38b
                ['question_number' => 39, 'answer' => false, 'details' => ''],
                ['question_number' => 401, 'answer' => false, 'details' => ''], // 40a
                ['question_number' => 402, 'answer' => false, 'details' => ''], // 40b
                ['question_number' => 403, 'answer' => false, 'details' => ''], // 40c
            ] : $employee->questionnaire->toArray(),
            'references' => $employee->references->map(function ($ref) {
                // Combine first_name, middle_initial, and surname into fullname
                $nameParts = array_filter([
                    $ref->first_name ?? '',
                    $ref->middle_initial ? strtoupper($ref->middle_initial) : '',
                    $ref->surname ?? ''
                ]);
                $fullname = implode(' ', $nameParts);
                
                return [
                    'fullname' => $fullname,
                    'address' => $ref->address ?? '',
                    'telephone_no' => $ref->telephone_no ?? '',
                ];
            })->toArray(),
            'other_information' => $employee->otherInformation ?? (object)['skill_or_hobby' => '', 'non_academic_distinctions' => '', 'memberships' => '']
        ];

        return Inertia::render('employees/Create', [
            'employee' => $employeeData,
            'departments' => $this->getScopedDepartments($request->user()),
            'positions' => $this->getScopedPositions($request->user()),
            'faculties' => Faculty::active()
                ->select('id', 'name', 'code')
                ->orderBy('name')
                ->get(),
        ]);
    }

    public function update(Request $request, Employee $employee)
    {
        abort_unless($request->user()->can('edit-employee'), 403, 'Unauthorized action.');
        
        // Check if user can view this employee (scope check)
        if (!$this->scopeService->canViewEmployee($request->user(), $employee)) {
            abort(403, 'You do not have permission to update this employee.');
        }
        
        $validated = $request->validate(
            $this->employeeValidationRules(false, $request),
            $this->employeeValidationMessages()
        );
        
        // Validate related data
        $relatedErrors = $this->validateRelatedData($request);
        if (!empty($relatedErrors)) {
            return back()->withErrors($relatedErrors)->withInput();
        }
        
        // Get original values before update - refresh to ensure we have latest data
        $employee->refresh();
        $original = $employee->getOriginal();
        $changes = [];

        DB::transaction(function () use ($request, $employee, $validated, $original, &$changes) {
            // Track changes BEFORE updating
            foreach ($validated as $key => $newValue) {
                $oldValue = $original[$key] ?? null;
                
                // Normalize values for comparison (handle dates, booleans, etc.)
                $normalizedOld = $this->normalizeValue($oldValue);
                $normalizedNew = $this->normalizeValue($newValue);
                
                // Compare normalized values (use != for loose comparison to handle type differences)
                if ($normalizedOld != $normalizedNew) {
                    $changes[$key] = [
                        'old' => $oldValue,
                        'new' => $newValue,
                    ];
                }
            }
            
            // Normalize empty department_id to null for faculty-level positions
            if (isset($validated['department_id']) && $validated['department_id'] === '') {
                $validated['department_id'] = null;
            }
            
            // Update the employee
            $employee->update($validated);
            $this->handleRelatedData($request, $employee, true);
            
            // Log position assignment if position_id changed (exclude from regular field logging)
            if (isset($changes['position_id'])) {
                $oldPositionId = $changes['position_id']['old'] ?? null;
                $newPositionId = $changes['position_id']['new'] ?? null;
                $this->logPositionAssignment($employee, $oldPositionId, $newPositionId);
                // Remove position_id from changes to avoid duplicate logging
                unset($changes['position_id']);
            }
            
            // Log each field change (position_id is excluded since it's logged separately)
            foreach ($changes as $field => $change) {
                try {
                    $oldValue = $change['old'];
                    $newValue = $change['new'];
                    
                    // Resolve foreign key names for better readability
                    if ($field === 'department_id') {
                        if ($oldValue) {
                            $oldDept = Department::find($oldValue);
                            $oldValue = $oldDept ? $oldDept->faculty_name : $oldValue;
                        }
                        if ($newValue) {
                            $newDept = Department::find($newValue);
                            $newValue = $newDept ? $newDept->faculty_name : $newValue;
                        }
                    } elseif ($field === 'position_id') {
                        if ($oldValue) {
                            $oldPos = Position::find($oldValue);
                            $oldValue = $oldPos ? $oldPos->pos_name : $oldValue;
                        }
                        if ($newValue) {
                            $newPos = Position::find($newValue);
                            $newValue = $newPos ? $newPos->pos_name : $newValue;
                        }
                    }
                    
                    EmployeeAuditLog::create([
                        'employee_id' => $employee->id,
                        'action_type' => 'UPDATE',
                        'field_changed' => $field,
                        'old_value' => $oldValue,
                        'new_value' => $newValue,
                        'action_date' => now(),
                        'performed_by' => auth()->user()?->name ?? 'System',
                    ]);
                } catch (\Exception $e) {
                    // Log error but don't fail the transaction
                    Log::error('Failed to create audit log: ' . $e->getMessage(), [
                        'employee_id' => $employee->id,
                        'field' => $field,
                        'error' => $e->getTraceAsString()
                    ]);
                }
            }
        });

        return redirect()->route('employees.index')->with('success', 'Employee updated successfully.');
    }

    /**
     * Normalize value for comparison (handles dates, booleans, nulls, etc.)
     */
    protected function normalizeValue($value)
    {
        if ($value === null || $value === '') {
            return null;
        }
        
        if ($value instanceof \DateTime || $value instanceof \Carbon\Carbon) {
            return $value->format('Y-m-d');
        }
        
        if (is_bool($value)) {
            return $value ? 1 : 0;
        }
        
        // Convert to string for comparison to handle numeric differences
        return (string) $value;
    }

    /**
     * Get employee's full name for logging purposes
     */
    protected function getEmployeeFullName(Employee $employee): string
    {
        $nameParts = array_filter([
            $employee->first_name,
            $employee->middle_name,
            $employee->surname,
        ]);
        
        return implode(' ', $nameParts) ?: $employee->id;
    }

    public function destroy(Employee $employee)
    {
        // Refresh to ensure we have the latest data
        $employee->refresh();
        
        $employeeId = $employee->id;
        $employeeName = $this->getEmployeeFullName($employee);
        
        DB::transaction(function () use ($employee, $employeeId, $employeeName) {
            // Log employee soft deletion - simple text message
            EmployeeAuditLog::create([
                'employee_id' => $employeeId,
                'action_type' => 'DELETE',
                'field_changed' => null,
                'old_value' => null,
                'new_value' => "Employee Record Soft-Deleted: {$employeeName}",
                'action_date' => now(),
                'performed_by' => auth()->user()?->name ?? 'System',
            ]);
            
            // Soft delete the employee (sets deleted_at timestamp)
            $employee->delete();
        });

        return redirect()->route('employees.index')->with('success', 'Employee deleted successfully.');
    }

    /**
     * Restore a soft-deleted employee
     */
    public function restore($id)
    {
        abort_unless(request()->user()->can('restore-employee'), 403, 'Unauthorized action.');

        $employee = Employee::withTrashed()->findOrFail($id);
        
        if (!$employee->trashed()) {
            return redirect()->route('employees.index')->with('error', 'Employee is not deleted.');
        }

        $employeeId = $employee->id;
        $deletedAt = $employee->deleted_at;
        
        DB::transaction(function () use ($employee, $employeeId, $deletedAt) {
            // Log the restoration BEFORE restoring (to capture the deleted state)
            EmployeeAuditLog::create([
                'employee_id' => $employeeId,
                'action_type' => 'UPDATE',
                'field_changed' => 'restored',
                'old_value' => ['deleted_at' => $deletedAt ? $deletedAt->toDateTimeString() : null],
                'new_value' => ['deleted_at' => null],
                'action_date' => now(),
                'performed_by' => auth()->user()?->name ?? 'System',
            ]);
            
            // Restore the employee
            $employee->restore();
        });

        return redirect()->route('employees.index')->with('success', 'Employee has been restored successfully.');
    }

    /**
     * Permanently delete an employee
     */
    public function forceDelete($id)
    {
        abort_unless(request()->user()->can('force-delete-employee'), 403, 'Unauthorized action.');

        $employee = Employee::withTrashed()->findOrFail($id);
        $employee->refresh();
        
        $employeeId = $employee->id;
        $employeeName = $this->getEmployeeFullName($employee);
        
        DB::transaction(function () use ($employee, $employeeId, $employeeName) {
            // Log permanent deletion - simple text message
            EmployeeAuditLog::create([
                'employee_id' => $employeeId,
                'action_type' => 'DELETE',
                'field_changed' => null,
                'old_value' => null,
                'new_value' => "Employee Record Permanently Deleted: {$employeeName}",
                'action_date' => now(),
                'performed_by' => auth()->user()?->name ?? 'System',
            ]);
            
            // Temporarily disable foreign key checks to allow permanent deletion
            // while preserving the audit log
            DB::statement('SET FOREIGN_KEY_CHECKS=0');
            
            try {
                // Permanently delete related records and the employee
                $employee->children()->forceDelete();
                $employee->educationalBackground()->forceDelete();
                $employee->civilServiceEligibility()->forceDelete();
                $employee->familyBackground()->forceDelete();
                $employee->learningDevelopment()->forceDelete();
                $employee->otherInformation()->forceDelete();
                $employee->questionnaire()->forceDelete();
                $employee->references()->forceDelete();
                $employee->voluntaryWork()->forceDelete();
                $employee->workExperience()->forceDelete();

                $employee->forceDelete();
            } finally {
                // Re-enable foreign key checks
                DB::statement('SET FOREIGN_KEY_CHECKS=1');
            }
        });

        return redirect()->route('employees.index')->with('success', 'Employee has been permanently deleted.');
    }

    protected function handleRelatedData(Request $request, Employee $employee, $isUpdate = false)
    {
        // Debug: Log all request data keys
        \Log::debug('handleRelatedData called', [
            'has_questionnaire' => $request->has('questionnaire'),
            'questionnaire_input' => $request->input('questionnaire'),
            'all_keys' => array_keys($request->all()),
        ]);
        
        if ($request->has('family_background')) {
            foreach ($request->input('family_background') as $family) {
                // Convert null values to empty strings
                $cleanedFamily = array_map(function ($value) {
                    return $value === null ? '' : (is_string($value) ? trim($value) : $value);
                }, $family);
                
                // Ensure all fields are set (convert null to empty string)
                $cleanedFamily['surname'] = $cleanedFamily['surname'] ?? '';
                $cleanedFamily['first_name'] = $cleanedFamily['first_name'] ?? '';
                $cleanedFamily['middle_name'] = $cleanedFamily['middle_name'] ?? '';
                $cleanedFamily['name_extension'] = $cleanedFamily['name_extension'] ?? '';
                $cleanedFamily['occupation'] = $cleanedFamily['occupation'] ?? '';
                $cleanedFamily['employer'] = $cleanedFamily['employer'] ?? '';
                $cleanedFamily['business_address'] = $cleanedFamily['business_address'] ?? '';
                $cleanedFamily['telephone_no'] = $cleanedFamily['telephone_no'] ?? '';
                
                // Only save if surname is not empty (required field) or if there's any other meaningful data
                // This prevents saving completely empty records while allowing partial data
                if (!empty($cleanedFamily['surname']) || 
                    !empty($cleanedFamily['first_name']) || 
                    !empty($cleanedFamily['middle_name']) ||
                    !empty($cleanedFamily['occupation']) ||
                    !empty($cleanedFamily['employer']) ||
                    !empty($cleanedFamily['business_address']) ||
                    !empty($cleanedFamily['telephone_no'])) {
                    
                    // If surname is empty but other fields have data, set surname to empty string (not null)
                    if (empty($cleanedFamily['surname'])) {
                        $cleanedFamily['surname'] = '';
                    }
                    
                    $employee->familyBackground()->updateOrCreate(
                        ['relation' => $cleanedFamily['relation']],
                        $cleanedFamily
                    );
                }
            }
        }

        if ($isUpdate) $employee->children()->delete();
        if (is_array($request->input('children'))) {
            $employee->children()->createMany($request->input('children'));
        }

        if ($isUpdate) $employee->educationalBackground()->delete();
        if (is_array($request->input('educational_background'))) {
            // Filter out records without a level (level is required)
            $educationalBackground = array_filter(
                $request->input('educational_background'),
                function ($edu) {
                    return !empty($edu['level']) && trim($edu['level']) !== '';
                }
            );
            if (!empty($educationalBackground)) {
                $employee->educationalBackground()->createMany($educationalBackground);
            }
        }

        if ($isUpdate) $employee->civilServiceEligibility()->delete();
        if (is_array($request->input('civil_service_eligibility'))) {
            $employee->civilServiceEligibility()->createMany($request->input('civil_service_eligibility'));
        }

        if ($isUpdate) $employee->workExperience()->delete();
        if (is_array($request->input('work_experience'))) {
            $employee->workExperience()->createMany($request->input('work_experience'));
        }

        if ($isUpdate) $employee->voluntaryWork()->delete();
        if (is_array($request->input('voluntary_work'))) {
            $employee->voluntaryWork()->createMany($request->input('voluntary_work'));
        }

        if ($isUpdate) $employee->learningDevelopment()->delete();
        if (is_array($request->input('learning_development'))) {
            $employee->learningDevelopment()->createMany($request->input('learning_development'));
        }

        if ($request->has('other_information')) {
            $employee->otherInformation()->updateOrCreate(
                ['employee_id' => $employee->id],
                $request->input('other_information')
            );
        }

        // Process questionnaire - check both 'questionnaire' key and array structure
        $questionnaireData = $request->input('questionnaire');
        \Log::debug('Questionnaire check', [
            'has_questionnaire' => $request->has('questionnaire'),
            'questionnaire_data' => $questionnaireData,
            'is_array' => is_array($questionnaireData),
            'count' => is_array($questionnaireData) ? count($questionnaireData) : 0,
        ]);
        
        if ($request->has('questionnaire') && is_array($questionnaireData) && !empty($questionnaireData)) {
            foreach ($questionnaireData as $question) {
                // Log the raw input for debugging
                \Log::debug('Questionnaire input', [
                    'question_number' => $question['question_number'] ?? null,
                    'raw_answer' => $question['answer'] ?? null,
                    'raw_answer_type' => gettype($question['answer'] ?? null),
                ]);
                
                // Ensure answer is properly cast to boolean
                $rawAnswer = $question['answer'] ?? false;
                
                // Log the raw value first
                \Log::debug('Questionnaire raw answer received', [
                    'question_number' => $question['question_number'] ?? null,
                    'raw_answer' => $rawAnswer,
                    'raw_answer_type' => gettype($rawAnswer),
                    'raw_answer_var_export' => var_export($rawAnswer, true),
                ]);
                
                // More robust boolean conversion - handle ALL possible formats
                $answer = false; // Default to false
                
                if ($rawAnswer === true || $rawAnswer === 1 || $rawAnswer === '1' || $rawAnswer === 'true' || $rawAnswer === 'yes' || $rawAnswer === 'on') {
                    $answer = true;
                } elseif (is_bool($rawAnswer)) {
                    $answer = $rawAnswer;
                } elseif (is_string($rawAnswer)) {
                    $normalized = strtolower(trim($rawAnswer));
                    $answer = in_array($normalized, ['true', '1', 'yes', 'on'], true);
                } elseif (is_numeric($rawAnswer)) {
                    $answer = (bool) $rawAnswer && $rawAnswer != 0;
                } else {
                    // Last resort: use filter_var
                    $filtered = filter_var($rawAnswer, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
                    $answer = $filtered !== null ? $filtered : (bool) $rawAnswer;
                }
                
                \Log::debug('Questionnaire processed', [
                    'question_number' => $question['question_number'] ?? null,
                    'raw_answer' => $rawAnswer,
                    'raw_answer_type' => gettype($rawAnswer),
                    'processed_answer' => $answer,
                    'processed_answer_type' => gettype($answer),
                    'is_true' => $answer === true,
                    'is_false' => $answer === false,
                ]);
                
                // Final check: ensure answer is definitely a boolean before saving
                // Handle all possible truthy values
                $finalAnswer = false;
                if (is_bool($answer)) {
                    $finalAnswer = $answer;
                } elseif (is_string($answer)) {
                    $normalized = strtolower(trim($answer));
                    $finalAnswer = in_array($normalized, ['true', '1', 'yes', 'on'], true);
                } elseif (is_numeric($answer)) {
                    $finalAnswer = (bool) $answer;
                } else {
                    $finalAnswer = (bool) $answer;
                }
                
                \Log::debug('Questionnaire saving', [
                    'question_number' => $question['question_number'] ?? null,
                    'final_answer' => $finalAnswer,
                    'final_answer_type' => gettype($finalAnswer),
                    'will_save_as' => $finalAnswer ? 'true' : 'false',
                ]);
                
                // Ensure we're saving a proper boolean - Laravel's boolean cast can be finicky
                $answerToSave = $finalAnswer === true ? true : false;
                
                \Log::debug('Questionnaire final save', [
                    'question_number' => $question['question_number'] ?? null,
                    'answer_to_save' => $answerToSave,
                    'answer_to_save_type' => gettype($answerToSave),
                    'answer_to_save_var_export' => var_export($answerToSave, true),
                ]);
                
                $employee->questionnaire()->updateOrCreate(
                    ['question_number' => $question['question_number']],
                    [
                        'answer' => $answerToSave, // Explicitly boolean true or false
                        'details' => $question['details'] ?? '',
                    ]
                );
                
                // Verify what was actually saved
                $saved = $employee->questionnaire()->where('question_number', $question['question_number'])->first();
                \Log::debug('Questionnaire saved verification', [
                    'question_number' => $question['question_number'] ?? null,
                    'saved_answer' => $saved->answer ?? null,
                    'saved_answer_type' => $saved ? gettype($saved->answer) : 'not found',
                    'saved_answer_raw' => $saved ? $saved->getRawOriginal('answer') : null,
                ]);
            }
        }

        if ($isUpdate) $employee->references()->delete();
        if (is_array($request->input('references'))) {
            $references = array_map(function ($ref) {
                // Split fullname into first_name, middle_initial, and surname
                $fullname = trim($ref['fullname'] ?? '');
                $parts = preg_split('/\s+/', $fullname);
                
                $first_name = $parts[0] ?? '';
                $middle_initial = '';
                $surname = '';
                
                if (count($parts) === 2) {
                    // Only first name and surname
                    $surname = $parts[1] ?? '';
                } elseif (count($parts) >= 3) {
                    // Has middle name/initial
                    $middle_initial = strtoupper(substr($parts[1] ?? '', 0, 1));
                    $surname = implode(' ', array_slice($parts, 2));
                }
                
                return [
                    'first_name' => $first_name,
                    'middle_initial' => $middle_initial,
                    'surname' => $surname,
                    'address' => $ref['address'] ?? '',
                    'telephone_no' => $ref['telephone_no'] ?? '',
                ];
            }, $request->input('references'));
            
            $employee->references()->createMany($references);
        }
    }

    protected function employeeValidationRules(bool $isCreate = true, ?Request $request = null): array
    {
        // Check if the selected position is faculty-level (has faculty_id but no department_id)
        $isFacultyLevelPosition = false;
        if ($request && $request->has('position_id')) {
            $position = \App\Models\Position::find($request->input('position_id'));
            if ($position && $position->faculty_id && !$position->department_id) {
                $isFacultyLevelPosition = true;
            }
        }

        $rules = array_merge([
            // Personal Information - Required Fields
            'surname' => ['required', 'string', new NameField(100)],
            'first_name' => ['required', 'string', new NameField(100)],
            'middle_name' => ['nullable', 'string', new NameField(100)],
            'name_extension' => ['nullable', 'string', new NameField(100)],
            'birth_date' => ['required', 'date', new DateNotFuture()],
            'birth_place' => ['required', 'string', 'max:100'],
            'sex' => 'required|in:Male,Female',
            'civil_status' => 'required|in:Single,Married,Widowed,Separated,Divorced,Annulled',
            
            // Employment - Required Fields
            'status' => 'required|in:active,inactive,on-leave',
            'employment_status' => 'required|in:Regular,Contractual,Job-Order,Probationary',
            'employee_type' => 'required|in:Teaching,Non-Teaching',
            'organization_type' => 'nullable|in:academic,administrative',
            'faculty_id' => [
                function ($attribute, $value, $fail) use ($request) {
                    $organizationType = $request->input('organization_type');
                    // Faculty ID is only required for academic organization type
                    if ($organizationType === 'academic' && empty($value)) {
                        $fail('Faculty is required for academic departments.');
                    }
                    // For administrative, faculty_id should be null
                    if ($organizationType === 'administrative' && !empty($value)) {
                        $fail('Faculty must not be selected for administrative offices.');
                    }
                },
                'nullable',
                'integer',
                'exists:faculties,id',
            ],
            'department_id' => $isFacultyLevelPosition ? 'nullable|exists:departments,id' : 'required|exists:departments,id',
            'position_id' => [
                'required',
                'exists:positions,id',
                function ($attribute, $value, $fail) use ($isCreate, $request) {
                    if ($value) {
                        $position = \App\Models\Position::find($value);
                        if ($position && $position->capacity !== null) {
                            $query = \App\Models\Employee::where('position_id', $value)
                                ->where('status', 'active');
                            
                            // If updating, exclude the current employee from the count
                            if (!$isCreate && $request && $request->route('employee')) {
                                $employeeId = $request->route('employee')->id ?? null;
                                if ($employeeId) {
                                    $query->where('id', '!=', $employeeId);
                                }
                            }
                            
                            $currentCount = $query->count();
                            
                            if ($currentCount >= $position->capacity) {
                                $fail("The position '{$position->pos_name}' has reached its capacity limit of {$position->capacity}.");
                            }
                        }
                    }
                },
            ],
            'salary' => ['required', 'numeric', 'between:0,9999999999.99'],
            'date_hired' => ['required', 'date', new DateNotFuture()],
            'date_regularized' => ['required', 'date', 'after_or_equal:date_hired', new DateNotFuture()],
            
            // Physical Attributes
            'height_m' => 'required|numeric|between:0,999.99',
            'weight_kg' => 'required|numeric|between:0,9999.99',
            'blood_type' => 'nullable|string|max:3',
            
            // Government IDs - Optional but validated if provided
            'gsis_id_no' => 'nullable|string|max:25',
            'pagibig_id_no' => ['nullable', new PagIbigNumber()],
            'philhealth_no' => ['nullable', new PhilHealthNumber()],
            'sss_no' => ['nullable', new SSSNumber()],
            'tin_no' => ['nullable', new TINNumber()],
            'agency_employee_no' => 'nullable|string|max:25',
            
            // Citizenship
            'citizenship' => 'required|string|max:30',
            'dual_citizenship' => 'nullable|boolean',
            'citizenship_type' => 'nullable|in:By birth,By naturalization',
            'dual_citizenship_country' => 'nullable|string|max:50',
            
            // Residential Address - Required
            'res_house_no' => 'nullable|string|max:15',
            'res_street' => 'nullable|string|max:50',
            'res_subdivision' => 'nullable|string|max:50',
            'res_barangay' => 'nullable|string|max:50',
            'res_city' => 'required|string|max:50',
            'res_province' => 'required|string|max:50',
            'res_zip_code' => ['required', new ZipCode()],
            
            // Permanent Address - Required if provided
            'perm_house_no' => 'nullable|string|max:15',
            'perm_street' => 'nullable|string|max:50',
            'perm_subdivision' => 'nullable|string|max:50',
            'perm_barangay' => 'nullable|string|max:50',
            'perm_city' => 'nullable|string|max:50',
            'perm_province' => 'nullable|string|max:50',
            'perm_zip_code' => ['nullable', new ZipCode()],
            
            // Contact Information - Required
            'telephone_no' => 'nullable|string|max:20',
            'mobile_no' => ['required', new PhilippineMobileNumber()],
            'email_address' => 'required|email|max:80',
            
            // Government Issued ID
            'government_issued_id' => 'nullable|string|max:50',
            'id_number' => 'nullable|string|max:25',
            'id_date_issued' => ['nullable', 'date', new DateNotFuture()],
            'id_place_of_issue' => 'nullable|string|max:100',
            
            // Other Information
            'indigenous_group' => 'nullable|string|max:50',
            'pwd_id_no' => 'nullable|string|max:50',
            'solo_parent_id_no' => 'nullable|string|max:50',
        ], $isCreate ? [
            'id' => 'required|string|max:15|unique:employees'
        ] : []);

        return $rules;
    }

    protected function employeeValidationMessages(): array
    {
        return [
            'date_regularized.after_or_equal' => 'Date of regularization must be the same as or later than the date hired.',
        ];
    }

    /**
     * Validate related data (educational background, work experience, etc.)
     */
    protected function validateRelatedData(Request $request): array
    {
        $errors = [];

        // Validate educational background dates
        if ($request->has('educational_background') && is_array($request->input('educational_background'))) {
            foreach ($request->input('educational_background') as $index => $edu) {
                if (!empty($edu['period_from'])) {
                    $validator = Validator::make(
                        ['period_from' => $edu['period_from']],
                        ['period_from' => [new DateNotFuture()]]
                    );
                    if ($validator->fails()) {
                        $errors["educational_background.{$index}.period_from"] = $validator->errors()->first('period_from');
                    }
                }

                if (!empty($edu['period_to'])) {
                    $validator = Validator::make(
                        ['period_to' => $edu['period_to']],
                        ['period_to' => [new DateNotFuture()]]
                    );
                    if ($validator->fails()) {
                        $errors["educational_background.{$index}.period_to"] = $validator->errors()->first('period_to');
                    }
                }

                // Validate date range
                if (!empty($edu['period_from']) && !empty($edu['period_to'])) {
                    $validator = Validator::make(
                        ['period_to' => $edu['period_to']],
                        ['period_to' => [new DateRange($edu['period_from'])]]
                    );
                    if ($validator->fails()) {
                        $errors["educational_background.{$index}.date_range"] = $validator->errors()->first('period_to');
                    }
                }
            }
        }

        // Validate work experience dates
        if ($request->has('work_experience') && is_array($request->input('work_experience'))) {
            foreach ($request->input('work_experience') as $index => $work) {
                if (!empty($work['date_from'])) {
                    $validator = Validator::make(
                        ['date_from' => $work['date_from']],
                        ['date_from' => [new DateNotFuture()]]
                    );
                    if ($validator->fails()) {
                        $errors["work_experience.{$index}.date_from"] = $validator->errors()->first('date_from');
                    }
                }

                if (!empty($work['date_to'])) {
                    $validator = Validator::make(
                        ['date_to' => $work['date_to']],
                        ['date_to' => [new DateNotFuture()]]
                    );
                    if ($validator->fails()) {
                        $errors["work_experience.{$index}.date_to"] = $validator->errors()->first('date_to');
                    }
                }

                // Validate date range
                if (!empty($work['date_from']) && !empty($work['date_to'])) {
                    $validator = Validator::make(
                        ['date_to' => $work['date_to']],
                        ['date_to' => [new DateRange($work['date_from'])]]
                    );
                    if ($validator->fails()) {
                        $errors["work_experience.{$index}.date_range"] = $validator->errors()->first('date_to');
                    }
                }
            }
        }

        // Validate civil service eligibility dates
        if ($request->has('civil_service_eligibility') && is_array($request->input('civil_service_eligibility'))) {
            foreach ($request->input('civil_service_eligibility') as $index => $eligibility) {
                if (!empty($eligibility['exam_date'])) {
                    $validator = Validator::make(
                        ['exam_date' => $eligibility['exam_date']],
                        ['exam_date' => [new DateNotFuture()]]
                    );
                    if ($validator->fails()) {
                        $errors["civil_service_eligibility.{$index}.exam_date"] = $validator->errors()->first('exam_date');
                    }
                }
            }
        }

        // Validate learning & development dates
        if ($request->has('learning_development') && is_array($request->input('learning_development'))) {
            foreach ($request->input('learning_development') as $index => $ld) {
                if (!empty($ld['date_from'])) {
                    $validator = Validator::make(
                        ['date_from' => $ld['date_from']],
                        ['date_from' => [new DateNotFuture()]]
                    );
                    if ($validator->fails()) {
                        $errors["learning_development.{$index}.date_from"] = $validator->errors()->first('date_from');
                    }
                }

                if (!empty($ld['date_to'])) {
                    $validator = Validator::make(
                        ['date_to' => $ld['date_to']],
                        ['date_to' => [new DateNotFuture()]]
                    );
                    if ($validator->fails()) {
                        $errors["learning_development.{$index}.date_to"] = $validator->errors()->first('date_to');
                    }
                }

                // Validate date range
                if (!empty($ld['date_from']) && !empty($ld['date_to'])) {
                    $validator = Validator::make(
                        ['date_to' => $ld['date_to']],
                        ['date_to' => [new DateRange($ld['date_from'])]]
                    );
                    if ($validator->fails()) {
                        $errors["learning_development.{$index}.date_range"] = $validator->errors()->first('date_to');
                    }
                }
            }
        }

        // Validate voluntary work dates
        if ($request->has('voluntary_work') && is_array($request->input('voluntary_work'))) {
            foreach ($request->input('voluntary_work') as $index => $vw) {
                if (!empty($vw['date_from'])) {
                    $validator = Validator::make(
                        ['date_from' => $vw['date_from']],
                        ['date_from' => [new DateNotFuture()]]
                    );
                    if ($validator->fails()) {
                        $errors["voluntary_work.{$index}.date_from"] = $validator->errors()->first('date_from');
                    }
                }

                if (!empty($vw['date_to'])) {
                    $validator = Validator::make(
                        ['date_to' => $vw['date_to']],
                        ['date_to' => [new DateNotFuture()]]
                    );
                    if ($validator->fails()) {
                        $errors["voluntary_work.{$index}.date_to"] = $validator->errors()->first('date_to');
                    }
                }

                // Validate date range
                if (!empty($vw['date_from']) && !empty($vw['date_to'])) {
                    $validator = Validator::make(
                        ['date_to' => $vw['date_to']],
                        ['date_to' => [new DateRange($vw['date_from'])]]
                    );
                    if ($validator->fails()) {
                        $errors["voluntary_work.{$index}.date_range"] = $validator->errors()->first('date_to');
                    }
                }
            }
        }

        // Validate questionnaire - require details when answer is Yes
        if ($request->has('questionnaire') && is_array($request->input('questionnaire'))) {
            foreach ($request->input('questionnaire') as $index => $q) {
                $answer = $q['answer'] ?? false;
                $isYes = $answer === true || $answer === 1 || $answer === '1' || 
                         strtolower((string)$answer) === 'true' || 
                         strtolower((string)$answer) === 'yes';

                if ($isYes && (empty($q['details']) || trim($q['details']) === '')) {
                    $errors["questionnaire.{$index}.details"] = "Question {$q['question_number']}: Details are required when answer is 'Yes'";
                }
            }
        }

        // Validate permanent address - if city is provided, province and zip are required
        if ($request->has('perm_city') && !empty($request->input('perm_city'))) {
            if (empty($request->input('perm_province'))) {
                $errors['perm_province'] = 'Permanent province is required if permanent city is provided';
            }
            if (empty($request->input('perm_zip_code'))) {
                $errors['perm_zip_code'] = 'Permanent zip code is required if permanent city is provided';
            }
        }

        return $errors;
    }

    /**
     * Log position assignment with details
     */
    protected function logPositionAssignment(Employee $employee, ?string $oldPositionId, ?string $newPositionId): void
    {
        try {
            $oldPosition = $oldPositionId ? \App\Models\Position::find($oldPositionId) : null;
            $newPosition = $newPositionId ? \App\Models\Position::find($newPositionId) : null;
            
            $actionType = $oldPositionId ? 'UPDATE' : 'CREATE';
            $fieldChanged = 'position_id';
            
            // Log in simple format: just position names (no redundant details)
            EmployeeAuditLog::create([
                'employee_id' => $employee->id,
                'action_type' => $actionType,
                'field_changed' => $fieldChanged,
                'old_value' => $oldPosition ? $oldPosition->pos_name : null,
                'new_value' => $newPosition ? $newPosition->pos_name : null,
                'action_date' => now(),
                'performed_by' => auth()->user()?->name ?? 'System',
            ]);
        } catch (\Exception $e) {
            \Log::error('Failed to log position assignment', [
                'employee_id' => $employee->id,
                'old_position_id' => $oldPositionId,
                'new_position_id' => $newPositionId,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Initialize leave balances for a new employee
     * 
     * Based on CSC Omnibus Rules on Leave:
     * - Vacation Leave (VL): 15 days/year (1.25 days/month)
     * - Sick Leave (SL): 15 days/year (1.25 days/month)
     * - Special Privilege Leave (SPL): 3 days/year
     */
    protected function initializeLeaveBalances(Employee $employee): void
    {
        // Only initialize for active employees
        if ($employee->status !== 'active') {
            return;
        }

        try {
            $leaveService = app(LeaveService::class);
            $year = now()->year;

            // CSC Standard Entitlements per leave type
            // Based on Omnibus Rules on Leave (CSC MC No. 41, s. 1998)
            $entitlements = [
                'VL' => 15.0,    // Vacation Leave - 15 days/year
                'SL' => 15.0,    // Sick Leave - 15 days/year
                'SPL' => 3.0,    // Special Privilege Leave - 3 days/year
                // Other leaves (maternity, paternity, etc.) are granted on-demand
            ];

            $leaveTypes = LeaveType::active()->get()->keyBy('code');

            foreach ($entitlements as $code => $days) {
                $leaveType = $leaveTypes->get($code);
                
                if (!$leaveType) {
                    Log::warning("Leave type {$code} not found when initializing balance for employee {$employee->id}");
                    continue;
                }

                // Check if leave type is available for this employee (gender restriction)
                if (!$leaveType->isAvailableFor($employee)) {
                    continue;
                }

                try {
                    $leaveService->addAccrual(
                        $employee->id,
                        $leaveType->id,
                        $days,
                        'annual',
                        "CSC annual leave entitlement for {$year}",
                        $year,
                        auth()->id()
                    );
                } catch (\Exception $e) {
                    // Log error but don't fail the transaction
                    Log::error("Failed to initialize leave balance for employee {$employee->id}", [
                        'employee_id' => $employee->id,
                        'leave_type_code' => $code,
                        'error' => $e->getMessage(),
                    ]);
                }
            }
        } catch (\Exception $e) {
            // Log error but don't fail the employee creation
            Log::error("Failed to initialize leave balances for employee {$employee->id}", [
                'employee_id' => $employee->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
        }
    }
}
