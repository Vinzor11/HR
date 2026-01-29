<?php

namespace App\Models\Relations;

use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Collection;

/**
 * BelongsToMany that returns an empty collection when the pivot table doesn't exist.
 * Used so Training allowedSectors/allowedUnits don't 500 on Railway before migrations run.
 */
class SafeBelongsToMany extends BelongsToMany
{
    protected function pivotTableExists(): bool
    {
        return Schema::hasTable($this->getTable());
    }

    public function getResults()
    {
        if (! $this->pivotTableExists()) {
            return $this->related->newCollection();
        }

        return parent::getResults();
    }

    public function get($columns = ['*'])
    {
        if (! $this->pivotTableExists()) {
            return $this->related->newCollection();
        }

        return parent::get($columns);
    }

    public function sync($ids, $detaching = true)
    {
        if (! $this->pivotTableExists()) {
            return ['attached' => [], 'detached' => [], 'updated' => []];
        }

        return parent::sync($ids, $detaching);
    }

    /**
     * Override pluck to handle missing pivot tables gracefully.
     * When pluck is called directly on the relationship, it bypasses get().
     */
    public function pluck($column, $key = null)
    {
        if (! $this->pivotTableExists()) {
            return new Collection();
        }

        return parent::pluck($column, $key);
    }

    /**
     * Override count to handle missing pivot tables gracefully.
     */
    public function count()
    {
        if (! $this->pivotTableExists()) {
            return 0;
        }

        return parent::count();
    }

    /**
     * Override exists to handle missing pivot tables gracefully.
     */
    public function exists()
    {
        if (! $this->pivotTableExists()) {
            return false;
        }

        return parent::exists();
    }
}
