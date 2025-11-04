<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('properties', function (Blueprint $table) {
            // Change photo_paths from text to json
            $table->json('photo_paths_new')->nullable()->after('status');
        });

        // Copy data from text to json fields
        DB::statement('UPDATE properties SET photo_paths_new = CASE 
            WHEN photo_paths IS NULL OR photo_paths = "" THEN NULL
            ELSE JSON_ARRAY(photo_paths)
        END');

        Schema::table('properties', function (Blueprint $table) {
            $table->dropColumn('photo_paths');
        });

        Schema::table('properties', function (Blueprint $table) {
            $table->renameColumn('photo_paths_new', 'photo_paths');
        });

        Schema::table('properties', function (Blueprint $table) {
            // Change amenity_list from text to json
            $table->json('amenity_list_new')->nullable()->after('photo_paths');
        });

        // Copy data from text to json fields
        DB::statement('UPDATE properties SET amenity_list_new = CASE 
            WHEN amenity_list IS NULL OR amenity_list = "" THEN NULL
            ELSE JSON_ARRAY(amenity_list)
        END');

        Schema::table('properties', function (Blueprint $table) {
            $table->dropColumn('amenity_list');
        });

        Schema::table('properties', function (Blueprint $table) {
            $table->renameColumn('amenity_list_new', 'amenity_list');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('properties', function (Blueprint $table) {
            $table->text('photo_paths_old')->nullable()->after('status');
            $table->text('amenity_list_old')->nullable()->after('photo_paths_old');
        });

        // Copy data back from json to text fields
        DB::statement('UPDATE properties SET photo_paths_old = CASE 
            WHEN photo_paths IS NULL THEN NULL
            ELSE JSON_UNQUOTE(JSON_EXTRACT(photo_paths, "$[0]"))
        END');

        DB::statement('UPDATE properties SET amenity_list_old = CASE 
            WHEN amenity_list IS NULL THEN NULL
            ELSE JSON_UNQUOTE(JSON_EXTRACT(amenity_list, "$[0]"))
        END');

        Schema::table('properties', function (Blueprint $table) {
            $table->dropColumn(['photo_paths', 'amenity_list']);
        });

        Schema::table('properties', function (Blueprint $table) {
            $table->renameColumn('photo_paths_old', 'photo_paths');
            $table->renameColumn('amenity_list_old', 'amenity_list');
        });
    }
};