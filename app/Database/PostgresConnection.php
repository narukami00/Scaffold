<?php

namespace App\Database;

use Illuminate\Database\PostgresConnection as BasePostgresConnection;
use DateTimeInterface;

/**
 * Neon/PgBouncer needs PDO::ATTR_EMULATE_PREPARES. With that on, Laravel's
 * default bool→0/1 bindings break PostgreSQL boolean columns. Bind booleans
 * as 'true'/'false' strings so comparisons and updates work.
 */
class PostgresConnection extends BasePostgresConnection
{
    public function prepareBindings(array $bindings)
    {
        foreach ($bindings as $key => $value) {
            if ($value instanceof DateTimeInterface) {
                $bindings[$key] = $value->format($this->getQueryGrammar()->getDateFormat());
            } elseif (is_bool($value)) {
                $bindings[$key] = $value ? 'true' : 'false';
            }
        }

        return $bindings;
    }
}
