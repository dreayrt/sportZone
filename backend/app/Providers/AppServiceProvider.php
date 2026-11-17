<?php

namespace App\Providers;

use Illuminate\Console\Events\CommandStarting;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\ServiceProvider;
use RuntimeException;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Event::listen(CommandStarting::class, function (CommandStarting $event): void {
            if (! in_array($event->command, ['serve', 'dev'], true)) {
                return;
            }

            $event->output->writeln('<info>SportZone: applying pending database migrations before startup...</info>');
            $exitCode = Artisan::call('migrate', ['--force' => true, '--no-interaction' => true], $event->output);
            if ($exitCode !== 0) {
                throw new RuntimeException('Database migration failed. Server startup has been stopped.');
            }
        });
    }
}
