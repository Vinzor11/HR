<?php

require __DIR__ . '/vendor/autoload.php';

use PhpOffice\PhpSpreadsheet\IOFactory;

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

echo "=== CS Form 212 File Analysis ===\n\n";

$files = [
    'working' => storage_path('tmp/filled_personal_data_sheet.xlsx'),
    'failing' => storage_path('tmp/CS Form No. 212 Personal Data Sheet revised.xlsx'),
];

foreach ($files as $type => $filePath) {
    if (!file_exists($filePath)) {
        echo "❌ File not found: {$filePath}\n";
        continue;
    }

    echo "📄 Analyzing: " . basename($filePath) . " ({$type})\n";
    echo str_repeat('-', 60) . "\n";

    try {
        $spreadsheet = IOFactory::load($filePath);
        
        echo "✅ File loaded successfully\n";
        echo "📊 Sheet count: " . $spreadsheet->getSheetCount() . "\n";
        echo "\n📋 Sheets found:\n";
        
        $sheetNames = [];
        foreach ($spreadsheet->getWorksheetIterator() as $worksheet) {
            $sheetName = $worksheet->getTitle();
            $sheetNames[] = $sheetName;
            $rowCount = $worksheet->getHighestRow();
            $colCount = $worksheet->getHighestColumn();
            
            echo "  - {$sheetName} (Rows: {$rowCount}, Columns: {$colCount})\n";
        }
        
        echo "\n🔍 Expected sheets: C1, C2, C3, C4\n";
        echo "📝 Found sheets: " . implode(', ', $sheetNames) . "\n";
        
        $expectedSheets = ['C1', 'C2', 'C3', 'C4'];
        $missing = array_diff($expectedSheets, $sheetNames);
        $extra = array_diff($sheetNames, $expectedSheets);
        
        if (!empty($missing)) {
            echo "⚠️  Missing sheets: " . implode(', ', $missing) . "\n";
        }
        if (!empty($extra)) {
            echo "⚠️  Extra sheets: " . implode(', ', $extra) . "\n";
        }
        
        // Check if C1 sheet exists and sample some cells
        if (in_array('C1', $sheetNames)) {
            $c1Sheet = $spreadsheet->getSheetByName('C1');
            echo "\n🔬 Sample cells from C1 sheet:\n";
            $sampleCells = ['D10', 'D11', 'D12', 'D13', 'D15', 'D16', 'D17'];
            foreach ($sampleCells as $cell) {
                $value = $c1Sheet->getCell($cell)->getValue();
                $displayValue = $value ? (strlen($value) > 30 ? substr($value, 0, 30) . '...' : $value) : '(empty)';
                echo "  {$cell}: {$displayValue}\n";
            }
        } else {
            echo "\n❌ C1 sheet not found! This is required.\n";
        }
        
    } catch (\Exception $e) {
        echo "❌ Error loading file: " . $e->getMessage() . "\n";
        echo "   Exception class: " . get_class($e) . "\n";
    }
    
    echo "\n" . str_repeat('=', 60) . "\n\n";
}

echo "✅ Analysis complete!\n";

