<?php

namespace App\Http\Controllers;

use App\Models\Employee;
use App\Models\EmployeeDocument;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;

class EmployeeDocumentController extends Controller
{
    public function index(Employee $employee): JsonResponse
    {
        $documents = $employee->documents()->with('uploader')->get();

        return response()->json([
            'documents' => $documents->map(function ($document) {
                return [
                    'id' => $document->id,
                    'title' => $document->title,
                    'filename' => $document->filename,
                    'original_filename' => $document->original_filename,
                    'file_size' => $document->file_size,
                    'file_size_formatted' => $document->file_size_formatted,
                    'mime_type' => $document->mime_type,
                    'uploaded_by' => $document->uploader->name ?? 'Unknown',
                    'created_at' => $document->created_at->format('M d, Y H:i'),
                ];
            })
        ]);
    }

    public function store(Request $request, Employee $employee): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:255',
            'file' => 'required|file|max:10240|mimes:pdf,doc,docx,jpg,jpeg,png,gif,xls,xlsx,txt,zip,rar',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $file = $request->file('file');
        $filename = Str::uuid() . '.' . $file->getClientOriginalExtension();
        $path = $file->storeAs('employee-documents', $filename, 'public');

        $document = EmployeeDocument::create([
            'employee_id' => $employee->id,
            'title' => $request->title,
            'filename' => $filename,
            'original_filename' => $file->getClientOriginalName(),
            'file_path' => $path,
            'mime_type' => $file->getMimeType(),
            'file_size' => $file->getSize(),
            'uploaded_by' => auth()->id(),
        ]);

        return response()->json([
            'message' => 'Document uploaded successfully',
            'document' => [
                'id' => $document->id,
                'title' => $document->title,
                'filename' => $document->filename,
                'original_filename' => $document->original_filename,
                'file_size' => $document->file_size,
                'file_size_formatted' => $document->file_size_formatted,
                'mime_type' => $document->mime_type,
                'uploaded_by' => $document->uploader->name ?? 'Unknown',
                'created_at' => $document->created_at->format('M d, Y H:i'),
            ]
        ], 201);
    }

    public function download(Employee $employee, EmployeeDocument $document): StreamedResponse
    {
        // Ensure the document belongs to the employee
        if ($document->employee_id !== $employee->id) {
            abort(403, 'Unauthorized access to document');
        }

        if (!Storage::disk('public')->exists($document->file_path)) {
            abort(404, 'File not found');
        }

        return Storage::disk('public')->download(
            $document->file_path,
            $document->original_filename
        );
    }

    public function destroy(Employee $employee, EmployeeDocument $document): JsonResponse
    {
        // Ensure the document belongs to the employee
        if ($document->employee_id !== $employee->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Delete file from storage
        if (Storage::disk('public')->exists($document->file_path)) {
            Storage::disk('public')->delete($document->file_path);
        }

        // Delete record from database
        $document->delete();

        return response()->json(['message' => 'Document deleted successfully']);
    }
}
