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
        $userIdType = Schema::getColumnType('users', 'id', true);
        $hasActor = Schema::hasColumn('venues', 'admin_suspended_by');
        Schema::table('venues', function (Blueprint $table) use ($userIdType, $hasActor): void {
            if (! Schema::hasColumn('venues', 'admin_suspended_at')) {
                $table->timestamp('admin_suspended_at')->nullable();
            }
            if (! Schema::hasColumn('venues', 'admin_suspension_reason')) {
                $table->string('admin_suspension_reason', 500)->nullable();
            }
            $actor = str_contains($userIdType, 'bigint') ? $table->bigInteger('admin_suspended_by') : $table->integer('admin_suspended_by');
            $actor->unsigned(str_contains($userIdType, 'unsigned'))->nullable();
            if ($hasActor) {
                $actor->change();
            }
        });
        Schema::table('venues', function (Blueprint $table): void {
            $table->foreign('admin_suspended_by')->references('id')->on('users')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('venues', function (Blueprint $table) {
            $table->dropForeign(['admin_suspended_by']);
            $table->dropColumn(['admin_suspended_at', 'admin_suspension_reason', 'admin_suspended_by']);
        });
    }
};
