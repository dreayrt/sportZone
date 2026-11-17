<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Console\Events\CommandStarting;
use Illuminate\Foundation\Testing\WithConsoleEvents;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Schema;
use PHPUnit\Framework\Attributes\DataProvider;
use RuntimeException;
use Symfony\Component\Console\Input\ArrayInput;
use Symfony\Component\Console\Output\BufferedOutput;
use Tests\TestCase;

class StartupMigrationTest extends TestCase
{
    use WithConsoleEvents;

    public static function startupCommands(): array
    {
        return [['serve'], ['dev']];
    }

    #[DataProvider('startupCommands')]
    public function test_startup_applies_migrations_and_preserves_existing_data_on_restart(string $command): void
    {
        config(['database.connections.startup' => config('database.connections.sqlite')]);
        DB::setDefaultConnection('startup');
        $this->assertSame(':memory:', DB::connection()->getDatabaseName());
        $this->assertFalse(Schema::hasTable('users'));
        $output = new BufferedOutput;

        Event::dispatch(new CommandStarting($command, new ArrayInput([]), $output));

        $this->assertTrue(Schema::hasTable('users'));
        $this->assertTrue(Schema::hasColumn('venues', 'admin_suspended_at'));
        $user = User::create(['full_name' => 'Preserved on restart', 'phone' => null, 'role' => 'customer', 'status' => 'active']);

        Event::dispatch(new CommandStarting($command, new ArrayInput([]), $output));

        $this->assertModelExists($user);
        $this->assertDatabaseCount('users', 1);
        $this->assertStringContainsString('Nothing to migrate', $output->fetch());
    }

    public function test_startup_is_stopped_when_migration_fails(): void
    {
        $output = new BufferedOutput;
        Artisan::shouldReceive('call')->once()->with('migrate', ['--force' => true, '--no-interaction' => true], $output)->andReturn(1);

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('Database migration failed. Server startup has been stopped.');

        Event::dispatch(new CommandStarting('serve', new ArrayInput([]), $output));
    }

    public function test_other_commands_do_not_trigger_startup_migrations(): void
    {
        $output = new BufferedOutput;
        Artisan::shouldReceive('call')->never();

        Event::dispatch(new CommandStarting('route:list', new ArrayInput([]), $output));

        $this->assertSame('', $output->fetch());
    }
}
