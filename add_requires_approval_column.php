<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

try {
    // Check if column already exists
    $columns = DB::select("SHOW COLUMNS FROM trainings LIKE 'requires_approval'");
    
    if (count($columns) > 0) {
        echo "Column 'requires_approval' already exists.\n";
        exit(0);
    }

    // Add the column
    DB::statement("
        ALTER TABLE `trainings` 
        ADD COLUMN `requires_approval` BOOLEAN NOT NULL DEFAULT FALSE AFTER `remarks`
    ");

    // Update any existing NULL values (if any)
    DB::table('trainings')
        ->whereNull('requires_approval')
        ->update(['requires_approval' => false]);

    echo "Column 'requires_approval' added successfully!\n";
    
    // Check if request_type_id column exists
    $requestTypeColumns = DB::select("SHOW COLUMNS FROM trainings LIKE 'request_type_id'");
    
    if (count($requestTypeColumns) === 0) {
        // Add request_type_id column if it doesn't exist
        DB::statement("
            ALTER TABLE `trainings` 
            ADD COLUMN `request_type_id` BIGINT UNSIGNED NULL AFTER `requires_approval`,
            ADD CONSTRAINT `trainings_request_type_id_foreign` 
            FOREIGN KEY (`request_type_id`) REFERENCES `request_types` (`id`) ON DELETE SET NULL
        ");
        echo "Column 'request_type_id' added successfully!\n";
    } else {
        echo "Column 'request_type_id' already exists.\n";
    }
    
} catch (\Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}






