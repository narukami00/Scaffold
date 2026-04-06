<?php

use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\WorkspaceController;
use App\Http\Controllers\InvitationController;
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
});
