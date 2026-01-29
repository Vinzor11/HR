<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class StaffGradesSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function () {
            // Philippine Government Staff Grades based on SSL (Salary Standardization Law)
            $grades = [
                // Administrative Aide Series (SG 1-6)
                ['name' => 'Administrative Aide I', 'code' => 'ADMIN_AIDE_I', 'level' => 1, 'sort_order' => 1],
                ['name' => 'Administrative Aide II', 'code' => 'ADMIN_AIDE_II', 'level' => 2, 'sort_order' => 2],
                ['name' => 'Administrative Aide III', 'code' => 'ADMIN_AIDE_III', 'level' => 3, 'sort_order' => 3],
                ['name' => 'Administrative Aide IV', 'code' => 'ADMIN_AIDE_IV', 'level' => 4, 'sort_order' => 4],
                ['name' => 'Administrative Aide V', 'code' => 'ADMIN_AIDE_V', 'level' => 5, 'sort_order' => 5],
                ['name' => 'Administrative Aide VI', 'code' => 'ADMIN_AIDE_VI', 'level' => 6, 'sort_order' => 6],
                
                // Administrative Assistant Series (SG 7-10)
                ['name' => 'Administrative Assistant I', 'code' => 'ADMIN_ASST_I', 'level' => 7, 'sort_order' => 7],
                ['name' => 'Administrative Assistant II', 'code' => 'ADMIN_ASST_II', 'level' => 8, 'sort_order' => 8],
                ['name' => 'Administrative Assistant III', 'code' => 'ADMIN_ASST_III', 'level' => 9, 'sort_order' => 9],
                ['name' => 'Administrative Assistant IV', 'code' => 'ADMIN_ASST_IV', 'level' => 10, 'sort_order' => 10],
                ['name' => 'Administrative Assistant V', 'code' => 'ADMIN_ASST_V', 'level' => 11, 'sort_order' => 11],
                
                // Administrative Officer Series (SG 11-18)
                ['name' => 'Administrative Officer I', 'code' => 'ADMIN_OFF_I', 'level' => 12, 'sort_order' => 12],
                ['name' => 'Administrative Officer II', 'code' => 'ADMIN_OFF_II', 'level' => 13, 'sort_order' => 13],
                ['name' => 'Administrative Officer III', 'code' => 'ADMIN_OFF_III', 'level' => 14, 'sort_order' => 14],
                ['name' => 'Administrative Officer IV', 'code' => 'ADMIN_OFF_IV', 'level' => 15, 'sort_order' => 15],
                ['name' => 'Administrative Officer V', 'code' => 'ADMIN_OFF_V', 'level' => 16, 'sort_order' => 16],
                
                // Supervising Administrative Officer (SG 22)
                ['name' => 'Supervising Administrative Officer', 'code' => 'SUP_ADMIN_OFF', 'level' => 17, 'sort_order' => 17],
                
                // Chief Administrative Officer (SG 24)
                ['name' => 'Chief Administrative Officer', 'code' => 'CHIEF_ADMIN_OFF', 'level' => 18, 'sort_order' => 18],
            ];

            foreach ($grades as $grade) {
                DB::table('staff_grades')->updateOrInsert(
                    ['code' => $grade['code']],
                    array_merge($grade, [
                        'description' => null,
                        'is_active' => true,
                        'updated_at' => now(),
                        'created_at' => now(),
                    ])
                );
            }
        });
    }
}
