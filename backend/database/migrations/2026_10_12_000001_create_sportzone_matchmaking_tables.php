<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. match_posts (Bài đăng tìm đối / ghép kèo thể thao)
        if (! Schema::hasTable('match_posts')) {
            Schema::create('match_posts', function (Blueprint $table) {
                $table->increments('id');
                $table->unsignedInteger('user_id')->comment('Người tạo bài đăng');
                $table->unsignedInteger('sport_category_id')->comment('Môn thể thao');
                $table->unsignedInteger('venue_id')->nullable()->comment('Cơ sở sân (nếu có)');
                $table->unsignedInteger('court_id')->nullable()->comment('Sân cụ thể (nếu có)');

                $table->string('title', 200)->comment('Tiêu đề bài đăng');
                $table->text('description')->nullable()->comment('Chi tiết yêu cầu, lưu ý');

                $table->date('match_date')->comment('Ngày diễn ra trận đấu');
                $table->time('start_time')->comment('Giờ bắt đầu');
                $table->time('end_time')->comment('Giờ kết thúc');
                $table->string('location_note', 255)->nullable()->comment('Địa chỉ/Ghi chú địa điểm');

                $table->enum('skill_level', ['all', 'beginner', 'intermediate', 'advanced'])
                    ->default('all')
                    ->comment('Trình độ yêu cầu');

                $table->integer('required_members')->default(1)->comment('Số người cần tìm thêm');
                $table->integer('current_members')->default(1)->comment('Số người hiện tại (bao gồm người tạo)');
                $table->integer('estimated_cost_per_person')->nullable()->default(0)->comment('Chi phí dự kiến mỗi người');
                $table->string('contact_phone', 20)->nullable()->comment('Số điện thoại liên hệ');

                $table->enum('status', ['open', 'full', 'completed', 'cancelled'])
                    ->default('open')
                    ->comment('Trạng thái kèo');

                $table->timestamps();

                $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
                $table->foreign('sport_category_id')->references('id')->on('sport_categories');
                $table->foreign('venue_id')->references('id')->on('venues')->onDelete('set null');
                $table->foreign('court_id')->references('id')->on('courts')->onDelete('set null');

                $table->index(['sport_category_id', 'status', 'match_date'], 'idx_matches_category_status_date');
                $table->index(['user_id', 'status'], 'idx_matches_user_status');
            });
        }

        // 2. match_members (Thành viên đăng ký tham gia kèo)
        if (! Schema::hasTable('match_members')) {
            Schema::create('match_members', function (Blueprint $table) {
                $table->increments('id');
                $table->unsignedInteger('match_post_id');
                $table->unsignedInteger('user_id');
                $table->string('message', 255)->nullable()->comment('Lời nhắn khi xin vào kèo');

                $table->enum('status', ['pending', 'accepted', 'rejected', 'left'])
                    ->default('pending')
                    ->comment('Trạng thái tham gia');

                $table->timestamp('joined_at')->nullable();
                $table->timestamps();

                $table->foreign('match_post_id')->references('id')->on('match_posts')->onDelete('cascade');
                $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');

                $table->unique(['match_post_id', 'user_id'], 'uq_match_member');
                $table->index(['match_post_id', 'status'], 'idx_match_members_post_status');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('match_members');
        Schema::dropIfExists('match_posts');
    }
};
