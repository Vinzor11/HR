<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('certificate_text_layers', function (Blueprint $table) {
            if (!Schema::hasColumn('certificate_text_layers', 'certificate_template_id')) {
                $table->foreignId('certificate_template_id')->after('id')->constrained()->cascadeOnDelete();
            }
            if (!Schema::hasColumn('certificate_text_layers', 'name')) {
                $table->string('name')->after('certificate_template_id');
            }
            if (!Schema::hasColumn('certificate_text_layers', 'field_key')) {
                $table->string('field_key')->nullable()->after('name');
            }
            if (!Schema::hasColumn('certificate_text_layers', 'default_text')) {
                $table->text('default_text')->nullable()->after('field_key');
            }
            if (!Schema::hasColumn('certificate_text_layers', 'x_position')) {
                $table->integer('x_position')->default(0)->after('default_text');
            }
            if (!Schema::hasColumn('certificate_text_layers', 'y_position')) {
                $table->integer('y_position')->default(0)->after('x_position');
            }
            if (!Schema::hasColumn('certificate_text_layers', 'font_family')) {
                $table->string('font_family')->default('Arial')->after('y_position');
            }
            if (!Schema::hasColumn('certificate_text_layers', 'font_size')) {
                $table->integer('font_size')->default(24)->after('font_family');
            }
            if (!Schema::hasColumn('certificate_text_layers', 'font_color')) {
                $table->string('font_color')->default('#000000')->after('font_size');
            }
            if (!Schema::hasColumn('certificate_text_layers', 'font_weight')) {
                $table->string('font_weight')->default('normal')->after('font_color');
            }
            if (!Schema::hasColumn('certificate_text_layers', 'text_align')) {
                $table->string('text_align')->default('left')->after('font_weight');
            }
            if (!Schema::hasColumn('certificate_text_layers', 'max_width')) {
                $table->integer('max_width')->nullable()->after('text_align');
            }
            if (!Schema::hasColumn('certificate_text_layers', 'sort_order')) {
                $table->unsignedInteger('sort_order')->default(0)->after('max_width');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('certificate_text_layers', function (Blueprint $table) {
            $table->dropForeign(['certificate_template_id']);
            $table->dropColumn([
                'certificate_template_id',
                'name',
                'field_key',
                'default_text',
                'x_position',
                'y_position',
                'font_family',
                'font_size',
                'font_color',
                'font_weight',
                'text_align',
                'max_width',
                'sort_order',
            ]);
        });
    }
};
