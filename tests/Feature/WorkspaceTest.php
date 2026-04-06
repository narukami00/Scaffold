<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Workspace;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WorkspaceTest extends TestCase
{
    use RefreshDatabase;

    public function test_workspace_owner_can_delete_a_workspace_by_slug(): void
    {
        $user = User::factory()->create();
        $workspace = Workspace::create([
            "name" => "Alpha Team",
            "owner_id" => $user->id,
        ]);

        $response = $this
            ->actingAs($user)
            ->delete(route("workspaces.destroy", $workspace->slug));

        $response->assertRedirect(route("workspaces.index"));
        $this->assertDatabaseMissing("workspaces", [
            "id" => $workspace->id,
        ]);
    }
}
