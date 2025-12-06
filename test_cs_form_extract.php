<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Imports\CsForm212Importer;
use Illuminate\Http\UploadedFile;

echo "=== CS Form 212 Extraction Test ===\n\n";

$filePath = storage_path('tmp/CS Form No. 212 Personal Data Sheet revised.xlsx');

if (!file_exists($filePath)) {
    echo "❌ File not found: {$filePath}\n";
    exit(1);
}

echo "📄 Testing file: " . basename($filePath) . "\n";
echo str_repeat('-', 60) . "\n";

try {
    // Create an UploadedFile instance
    $file = new UploadedFile(
        $filePath,
        basename($filePath),
        mime_content_type($filePath),
        null,
        true // test mode
    );
    
    echo "✅ File object created\n";
    
    $importer = new CsForm212Importer();
    echo "✅ Importer initialized\n";
    
    echo "\n🔄 Starting extraction...\n";
    echo str_repeat('-', 60) . "\n";
    
    $data = $importer->extract($file);
    
    echo "✅ Extraction successful!\n";
    echo "\n📊 Extracted data summary:\n";
    echo "  - Single fields: " . count($data) . " fields\n";
    
    $sections = ['family_background', 'children', 'educational_background', 
                 'civil_service_eligibility', 'work_experience', 'voluntary_work',
                 'learning_development', 'references', 'other_information', 'questionnaire'];
    
    foreach ($sections as $section) {
        if (isset($data[$section])) {
            $count = is_array($data[$section]) ? count($data[$section]) : 1;
            echo "  - {$section}: {$count} " . ($count === 1 ? 'item' : 'items') . "\n";
        }
    }
    
    echo "\n📝 Sample extracted data:\n";
    if (isset($data['surname'])) {
        echo "  Surname: " . ($data['surname'] ?? 'N/A') . "\n";
    }
    if (isset($data['first_name'])) {
        echo "  First Name: " . ($data['first_name'] ?? 'N/A') . "\n";
    }
    if (isset($data['birth_date'])) {
        echo "  Birth Date: " . ($data['birth_date'] ?? 'N/A') . "\n";
    }
    
} catch (\PhpOffice\PhpSpreadsheet\Reader\Exception $e) {
    echo "❌ PhpSpreadsheet Reader Error:\n";
    echo "   Message: " . $e->getMessage() . "\n";
    echo "   Class: " . get_class($e) . "\n";
    echo "   File: " . $e->getFile() . ":" . $e->getLine() . "\n";
} catch (\RuntimeException $e) {
    echo "❌ Runtime Error:\n";
    echo "   Message: " . $e->getMessage() . "\n";
    echo "   Class: " . get_class($e) . "\n";
    echo "   File: " . $e->getFile() . ":" . $e->getLine() . "\n";
} catch (\Throwable $e) {
    echo "❌ Unexpected Error:\n";
    echo "   Message: " . $e->getMessage() . "\n";
    echo "   Class: " . get_class($e) . "\n";
    echo "   File: " . $e->getFile() . ":" . $e->getLine() . "\n";
    echo "\n📚 Stack Trace:\n";
    echo $e->getTraceAsString() . "\n";
}

echo "\n" . str_repeat('=', 60) . "\n";

