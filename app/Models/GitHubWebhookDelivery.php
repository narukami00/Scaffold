<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GitHubWebhookDelivery extends Model
{
    protected $table = 'github_webhook_deliveries';
    protected $primaryKey = 'delivery_id';
    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false;

    protected $fillable = [
        'delivery_id',
        'event_type',
        'processed_at',
    ];

    protected $casts = [
        'processed_at' => 'datetime',
    ];
}
