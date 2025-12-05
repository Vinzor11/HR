<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('departments', function (Blueprint $table) {
            if (!Schema::hasColumn('departments', 'faculty_code')) {
                $table->string('faculty_code', 10)->nullable()->after('id');
            }

            if (!Schema::hasColumn('departments', 'faculty_name')) {
                $table->string('faculty_name', 100)->nullable()->after('faculty_code');
            }
        });

        $departments = DB::table('departments')
            ->select('id', 'faculty_code', 'faculty_name', 'code', 'name', 'description')
            ->get();

        foreach ($departments as $department) {
            $normalizedName = $department->faculty_name;

            if (blank($normalizedName)) {
                $normalizedName = $department->name;
            }

            if (blank($normalizedName) && filled($department->description)) {
                $normalizedName = preg_replace('/^Department of\\s+/i', '', $department->description);
            }

            if (blank($normalizedName)) {
                $normalizedName = 'Department ' . $department->id;
            }

            $normalizedCode = $department->faculty_code;

            if (blank($normalizedCode)) {
                $normalizedCode = $department->code;
            }

            if (blank($normalizedCode)) {
                $slug = Str::upper(Str::slug($normalizedName, ''));
                $normalizedCode = substr($slug, 0, 10) ?: 'DEPT' . $department->id;
            }

            DB::table('departments')
                ->where('id', $department->id)
                ->update([
                    'faculty_name' => $normalizedName,
                    'faculty_code' => substr($normalizedCode, 0, 10),
                ]);
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('departments', 'faculty_name')) {
            Schema::table('departments', function (Blueprint $table) {
                $table->dropColumn('faculty_name');
            });
        }

        if (Schema::hasColumn('departments', 'faculty_code')) {
            Schema::table('departments', function (Blueprint $table) {
                $table->dropColumn('faculty_code');
            });
        }
    }
};

