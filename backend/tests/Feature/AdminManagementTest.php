<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Court;
use App\Models\SportCategory;
use App\Models\SystemSetting;
use App\Models\User;
use App\Models\Venue;
use App\Services\SePayQrService;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class AdminManagementTest extends TestCase
{
    use RefreshDatabase;

    public function createApplication(): Application
    {
        $app = parent::createApplication();
        $app['config']->set('database.default', 'sqlite');
        $app['config']->set('database.connections.sqlite.database', ':memory:');
        $app['config']->set('database.connections.sqlite.url', null);
        $app['config']->set('venues.cache_store', 'array');

        return $app;
    }

    public static function protectedEndpoints(): array
    {
        return [
            ['GET', '/api/v1/admin/settings'], ['PUT', '/api/v1/admin/settings'],
            ['GET', '/api/v1/admin/audit-logs'], ['GET', '/api/v1/admin/sport-categories'],
            ['POST', '/api/v1/admin/sport-categories'], ['DELETE', '/api/v1/admin/sport-categories/1'],
            ['GET', '/api/v1/admin/users'], ['GET', '/api/v1/admin/vouchers'],
        ];
    }

    #[DataProvider('protectedEndpoints')]
    public function test_admin_endpoints_require_authentication(string $method, string $path): void
    {
        $this->json($method, $path)->assertUnauthorized();
    }

    #[DataProvider('protectedEndpoints')]
    public function test_customer_cannot_access_admin_endpoints(string $method, string $path): void
    {
        Sanctum::actingAs($this->user('customer'));
        $this->json($method, $path)->assertForbidden();
        $this->assertDatabaseCount('audit_logs', 0);
    }

    public function test_settings_persist_and_update_payment_account_without_exposing_secrets(): void
    {
        $admin = $this->user('admin');
        Sanctum::actingAs($admin);
        config(['services.sepay.webhook_secret' => 'private-secret']);
        $this->getJson('/api/v1/admin/settings')->assertOk()->assertJsonPath('data.reminder_before_minutes', 60)->assertDontSee('private-secret');

        $payload = $this->settings();
        $this->putJson('/api/v1/admin/settings', $payload + ['webhook_secret' => 'not-allowed'])
            ->assertOk()->assertJsonPath('data.sepay_account_no', '0012345678');

        $this->getJson('/api/v1/admin/settings')->assertOk()->assertJsonPath('data.referral_referrer_points', 80);
        $this->assertDatabaseHas('system_settings', ['setting_key' => 'reminder_before_minutes', 'setting_value' => '30']);
        $this->assertDatabaseMissing('system_settings', ['setting_key' => 'webhook_secret']);
        $this->assertDatabaseHas('audit_logs', ['user_id' => $admin->id, 'action' => 'SETTINGS_PUT']);
        $qr = app(SePayQrService::class)->generateQrUrl(10000, 'SZTEST');
        $this->assertSame('0012345678', $qr['account_no']);
        $this->assertSame('MBBank', $qr['bank_name']);
        $this->assertSame('TEST OWNER', $qr['account_name']);
        $this->getJson('/api/v1/settings/public')->assertOk()->assertExactJson(['success' => true, 'message' => 'Thao tác thành công', 'data' => ['hotline' => '0901234567'], 'errors' => null]);
    }

    public function test_invalid_settings_do_not_save_or_create_success_log(): void
    {
        Sanctum::actingAs($this->user('admin'));
        $this->putJson('/api/v1/admin/settings', array_replace($this->settings(), ['sepay_account_no' => 'invalid', 'loyalty_points_per_10k' => -1, 'reminder_before_minutes' => 0]))
            ->assertUnprocessable()->assertJsonValidationErrors(['sepay_account_no', 'loyalty_points_per_10k', 'reminder_before_minutes']);
        $this->assertDatabaseCount('system_settings', 0);
        $this->assertDatabaseCount('audit_logs', 0);
    }

    public function test_admin_category_crud_includes_inactive_and_records_audit_log(): void
    {
        Sanctum::actingAs($this->user('admin'));
        $id = $this->postJson('/api/v1/admin/sport-categories', ['code' => 'test', 'name' => 'Test Sport', 'sort_order' => 0, 'is_active' => true])
            ->assertCreated()->json('data.id');
        $this->putJson('/api/v1/admin/sport-categories/'.$id, ['name' => 'Updated Sport', 'is_active' => false])->assertOk();
        $this->getJson('/api/v1/admin/sport-categories')->assertOk()->assertJsonPath('data.0.is_active', false)->assertJsonPath('data.0.courts_count', 0);
        $this->getJson('/api/v1/sport-categories')->assertOk()->assertJsonCount(0, 'data');
        $this->deleteJson('/api/v1/admin/sport-categories/'.$id)->assertOk();
        $this->assertDatabaseMissing('sport_categories', ['id' => $id]);
        $this->assertDatabaseHas('audit_logs', ['action' => 'SPORT_CATEGORIES_DELETE', 'entity_id' => $id]);
    }

    public function test_deleting_category_with_courts_deactivates_and_preserves_court(): void
    {
        $admin = $this->user('admin');
        $category = SportCategory::create(['code' => 'used', 'name' => 'Used Sport']);
        $venue = Venue::create(['owner_id' => $admin->id, 'code' => 'VENUE', 'slug' => 'venue', 'name' => 'Venue', 'address' => '1 Test', 'district' => 'Q1', 'city' => 'HCM', 'phone' => '0901234567', 'open_time' => '06:00', 'close_time' => '23:00', 'status' => 'active']);
        $court = Court::create(['venue_id' => $venue->id, 'sport_category_id' => $category->id, 'code' => 'COURT', 'name' => 'Court', 'surface_type' => 'Mat', 'indoor' => true, 'hourly_rate_standard' => 100000, 'hourly_rate_peak' => 150000, 'peak_start' => '17:00', 'peak_end' => '21:00', 'min_booking_minutes' => 30, 'slot_minutes' => 30, 'status' => 'active']);
        Sanctum::actingAs($admin);
        $this->getJson('/api/v1/admin/sport-categories')->assertOk()->assertJsonPath('data.0.active_courts_count', 1);
        $this->deleteJson('/api/v1/admin/sport-categories/'.$category->id)->assertOk();
        $this->assertFalse($category->fresh()->is_active);
        $this->assertModelExists($court);
    }

    public function test_audit_log_is_real_paginated_filterable_and_does_not_log_reads(): void
    {
        $admin = $this->user('admin');
        Sanctum::actingAs($admin);
        AuditLog::create(['user_id' => $admin->id, 'action' => 'SETTINGS_PUT', 'entity_type' => 'settings', 'ip_address' => '127.0.0.1']);
        AuditLog::create(['user_id' => $admin->id, 'action' => 'USERS_PUT_STATUS', 'entity_type' => 'users', 'entity_id' => 55]);
        $this->getJson('/api/v1/admin/audit-logs?search=SETTINGS&per_page=1')->assertOk()->assertJsonPath('data.total', 1)->assertJsonPath('data.data.0.user.full_name', 'Test admin');
        $this->getJson('/api/v1/admin/audit-logs?per_page=1&page=2')->assertOk()->assertJsonPath('data.current_page', 2)->assertJsonCount(1, 'data.data');
        $this->getJson('/api/v1/admin/audit-logs?date=2000-01-01')->assertOk()->assertJsonPath('data.total', 0);
        $this->assertDatabaseCount('audit_logs', 2);
    }

    public function test_blocked_admin_cannot_save_settings(): void
    {
        $admin = $this->user('admin');
        $admin->update(['status' => 'blocked']);
        Sanctum::actingAs($admin);
        $this->putJson('/api/v1/admin/settings', $this->settings())->assertForbidden();
        $this->assertDatabaseCount('system_settings', 0);
    }

    public function test_owner_cannot_read_or_modify_admin_configuration(): void
    {
        Sanctum::actingAs($this->user('owner'));
        $this->getJson('/api/v1/admin/settings')->assertForbidden();
        $this->putJson('/api/v1/admin/settings', $this->settings())->assertForbidden();
        $this->getJson('/api/v1/admin/audit-logs')->assertForbidden();
        $this->assertDatabaseCount('system_settings', 0);
    }

    public function test_user_lock_and_role_changes_are_persisted_and_audited(): void
    {
        $admin = $this->user('admin');
        $target = $this->user('customer');
        $target->createToken('admin-test');
        Sanctum::actingAs($admin);
        $this->putJson('/api/v1/admin/users/'.$target->id.'/status', ['status' => 'blocked'])->assertOk();
        $this->assertDatabaseHas('users', ['id' => $target->id, 'status' => 'blocked']);
        $this->assertSame(0, $target->tokens()->count());
        $this->putJson('/api/v1/admin/users/'.$target->id.'/status', ['status' => 'active'])->assertOk();
        $this->putJson('/api/v1/admin/users/'.$target->id.'/role', ['role' => 'owner'])->assertOk();
        $this->assertDatabaseHas('users', ['id' => $target->id, 'role' => 'owner', 'status' => 'active']);
        $this->assertDatabaseHas('audit_logs', ['action' => 'USERS_PUT_ROLE', 'entity_id' => $target->id, 'user_id' => $admin->id]);
        $this->assertDatabaseHas('audit_logs', ['action' => 'USERS_PUT_STATUS', 'entity_id' => $target->id]);
    }

    public function test_voucher_crud_pagination_and_audit(): void
    {
        Sanctum::actingAs($this->user('admin'));
        $payload = ['code' => 'ADMIN10', 'name' => 'Admin Test', 'discount_type' => 'fixed', 'discount_value' => 10000, 'min_order_value' => 0, 'starts_at' => '2026-11-13 00:00:00', 'ends_at' => '2026-12-13 23:59:00', 'status' => 'active'];
        $id = $this->postJson('/api/v1/admin/vouchers', $payload)->assertCreated()->json('data.id');
        $this->postJson('/api/v1/admin/vouchers', array_replace($payload, ['code' => 'ADMIN20']))->assertCreated();
        $this->getJson('/api/v1/admin/vouchers?per_page=1&page=2')->assertOk()->assertJsonPath('data.total', 2)->assertJsonPath('data.current_page', 2);
        $this->putJson('/api/v1/admin/vouchers/'.$id, ['status' => 'inactive'])->assertOk();
        $this->getJson('/api/v1/admin/vouchers?status=inactive')->assertOk()->assertJsonPath('data.total', 1);
        $this->deleteJson('/api/v1/admin/vouchers/'.$id)->assertOk();
        $this->assertDatabaseHas('audit_logs', ['action' => 'VOUCHERS_DELETE', 'entity_id' => $id]);
    }

    public function test_category_validation_failure_does_not_change_data_or_write_log(): void
    {
        Sanctum::actingAs($this->user('admin'));
        $this->postJson('/api/v1/admin/sport-categories', ['code' => 'test', 'name' => 'Test'])->assertCreated();
        $this->postJson('/api/v1/admin/sport-categories', ['code' => 'test', 'name' => 'Duplicate'])->assertUnprocessable()->assertJsonValidationErrors('code');
        $this->assertDatabaseCount('sport_categories', 1);
        $this->assertDatabaseCount('audit_logs', 1);
    }

    public function test_public_settings_expose_only_hotline(): void
    {
        SystemSetting::create(['setting_key' => 'hotline', 'setting_value' => '0901234567']);
        SystemSetting::create(['setting_key' => 'private_key', 'setting_value' => 'private-secret']);
        $this->getJson('/api/v1/settings/public')->assertOk()->assertJsonPath('data.hotline', '0901234567')->assertJsonCount(1, 'data')->assertDontSee('private-secret');
    }

    public function test_voucher_rejects_excessive_percentage_and_reversed_dates(): void
    {
        Sanctum::actingAs($this->user('admin'));
        $payload = ['code' => 'PERCENT', 'name' => 'Test', 'discount_type' => 'percent', 'discount_value' => 101, 'starts_at' => '2026-11-13', 'ends_at' => '2026-12-13'];
        $this->postJson('/api/v1/admin/vouchers', $payload)->assertUnprocessable()->assertJsonValidationErrors('discount_value');
        $id = $this->postJson('/api/v1/admin/vouchers', array_replace($payload, ['discount_value' => 10]))->assertCreated()->json('data.id');
        $this->putJson('/api/v1/admin/vouchers/'.$id, ['discount_value' => 101])->assertUnprocessable()->assertJsonValidationErrors('discount_value');
        $this->putJson('/api/v1/admin/vouchers/'.$id, ['ends_at' => '2026-11-01'])->assertUnprocessable()->assertJsonValidationErrors('ends_at');
        $this->assertDatabaseHas('vouchers', ['id' => $id, 'discount_value' => 10]);
        $this->assertDatabaseCount('audit_logs', 1);
    }

    private function settings(): array
    {
        return ['sepay_bank_name' => 'MBBank', 'sepay_account_no' => '0012345678', 'sepay_account_name' => 'TEST OWNER', 'hotline' => '0901234567', 'loyalty_points_per_10k' => 2, 'referral_referrer_points' => 80, 'referral_referred_points' => 40, 'reminder_before_minutes' => 30];
    }

    private function user(string $role): User
    {
        return User::create(['full_name' => 'Test '.$role, 'phone' => '0900'.str_pad((string) (User::count() + 1), 6, '0', STR_PAD_LEFT), 'role' => $role, 'status' => 'active']);
    }
}
