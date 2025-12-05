<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

try {
    if (Schema::hasTable('training_allowed_faculties')) {
        echo "Table 'training_allowed_faculties' already exists.\n";
        exit(0);
    }

    DB::statement("
        CREATE TABLE `training_allowed_faculties` (
          `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
          `training_id` bigint(20) unsigned NOT NULL,
          `faculty_id` bigint(20) unsigned NOT NULL,
          `created_at` timestamp NULL DEFAULT NULL,
          `updated_at` timestamp NULL DEFAULT NULL,
          PRIMARY KEY (`id`),
          KEY `training_allowed_faculties_training_id_foreign` (`training_id`),
          KEY `training_allowed_faculties_faculty_id_foreign` (`faculty_id`),
          CONSTRAINT `training_allowed_faculties_training_id_foreign` FOREIGN KEY (`training_id`) REFERENCES `trainings` (`training_id`) ON DELETE CASCADE,
          CONSTRAINT `training_allowed_faculties_faculty_id_foreign` FOREIGN KEY (`faculty_id`) REFERENCES `faculties` (`id`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");

    echo "Table 'training_allowed_faculties' created successfully!\n";
} catch (\Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}






