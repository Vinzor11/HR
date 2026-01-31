<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Support multiple allowed units per client: each (client, unit, position) has a role.
     * unit_id null + position_id null = "any unit" → grant role (e.g. user) to everyone not matching another rule.
     */
    public function up(): void
    {
        // Skip if already applied (unit_id exists)
        if (Schema::hasColumn('oauth_client_position_roles', 'unit_id')) {
            return;
        }

        // Drop constraints only if they exist (production may have different schema history)
        $this->dropForeignIfExists('oauth_client_position_roles', 'oauth_client_position_roles_oauth_client_id_foreign');
        $this->dropUniqueIfExists('oauth_client_position_roles', 'oauth_client_pos_roles_unique');

        Schema::table('oauth_client_position_roles', function (Blueprint $table) {
            $table->foreignId('unit_id')->nullable()->after('oauth_client_id')
                ->constrained('units')->nullOnDelete();
        });

        // position_id nullable for "any unit" row (unit_id null, position_id null, role user)
        Schema::table('oauth_client_position_roles', function (Blueprint $table) {
            $table->unsignedBigInteger('position_id')->nullable()->change();
        });

        Schema::table('oauth_client_position_roles', function (Blueprint $table) {
            $table->unique(['oauth_client_id', 'unit_id', 'position_id'], 'oauth_client_unit_pos_unique');
            $table->foreign('oauth_client_id')->references('id')->on('oauth_clients')->cascadeOnDelete();
            $table->foreign('position_id')->references('id')->on('positions')->cascadeOnDelete();
        });

        // Backfill: set unit_id from oauth_clients.allowed_unit_id for existing rows
        $clients = DB::table('oauth_clients')->whereNotNull('allowed_unit_id')->pluck('allowed_unit_id', 'id');
        foreach ($clients as $clientId => $unitId) {
            DB::table('oauth_client_position_roles')
                ->where('oauth_client_id', $clientId)
                ->update(['unit_id' => $unitId]);
        }

        // Clients that had "any unit" (allowed_unit_id null): add one row (client, null, null, user)
        $clientIds = DB::table('oauth_clients')
            ->whereNull('allowed_unit_id')
            ->pluck('id');
        foreach ($clientIds as $clientId) {
            $exists = DB::table('oauth_client_position_roles')
                ->where('oauth_client_id', $clientId)
                ->whereNull('unit_id')
                ->whereNull('position_id')
                ->exists();
            if (!$exists) {
                DB::table('oauth_client_position_roles')->insert([
                    'oauth_client_id' => $clientId,
                    'unit_id' => null,
                    'position_id' => null,
                    'role' => 'user',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }
    }

    private function dropForeignIfExists(string $table, string $foreignKey): void
    {
        $exists = DB::selectOne(
            "SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = ? AND CONSTRAINT_TYPE = 'FOREIGN KEY' AND CONSTRAINT_NAME = ?",
            [$table, $foreignKey]
        );
        if ($exists) {
            Schema::table($table, function (Blueprint $t) use ($foreignKey) {
                $t->dropForeign($foreignKey);
            });
        }
    }

    private function dropUniqueIfExists(string $table, string $index): void
    {
        $exists = DB::selectOne(
            "SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = ? AND CONSTRAINT_TYPE = 'UNIQUE' AND CONSTRAINT_NAME = ?",
            [$table, $index]
        );
        if ($exists) {
            Schema::table($table, function (Blueprint $t) use ($index) {
                $t->dropUnique($index);
            });
        }
    }

    public function down(): void
    {
        DB::table('oauth_client_position_roles')->whereNull('unit_id')->whereNull('position_id')->delete();
        Schema::table('oauth_client_position_roles', function (Blueprint $table) {
            $table->dropForeign(['position_id']);
            $table->dropForeign(['oauth_client_id']);
            $table->dropUnique('oauth_client_unit_pos_unique');
        });
        Schema::table('oauth_client_position_roles', function (Blueprint $table) {
            $table->dropForeign(['unit_id']);
            $table->unsignedBigInteger('position_id')->nullable(false)->change();
            $table->unique(['oauth_client_id', 'position_id'], 'oauth_client_pos_roles_unique');
            $table->foreign('oauth_client_id')->references('id')->on('oauth_clients')->cascadeOnDelete();
            $table->foreign('position_id')->references('id')->on('positions')->cascadeOnDelete();
        });
    }
};
