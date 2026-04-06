<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthRedirectTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_redirects_to_workspaces_index_instead_of_intended_url(): void
    {
        $user = User::factory()->create([
            "password" => "password123",
        ]);

        $this->get("/workspaces");

        $response = $this->post("/login", [
            "email" => $user->email,
            "password" => "password123",
        ]);

        $response->assertRedirect(route("workspaces.index"));
        $this->assertAuthenticatedAs($user);
    }

    public function test_authenticated_users_are_redirected_away_from_login_and_register_pages(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get("/login")
            ->assertRedirect(route("workspaces.index"));

        $this->actingAs($user)
            ->get("/register")
            ->assertRedirect(route("workspaces.index"));
    }
}
