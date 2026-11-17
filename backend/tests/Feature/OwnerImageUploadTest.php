<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class OwnerImageUploadTest extends TestCase
{
    use RefreshDatabase;

    public function createApplication(): Application
    {
        $app = parent::createApplication();
        $app['config']->set('database.default', 'sqlite');
        $app['config']->set('database.connections.sqlite.database', ':memory:');
        $app['config']->set('database.connections.sqlite.url', null);
        $app['config']->set('venues.cloudinary_cloud', null);

        return $app;
    }

    public function test_owner_can_upload_image_without_cloudinary(): void
    {
        Storage::fake('public');
        Http::preventStrayRequests();
        $owner = $this->user('owner');
        Sanctum::actingAs($owner);

        $response = $this->postJson('/api/v1/owner/images', [
            'image' => UploadedFile::fake()->image('aquafina.jpg'),
        ])->assertOk()->assertJsonPath('success', true);

        $imageUrl = $response->json('data.url');
        $this->assertStringStartsWith(url('/storage/venues/owner-'.$owner->id).'/', $imageUrl);
        Storage::disk('public')->assertExists(Str::after($imageUrl, '/storage/'));
        Http::assertNothingSent();
    }

    public function test_upload_returns_422_for_non_image_and_stores_nothing(): void
    {
        Storage::fake('public');
        Sanctum::actingAs($this->user('owner'));

        $this->postJson('/api/v1/owner/images', [
            'image' => UploadedFile::fake()->create('document.pdf', 10, 'application/pdf'),
        ])->assertUnprocessable()->assertJsonValidationErrors('image');

        $this->assertSame([], Storage::disk('public')->allFiles());
    }

    public function test_upload_requires_authentication(): void
    {
        $this->postJson('/api/v1/owner/images')->assertUnauthorized();
    }

    public function test_customer_cannot_upload_owner_image(): void
    {
        Storage::fake('public');
        Sanctum::actingAs($this->user('customer'));

        $this->postJson('/api/v1/owner/images', [
            'image' => UploadedFile::fake()->image('aquafina.jpg'),
        ])->assertForbidden();

        $this->assertSame([], Storage::disk('public')->allFiles());
    }

    private function user(string $role): User
    {
        return User::create(['full_name' => 'Upload test', 'phone' => '0900000001', 'role' => $role, 'status' => 'active']);
    }
}
