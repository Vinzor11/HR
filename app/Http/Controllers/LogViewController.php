<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;

class LogViewController extends Controller
{
    /**
     * Display the log viewer interface.
     * Only accessible to users with Super Admin role.
     */
    public function index(Request $request)
    {
        // Only allow Super Admin to access logs
        if (!auth()->user()->hasRole('super-admin')) {
            abort(403, 'Unauthorized access. Only Super Admins can view logs.');
        }

        $lines = (int) $request->get('lines', 500);
        $lines = min(max($lines, 50), 5000); // Limit between 50 and 5000 lines

        $logFile = storage_path('logs/laravel.log');
        
        if (!file_exists($logFile)) {
            return response()->json([
                'error' => 'Log file not found',
                'message' => 'The log file does not exist yet. Errors will appear here once they occur.',
            ], 404);
        }

        // Get file info
        $fileSize = filesize($logFile);
        $fileSizeFormatted = $this->formatBytes($fileSize);
        $lastModified = date('Y-m-d H:i:s', filemtime($logFile));

        // Read the last N lines
        $logContent = $this->tailFile($logFile, $lines);

        // Count errors, warnings, etc.
        $errorCount = substr_count($logContent, 'ERROR');
        $warningCount = substr_count($logContent, 'WARNING');
        $criticalCount = substr_count($logContent, 'CRITICAL');
        $infoCount = substr_count($logContent, 'INFO');

        return response()->json([
            'logs' => $logContent,
            'metadata' => [
                'file_size' => $fileSize,
                'file_size_formatted' => $fileSizeFormatted,
                'last_modified' => $lastModified,
                'lines_shown' => $lines,
                'total_lines' => $this->countLines($logFile),
                'errors' => $errorCount,
                'warnings' => $warningCount,
                'critical' => $criticalCount,
                'info' => $infoCount,
            ],
        ]);
    }

    /**
     * Get the last N lines of a file efficiently.
     */
    private function tailFile(string $filePath, int $lines = 500): string
    {
        if (!file_exists($filePath)) {
            return '';
        }

        // Use a more reliable method: read the entire file and get last N lines
        // For very large files, this might be memory intensive, but it's more reliable
        $content = file_get_contents($filePath);
        
        if ($content === false) {
            return 'Unable to read log file.';
        }
        
        // Split into lines
        $allLines = explode("\n", $content);
        
        // Get the last N lines
        $lastLines = array_slice($allLines, -$lines);
        
        return implode("\n", $lastLines);
    }

    /**
     * Count total lines in a file.
     */
    private function countLines(string $filePath): int
    {
        if (!file_exists($filePath)) {
            return 0;
        }

        $file = new \SplFileObject($filePath, 'r');
        $file->seek(PHP_INT_MAX);
        $lineCount = $file->key() + 1;
        unset($file);
        
        return $lineCount;
    }

    /**
     * Format bytes to human readable format.
     */
    private function formatBytes(int $bytes, int $precision = 2): string
    {
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        
        for ($i = 0; $bytes > 1024 && $i < count($units) - 1; $i++) {
            $bytes /= 1024;
        }
        
        return round($bytes, $precision) . ' ' . $units[$i];
    }

    /**
     * Clear the log file (use with caution!).
     */
    public function clear(Request $request)
    {
        // Only allow Super Admin
        if (!auth()->user()->hasRole('super-admin')) {
            abort(403, 'Unauthorized access.');
        }

        $logFile = storage_path('logs/laravel.log');
        
        if (file_exists($logFile)) {
            // Create a backup before clearing
            $backupFile = storage_path('logs/laravel_' . date('Y-m-d_His') . '.log');
            copy($logFile, $backupFile);
            
            // Clear the log file
            file_put_contents($logFile, '');
            
            Log::info('Log file cleared by user', [
                'user_id' => auth()->id(),
                'backup_file' => $backupFile,
            ]);
            
            return response()->json([
                'success' => true,
                'message' => 'Log file cleared. Backup saved to: ' . basename($backupFile),
            ]);
        }

        return response()->json([
            'error' => 'Log file does not exist',
        ], 404);
    }

    /**
     * Download the log file.
     */
    public function download()
    {
        // Only allow Super Admin
        if (!auth()->user()->hasRole('super-admin')) {
            abort(403, 'Unauthorized access.');
        }

        $logFile = storage_path('logs/laravel.log');
        
        if (!file_exists($logFile)) {
            abort(404, 'Log file not found');
        }

        return response()->download($logFile, 'laravel_' . date('Y-m-d_His') . '.log');
    }
}

