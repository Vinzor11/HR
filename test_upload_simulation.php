<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Imports\CsForm212Importer;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;

echo "=== CS Form 212 Upload Simulation Test ===\n\n";

$filePath = storage_path('tmp/CS Form No. 212 Personal Data Sheet revised.xlsx');

if (!file_exists($filePath)) {
    echo "❌ File not found: {$filePath}\n";
    exit(1);
}

echo "📄 Testing file: " . basename($filePath) . "\n";
echo "📏 File size: " . filesize($filePath) . " bytes\n";
echo "📋 MIME type: " . mime_content_type($filePath) . "\n";
echo str_repeat('-', 60) . "\n\n";

// Test 1: Direct file path
echo "Test 1: Direct file path extraction\n";
try {
    $importer = new CsForm212Importer();
    $data = $importer->extract($filePath);
    echo "✅ Direct path extraction: SUCCESS\n";
    echo "   Extracted " . count($data) . " top-level fields\n\n";
} catch (\Throwable $e) {
    echo "❌ Direct path extraction: FAILED\n";
    echo "   Error: " . $e->getMessage() . "\n";
    echo "   Class: " . get_class($e) . "\n\n";
}

// Test 2: UploadedFile simulation
echo "Test 2: UploadedFile simulation\n";
try {
    $file = new UploadedFile(
        $filePath,
        basename($filePath),
        mime_content_type($filePath),
        null,
        true // test mode
    );
    
    echo "   File object created\n";
    echo "   Original name: " . $file->getClientOriginalName() . "\n";
    echo "   MIME type: " . $file->getMimeType() . "\n";
    echo "   Size: " . $file->getSize() . " bytes\n";
    echo "   Is valid: " . ($file->isValid() ? 'Yes' : 'No') . "\n";
    echo "   Real path: " . $file->getRealPath() . "\n";
    echo "   Path exists: " . (file_exists($file->getRealPath()) ? 'Yes' : 'No') . "\n";
    echo "   Path readable: " . (is_readable($file->getRealPath()) ? 'Yes' : 'No') . "\n";
    
    $importer = new CsForm212Importer();
    $data = $importer->extract($file);
    echo "✅ UploadedFile extraction: SUCCESS\n";
    echo "   Extracted " . count($data) . " top-level fields\n\n";
} catch (\Throwable $e) {
    echo "❌ UploadedFile extraction: FAILED\n";
    echo "   Error: " . $e->getMessage() . "\n";
    echo "   Class: " . get_class($e) . "\n";
    echo "   File: " . $e->getFile() . ":" . $e->getLine() . "\n";
    echo "\n📚 Stack trace:\n";
    $trace = $e->getTraceAsString();
    $lines = explode("\n", $trace);
    foreach (array_slice($lines, 0, 10) as $line) {
        echo "   " . $line . "\n";
    }
    echo "\n";
}

// Test 3: Check file integrity
echo "Test 3: File integrity check\n";
try {
    $spreadsheet = \PhpOffice\PhpSpreadsheet\IOFactory::load($filePath);
    $sheetCount = $spreadsheet->getSheetCount();
    echo "✅ File can be loaded by PhpSpreadsheet\n";
    echo "   Sheet count: {$sheetCount}\n";
    
    $sheetNames = [];
    foreach ($spreadsheet->getWorksheetIterator() as $worksheet) {
        $sheetNames[] = $worksheet->getTitle();
    }
    echo "   Sheets: " . implode(', ', $sheetNames) . "\n";
    
    // Check if C1 sheet exists and has data
    if (in_array('C1', $sheetNames)) {
        $c1Sheet = $spreadsheet->getSheetByName('C1');
        $highestRow = $c1Sheet->getHighestRow();
        $highestCol = $c1Sheet->getHighestColumn();
        echo "   C1 sheet: {$highestRow} rows, {$highestCol} columns\n";
        
        // Check a few key cells
        $keyCells = ['D10', 'D11', 'D12', 'D13'];
        echo "   Key cells:\n";
        foreach ($keyCells as $cell) {
            $value = $c1Sheet->getCell($cell)->getValue();
            $display = $value ? (strlen($value) > 20 ? substr($value, 0, 20) . '...' : $value) : '(empty)';
            echo "     {$cell}: {$display}\n";
        }
    }
    echo "\n";
} catch (\Throwable $e) {
    echo "❌ File integrity check: FAILED\n";
    echo "   Error: " . $e->getMessage() . "\n";
    echo "   Class: " . get_class($e) . "\n\n";
}

// Test 4: Compare with working file
echo "Test 4: Comparison with working file\n";
$workingFilePath = storage_path('tmp/filled_personal_data_sheet.xlsx');
if (file_exists($workingFilePath)) {
    try {
        $workingFile = new UploadedFile(
            $workingFilePath,
            basename($workingFilePath),
            mime_content_type($workingFilePath),
            null,
            true
        );
        
        $importer = new CsForm212Importer();
        $workingData = $importer->extract($workingFile);
        echo "✅ Working file extraction: SUCCESS\n";
        echo "   Extracted " . count($workingData) . " top-level fields\n";
        
        // Compare file sizes
        echo "\n   File size comparison:\n";
        echo "     Working: " . filesize($workingFilePath) . " bytes\n";
        echo "     Failing: " . filesize($filePath) . " bytes\n";
        
        // Compare MIME types
        echo "\n   MIME type comparison:\n";
        echo "     Working: " . mime_content_type($workingFilePath) . "\n";
        echo "     Failing: " . mime_content_type($filePath) . "\n";
        
    } catch (\Throwable $e) {
        echo "❌ Working file extraction: FAILED\n";
        echo "   Error: " . $e->getMessage() . "\n\n";
    }
} else {
    echo "⚠️  Working file not found for comparison\n";
}

echo "\n" . str_repeat('=', 60) . "\n";
echo "✅ All tests complete!\n";

