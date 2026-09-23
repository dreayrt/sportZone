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
        if (!Schema::hasTable('users')) {
            Schema::create('users', function (Blueprint $table) {
                $table->increments('id');
                $table->string('full_name', 120);
                $table->string('email', 150)->nullable()->unique();
                $table->string('phone', 20)->unique();
                $table->string('password_hash', 255)->nullable()->comment('NULL nếu user đăng ký qua Social Login');
                $table->enum('role', ['customer', 'owner', 'admin'])->default('customer');
                $table->enum('status', ['active', 'blocked'])->default('active');
                $table->string('avatar', 500)->nullable();
                $table->dateTime('last_login_at')->nullable();
                $table->timestamps();
                $table->index(['role', 'status'], 'idx_users_role_status');
            });
        }

        if (!Schema::hasTable('password_reset_tokens')) {
            Schema::create('password_reset_tokens', function (Blueprint $table) {
                $table->string('email')->primary();
                $table->string('token');
                $table->timestamp('created_at')->nullable();
            });
        }

        if (!Schema::hasTable('sessions')) {
            Schema::create('sessions', function (Blueprint $table) {
                $table->string('id')->primary();
                $table->unsignedInteger('user_id')->nullable()->index();
                $table->string('ip_address', 45)->nullable();
                $table->text('user_agent')->nullable();
                $table->longText('payload');
                $table->integer('last_activity')->index();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sessions');
        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('users');
    }
};
