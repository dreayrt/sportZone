<?php

namespace Tests;

use Illuminate\Contracts\Console\Kernel;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use RuntimeException;

abstract class TestCase extends BaseTestCase
{
    public function createApplication(): Application
    {
        $app = parent::createApplication();
        // Even cached local configuration must never point tests at the app database.
        $app['config']->set('database.default', 'sqlite');
        $app['config']->set('database.connections.sqlite.database', ':memory:');
        $app['config']->set('database.connections.sqlite.url', null);
        $app['config']->set('venues.cache_store', 'array');

        $connection = $app['db']->connection();
        if ($connection->getDriverName() !== 'sqlite' || $connection->getDatabaseName() !== ':memory:') {
            throw new RuntimeException('Tests must use an isolated in-memory SQLite database.');
        }

        if ($app->make(Kernel::class)->call('migrate', ['--force' => true, '--no-interaction' => true]) !== 0) {
            throw new RuntimeException('Could not prepare the isolated test database.');
        }

        return $app;
    }
}
