<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class AcademicRanksSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function () {
            // Philippine SUC Academic Ranks based on NBC 461 and related issuances
            $ranks = [
                // Instructor Ranks
                ['name' => 'Instructor I', 'code' => 'INST_I', 'level' => 1, 'sort_order' => 1],
                ['name' => 'Instructor II', 'code' => 'INST_II', 'level' => 2, 'sort_order' => 2],
                ['name' => 'Instructor III', 'code' => 'INST_III', 'level' => 3, 'sort_order' => 3],
                
                // Assistant Professor Ranks
                ['name' => 'Assistant Professor I', 'code' => 'ASST_PROF_I', 'level' => 4, 'sort_order' => 4],
                ['name' => 'Assistant Professor II', 'code' => 'ASST_PROF_II', 'level' => 5, 'sort_order' => 5],
                ['name' => 'Assistant Professor III', 'code' => 'ASST_PROF_III', 'level' => 6, 'sort_order' => 6],
                ['name' => 'Assistant Professor IV', 'code' => 'ASST_PROF_IV', 'level' => 7, 'sort_order' => 7],
                
                // Associate Professor Ranks
                ['name' => 'Associate Professor I', 'code' => 'ASSOC_PROF_I', 'level' => 8, 'sort_order' => 8],
                ['name' => 'Associate Professor II', 'code' => 'ASSOC_PROF_II', 'level' => 9, 'sort_order' => 9],
                ['name' => 'Associate Professor III', 'code' => 'ASSOC_PROF_III', 'level' => 10, 'sort_order' => 10],
                ['name' => 'Associate Professor IV', 'code' => 'ASSOC_PROF_IV', 'level' => 11, 'sort_order' => 11],
                ['name' => 'Associate Professor V', 'code' => 'ASSOC_PROF_V', 'level' => 12, 'sort_order' => 12],
                
                // Professor Ranks
                ['name' => 'Professor I', 'code' => 'PROF_I', 'level' => 13, 'sort_order' => 13],
                ['name' => 'Professor II', 'code' => 'PROF_II', 'level' => 14, 'sort_order' => 14],
                ['name' => 'Professor III', 'code' => 'PROF_III', 'level' => 15, 'sort_order' => 15],
                ['name' => 'Professor IV', 'code' => 'PROF_IV', 'level' => 16, 'sort_order' => 16],
                ['name' => 'Professor V', 'code' => 'PROF_V', 'level' => 17, 'sort_order' => 17],
                ['name' => 'Professor VI', 'code' => 'PROF_VI', 'level' => 18, 'sort_order' => 18],
                
                // University Professor (Highest Academic Rank)
                ['name' => 'University Professor', 'code' => 'UNIV_PROF', 'level' => 19, 'sort_order' => 19],
            ];

            foreach ($ranks as $rank) {
                DB::table('academic_ranks')->updateOrInsert(
                    ['code' => $rank['code']],
                    array_merge($rank, [
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
