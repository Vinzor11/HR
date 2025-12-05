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
        Schema::create('certificate_text_layers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('certificate_template_id')->constrained()->cascadeOnDelete();
            $table->string('name'); // Layer identifier (e.g., 'recipient_name', 'date', 'title')
            $table->string('field_key')->nullable(); // Request field key to map to (e.g., 'full_name', 'training_title')
            $table->text('default_text')->nullable(); // Static text or template with placeholders
            $table->integer('x_position')->default(0); // X coordinate on certificate
            $table->integer('y_position')->default(0); // Y coordinate on certificate
            $table->string('font_family')->default('Arial');
            $table->integer('font_size')->default(24);
            $table->string('font_color')->default('#000000'); // Hex color
            $table->string('font_weight')->default('normal'); // normal, bold, etc.
            $table->string('text_align')->default('left'); // left, center, right
            $table->integer('max_width')->nullable(); // Max width for text wrapping
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('certificate_text_layers');
    }
};
