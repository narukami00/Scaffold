import { Head, useForm, Link } from "@inertiajs/react";
import { useState } from "react";

// ── Scaffold geometric icon mark ─────────────────────────────────────────────
function ScaffoldMark({ size = 36, className = "" }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 36 36"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            {/* Outer frame */}
            <rect
                x="1.5"
                y="1.5"
                width="33"
                height="33"
                rx="6"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeOpacity="0.6"
            />
            {/* Scaffold grid lines */}
            <line x1="1.5" y1="12" x2="34.5" y2="12" stroke="currentColor" strokeWidth="1" strokeOpacity="0.4" />
            <line x1="1.5" y1="24" x2="34.5" y2="24" stroke="currentColor" strokeWidth="1" strokeOpacity="0.4" />
            <line x1="12" y1="1.5" x2="12" y2="34.5" stroke="currentColor" strokeWidth="1" strokeOpacity="0.4" />
            <line x1="24" y1="1.5" x2="24" y2="34.5" stroke="currentColor" strokeWidth="1" strokeOpacity="0.4" />
            {/* Corner nodes */}
            <circle cx="12" cy="12" r="2.5" fill="currentColor" fillOpacity="0.9" />
            <circle cx="24" cy="12" r="2.5" fill="currentColor" fillOpacity="0.9" />
            <circle cx="12" cy="24" r="2.5" fill="currentColor" fillOpacity="0.9" />
            <circle cx="24" cy="24" r="2.5" fill="currentColor" fillOpacity="0.9" />
            {/* Center accent */}
            <circle cx="18" cy="18" r="3" fill="currentColor" />
        </svg>
    );
}

// ── Animated background grid dots ────────────────────────────────────────────
function GridDots() {
    return (
        <div
            className="absolute inset-0 opacity-20"
            style={{
                backgroundImage: `radial-gradient(circle, #f3e4c9 1px, transparent 1px)`,
                backgroundSize: "28px 28px",
            }}
        />
    );
}

// ── Floating decorative nodes (left panel art) ───────────────────────────────
function FloatingNodes() {
    const nodes = [
        { x: "15%", y: "22%", size: 6, delay: "0s", opacity: 0.5 },
        { x: "72%", y: "18%", size: 4, delay: "0.8s", opacity: 0.35 },
        { x: "28%", y: "68%", size: 5, delay: "1.4s", opacity: 0.45 },
        { x: "80%", y: "65%", size: 7, delay: "0.4s", opacity: 0.4 },
        { x: "50%", y: "42%", size: 9, delay: "1s", opacity: 0.6 },
        { x: "88%", y: "40%", size: 3, delay: "1.8s", opacity: 0.3 },
        { x: "8%", y: "50%", size: 4, delay: "2.2s", opacity: 0.35 },
    ];

    const lines = [
        { x1: "15%", y1: "22%", x2: "50%", y2: "42%" },
        { x1: "72%", y1: "18%", x2: "50%", y2: "42%" },
        { x1: "28%", y1: "68%", x2: "50%", y2: "42%" },
        { x1: "80%", y1: "65%", x2: "50%", y2: "42%" },
        { x1: "88%", y1: "40%", x2: "80%", y2: "65%" },
        { x1: "8%", y1: "50%", x2: "28%", y2: "68%" },
    ];

    return (
        <svg
            className="absolute inset-0 w-full h-full"
            xmlns="http://www.w3.org/2000/svg"
        >
            <defs>
                <style>{`
                    @keyframes nodePulse {
                        0%, 100% { opacity: var(--op); r: var(--r); }
                        50% { opacity: calc(var(--op) * 1.6); r: calc(var(--r) * 1.4); }
                    }
                `}</style>
            </defs>
            {/* Connection lines */}
            {lines.map((ln, i) => (
                <line
                    key={i}
                    x1={ln.x1} y1={ln.y1}
                    x2={ln.x2} y2={ln.y2}
                    stroke="#f3e4c9"
                    strokeWidth="0.6"
                    strokeOpacity="0.18"
                    strokeDasharray="4 6"
                />
            ))}
            {/* Nodes */}
            {nodes.map((n, i) => (
                <circle
                    key={i}
                    cx={n.x}
                    cy={n.y}
                    r={n.size}
                    fill="#f3e4c9"
                    style={{
                        "--op": n.opacity,
                        "--r": `${n.size}px`,
                        opacity: n.opacity,
                        animation: `nodePulse 4s ease-in-out ${n.delay} infinite`,
                    }}
                />
            ))}
        </svg>
    );
}

// ── Input component styled for the cream panel ───────────────────────────────
function AuthInput({ label, error, id, ...props }) {
    const [focused, setFocused] = useState(false);
    return (
        <div className="space-y-1.5">
            {label && (
                <label
                    htmlFor={id}
                    className="block text-xs font-semibold uppercase tracking-widest"
                    style={{ color: "#8b5e3c" }}
                >
                    {label}
                </label>
            )}
            <input
                id={id}
                {...props}
                onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
                onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
                className="w-full rounded-xl px-4 py-3 text-sm font-medium outline-none transition-all duration-200 placeholder:text-[#a89880]"
                style={{
                    background: "rgba(255,255,255,0.55)",
                    border: `1.5px solid ${error ? "#c0392b" : focused ? "#8b5e3c" : "rgba(139,94,60,0.25)"}`,
                    color: "#2a1a0a",
                    boxShadow: focused
                        ? "0 0 0 3px rgba(139, 94, 60, 0.12)"
                        : "none",
                    backdropFilter: "blur(4px)",
                }}
            />
            {error && (
                <p className="text-xs font-medium mt-1" style={{ color: "#c0392b" }}>
                    {error}
                </p>
            )}
        </div>
    );
}

// ── Main Login page ──────────────────────────────────────────────────────────
export default function Login() {
    const { data, setData, post, processing, errors } = useForm({
        email: "",
        password: "",
        remember: false,
    });

    const submit = (e) => {
        e.preventDefault();
        post("/login");
    };

    return (
        <div className="min-h-screen flex">
            <Head title="Sign In — Scaffold" />

            {/* ── LEFT PANEL: Branding ───────────────────────────── */}
            <div
                className="hidden lg:flex lg:w-[52%] relative flex-col justify-between overflow-hidden"
                style={{ background: "#0a2947" }}
            >
                <GridDots />
                <FloatingNodes />

                {/* Top: Logo */}
                <div className="relative z-10 p-10">
                    <div className="flex items-center gap-3">
                        <ScaffoldMark size={38} className="text-cream" />
                        <span
                            className="text-2xl font-display font-black tracking-tight"
                            style={{ color: "#f3e4c9" }}
                        >
                            Scaffold
                        </span>
                    </div>
                </div>

                {/* Center: Hero text */}
                <div className="relative z-10 px-10 pb-4">
                    <p
                        className="text-xs font-semibold uppercase tracking-[0.25em] mb-5"
                        style={{ color: "rgba(211,212,192,0.6)" }}
                    >
                        Project Management · Reimagined
                    </p>
                    <h2
                        className="text-5xl font-display font-black leading-[1.15] mb-6"
                        style={{ color: "#f3e4c9", letterSpacing: "0.04em" }}
                    >
                        Build.<br />
                        Ship.<br />
                        <span style={{ color: "rgba(243,228,201,0.45)" }}>Together.</span>
                    </h2>
                    <p
                        className="text-sm leading-relaxed max-w-xs"
                        style={{ color: "rgba(211,212,192,0.7)" }}
                    >
                        A minimal workspace for teams who ship. Organize projects,
                        track tasks, and collaborate — without the noise.
                    </p>
                </div>

                {/* Bottom: Feature pills */}
                <div className="relative z-10 p-10">
                    <div className="flex flex-wrap gap-2">
                        {["Kanban Boards", "Task Tracking", "Wikis", "Threads", "Git Activity"].map((f) => (
                            <span
                                key={f}
                                className="text-[10px] font-semibold uppercase tracking-wider px-3 py-1.5 rounded-full"
                                style={{
                                    background: "rgba(243,228,201,0.08)",
                                    border: "1px solid rgba(243,228,201,0.15)",
                                    color: "rgba(211,212,192,0.7)",
                                }}
                            >
                                {f}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Decorative gradient overlay at bottom */}
                <div
                    className="absolute bottom-0 left-0 right-0 h-40 pointer-events-none"
                    style={{
                        background: "linear-gradient(to top, rgba(10,41,71,0.8) 0%, transparent 100%)",
                    }}
                />
            </div>

            {/* ── RIGHT PANEL: Login form ────────────────────────── */}
            <div
                className="flex-1 flex flex-col items-center justify-center p-8 min-h-screen"
                style={{ background: "#f3e4c9" }}
            >
                {/* Mobile logo (shown only on small screens) */}
                <div className="flex items-center gap-2.5 mb-10 lg:hidden">
                    <ScaffoldMark size={28} className="text-accent" style={{ color: "#8b5e3c" }} />
                    <span
                        className="text-xl font-display font-black tracking-tight"
                        style={{ color: "#0a2947" }}
                    >
                        Scaffold
                    </span>
                </div>

                <div className="w-full max-w-sm">
                    {/* Header */}
                    <div className="mb-8">
                        <h1
                            className="text-3xl font-display font-black mb-1.5"
                            style={{ color: "#0a2947", letterSpacing: "0.03em" }}
                        >
                            Welcome back
                        </h1>
                        <p className="text-sm" style={{ color: "#8b7355" }}>
                            Sign in to continue to your workspace.
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={submit} className="space-y-5">
                        <AuthInput
                            id="login-email"
                            label="Email Address"
                            type="email"
                            value={data.email}
                            onChange={(e) => setData("email", e.target.value)}
                            error={errors.email}
                            placeholder="you@example.com"
                        />
                        <AuthInput
                            id="login-password"
                            label="Password"
                            type="password"
                            value={data.password}
                            onChange={(e) => setData("password", e.target.value)}
                            error={errors.password}
                            placeholder="••••••••"
                        />

                        {/* Remember me */}
                        <div className="flex items-center gap-2.5">
                            <div className="relative">
                                <input
                                    type="checkbox"
                                    id="remember"
                                    checked={data.remember}
                                    onChange={(e) => setData("remember", e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div
                                    onClick={() => setData("remember", !data.remember)}
                                    className="w-4 h-4 rounded cursor-pointer flex items-center justify-center transition-all duration-150"
                                    style={{
                                        background: data.remember ? "#8b5e3c" : "rgba(255,255,255,0.6)",
                                        border: `1.5px solid ${data.remember ? "#8b5e3c" : "rgba(139,94,60,0.3)"}`,
                                    }}
                                >
                                    {data.remember && (
                                        <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                                            <path d="M1 3.5L3.5 6L8 1" stroke="#f3e4c9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    )}
                                </div>
                            </div>
                            <label
                                htmlFor="remember"
                                onClick={() => setData("remember", !data.remember)}
                                className="text-xs font-semibold cursor-pointer select-none uppercase tracking-widest"
                                style={{ color: "#8b7355" }}
                            >
                                Remember me
                            </label>
                        </div>

                        {/* Submit */}
                        <button
                            id="login-submit"
                            type="submit"
                            disabled={processing}
                            className="w-full py-3 rounded-xl text-sm font-bold tracking-wide transition-all duration-200 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
                            style={{
                                background: processing ? "rgba(139,94,60,0.7)" : "#8b5e3c",
                                color: "#f3e4c9",
                                boxShadow: "0 4px 20px rgba(139, 94, 60, 0.3)",
                            }}
                            onMouseEnter={(e) => { if (!processing) e.currentTarget.style.background = "#a06b43"; }}
                            onMouseLeave={(e) => { if (!processing) e.currentTarget.style.background = "#8b5e3c"; }}
                        >
                            {processing ? (
                                <div
                                    className="w-4 h-4 rounded-full border-2 animate-spin"
                                    style={{ borderColor: "rgba(243,228,201,0.3)", borderTopColor: "#f3e4c9" }}
                                />
                            ) : null}
                            {processing ? "Signing in…" : "Sign In"}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="flex items-center gap-3 my-6">
                        <div className="flex-1 h-px" style={{ background: "rgba(139,94,60,0.15)" }} />
                        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "rgba(139,94,60,0.45)" }}>
                            or
                        </span>
                        <div className="flex-1 h-px" style={{ background: "rgba(139,94,60,0.15)" }} />
                    </div>

                    {/* Footer link */}
                    <p className="text-center text-sm" style={{ color: "#8b7355" }}>
                        New to Scaffold?{" "}
                        <Link
                            href="/register"
                            className="font-bold transition-colors duration-150"
                            style={{ color: "#8b5e3c" }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = "#0a2947")}
                            onMouseLeave={(e) => (e.currentTarget.style.color = "#8b5e3c")}
                        >
                            Create an account →
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
