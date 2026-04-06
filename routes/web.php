<?php

use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\WorkspaceController;
use App\Http\Controllers\InvitationController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\TaskController;

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

// Public Routes
Route::get("/", function () {
    return redirect()->route("login");
});

Route::get("/register", [AuthController::class, "showRegister"])->name(
    "register",
);
Route::post("/register", [AuthController::class, "register"]);

Route::get("/login", [AuthController::class, "showLogin"])->name("login");
Route::post("/login", [AuthController::class, "login"]);

// Protected Routes (Login Required)
Route::middleware("auth")->group(function () {
    Route::post("/logout", [AuthController::class, "logout"])->name("logout");

    // Workspaces
    Route::get("/workspaces", [WorkspaceController::class, "index"])->name(
        "workspaces.index",
    );
    Route::post("/workspaces", [WorkspaceController::class, "store"])->name(
        "workspaces.store",
    );
    Route::get("/workspaces/{workspace}", [
        WorkspaceController::class,
        "show",
    ])->name("workspaces.show");

    Route::get("/workspaces/{workspace}/settings", [
        WorkspaceController::class,
        "edit",
    ])->name("workspaces.edit");
    Route::patch("/workspaces/{workspace}", [
        WorkspaceController::class,
        "update",
    ])->name("workspaces.update");
    Route::delete("/workspaces/{workspace}", [
        WorkspaceController::class,
        "destroy",
    ])->name("workspaces.destroy");

    // Invitations
    Route::post("/workspaces/{workspace}/invitations", [
        InvitationController::class,
        "store",
    ])->name("workspaces.invitations.store");
    Route::get("/invitations/accept/{token}", [
        InvitationController::class,
        "show",
    ])->name("invitations.show");
    Route::post("/invitations/accept/{token}", [
        InvitationController::class,
        "accept",
    ])->name("invitations.accept");

    // Projects (Nested under Workspaces)
    Route::prefix("/workspaces/{workspace:slug}")->group(function () {
        Route::post("/projects", [ProjectController::class, "store"])->name(
            "workspaces.projects.store",
        );

        // Scope bindings ensure the project actually belongs to the workspace
        Route::scopeBindings()->group(function () {
            Route::get("/projects/{project}", [
                ProjectController::class,
                "show",
            ])->name("workspaces.projects.show");
            Route::get("/projects/{project}/board", [
                ProjectController::class,
                "board",
            ])->name("projects.board");
            Route::get("/projects/{project}/docs", [
                ProjectController::class,
                "docs",
            ])->name("projects.docs");
            Route::get("/projects/{project}/activity", [
                ProjectController::class,
                "activity",
            ])->name("projects.activity");
            // Task Operations
            Route::post("/projects/{project}/tasks", [
                TaskController::class,
                "store",
            ])->name("tasks.store");
            Route::patch("/projects/{project}/tasks/{task}", [
                TaskController::class,
                "update",
            ])->name("tasks.update");
        });
    });
});
