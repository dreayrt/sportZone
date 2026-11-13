<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (! Schema::hasColumn('vouchers', 'venue_id')) {
            $unsigned = DB::getDriverName() === 'mysql' &&
                str_contains(strtolower(Schema::getColumnType('venues', 'id', true)), 'unsigned');

            Schema::table('vouchers', function (Blueprint $table) use ($unsigned): void {
                $table->integer('venue_id', false, $unsigned)->nullable()->after('id')->index();
            });

            if (Schema::hasTable('venues')) {
                Schema::table('vouchers', function (Blueprint $table): void {
                    $table->foreign('venue_id')->references('id')->on('venues')->nullOnDelete();
                });
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('vouchers', 'venue_id')) {
            Schema::table('vouchers', function (Blueprint $table): void {
                $table->dropForeign(['venue_id']);
                $table->dropColumn('venue_id');
            });
        }
    }
};

