import { Head, useForm, Link } from "@inertiajs/react";
import { useState } from "react";
import { Eye, EyeOff, ShieldQuestion } from "lucide-react";

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
            <line x1="1.5" y1="12" x2="34.5" y2="12" stroke="currentColor" strokeWidth="1" strokeOpacity="0.4" />
            <line x1="1.5" y1="24" x2="34.5" y2="24" stroke="currentColor" strokeWidth="1" strokeOpacity="0.4" />
            <line x1="12" y1="1.5" x2="12" y2="34.5" stroke="currentColor" strokeWidth="1" strokeOpacity="0.4" />
            <line x1="24" y1="1.5" x2="24" y2="34.5" stroke="currentColor" strokeWidth="1" strokeOpacity="0.4" />
            <circle cx="12" cy="12" r="2.5" fill="currentColor" fillOpacity="0.9" />
            <circle cx="24" cy="12" r="2.5" fill="currentColor" fillOpacity="0.9" />
            <circle cx="12" cy="24" r="2.5" fill="currentColor" fillOpacity="0.9" />
            <circle cx="24" cy="24" r="2.5" fill="currentColor" fillOpacity="0.9" />
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

// ── Floating decorative nodes ────────────────────────────────────────────────
function FloatingNodes() {
    const nodes = [
        { x: "20%", y: "30%", size: 5, delay: "0.2s", opacity: 0.45 },
        { x: "68%", y: "22%", size: 4, delay: "1s", opacity: 0.35 },
        { x: "35%", y: "72%", size: 6, delay: "1.6s", opacity: 0.5 },
        { x: "78%", y: "60%", size: 7, delay: "0.6s", opacity: 0.4 },
        { x: "52%", y: "45%", size: 8, delay: "1.2s", opacity: 0.55 },
        { x: "85%", y: "38%", size: 3, delay: "2s", opacity: 0.3 },
        { x: "10%", y: "55%", size: 4, delay: "0.4s", opacity: 0.35 },
        { x: "60%", y: "78%", size: 3, delay: "1.8s", opacity: 0.3 },
    ];

    const lines = [
        { x1: "20%", y1: "30%", x2: "52%", y2: "45%" },
        { x1: "68%", y1: "22%", x2: "52%", y2: "45%" },
        { x1: "35%", y1: "72%", x2: "52%", y2: "45%" },
        { x1: "78%", y1: "60%", x2: "52%", y2: "45%" },
        { x1: "85%", y1: "38%", x2: "78%", y2: "60%" },
        { x1: "10%", y1: "55%", x2: "35%", y2: "72%" },
        { x1: "60%", y1: "78%", x2: "35%", y2: "72%" },
    ];

    return (
        <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <style>{`
                    @keyframes nodePulse2 {
                        0%, 100% { opacity: var(--op2); }
                        50% { opacity: calc(var(--op2) * 1.7); }
                    }
                `}</style>
            </defs>
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
            {nodes.map((n, i) => (
                <circle
                    key={i}
                    cx={n.x}
                    cy={n.y}
                    r={n.size}
                    fill="#f3e4c9"
                    style={{
                        "--op2": n.opacity,
                        opacity: n.opacity,
                        animation: `nodePulse2 4.5s ease-in-out ${n.delay} infinite`,
                    }}
                />
            ))}
        </svg>
    );
}

// ── Input component styled for the cream panel ───────────────────────────────
function AuthInput({ label, error, id, type = "text", ...props }) {
    const [focused, setFocused] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === "password";
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
            <div className="relative">
                <input
                    id={id}
                    {...props}
                    type={isPassword && showPassword ? "text" : type}
                    onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
                    onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
                    className={`w-full rounded-xl px-4 py-3 text-sm font-medium outline-none transition-all duration-200 placeholder:text-[#a89880] ${isPassword ? "pr-12" : ""}`}
                    style={{
                        background: "rgba(255,255,255,0.55)",
                        border: `1.5px solid ${error ? "#c0392b" : focused ? "#8b5e3c" : "rgba(139,94,60,0.25)"}`,
                        color: "#2a1a0a",
                        boxShadow: focused ? "0 0 0 3px rgba(139, 94, 60, 0.12)" : "none",
                        backdropFilter: "blur(4px)",
                    }}
                />
                {isPassword && (
                    <button
                        type="button"
                        onClick={() => setShowPassword((visible) => !visible)}
                        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl"
                        style={{ color: "#8b7355" }}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        aria-pressed={showPassword}
                    >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                )}
            </div>
            {error && (
                <p className="text-xs font-medium mt-1" style={{ color: "#c0392b" }}>
                    {error}
                </p>
            )}
        </div>
    );
}

// ── Textarea component styled for the cream panel ────────────────────────────
function AuthTextarea({ label, error, id, ...props }) {
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
            <textarea
                id={id}
                {...props}
                onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
                onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
                className="w-full rounded-xl px-4 py-3 text-sm font-medium outline-none transition-all duration-200 placeholder:text-[#a89880] resize-none h-20"
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

// ── Avatar Upload component with preview ─────────────────────────────────────
function AuthAvatarUpload({ label, error, onChange, value }) {
    const [preview, setPreview] = useState(null);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            onChange(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="space-y-1.5">
            {label && (
                <span
                    className="block text-xs font-semibold uppercase tracking-widest"
                    style={{ color: "#8b5e3c" }}
                >
                    {label}
                </span>
            )}
            <div className="flex items-center gap-4">
                <div 
                    className="w-12 h-12 rounded-full overflow-hidden border-2 flex items-center justify-center bg-white/40 shrink-0"
                    style={{ borderColor: "rgba(139,94,60,0.25)" }}
                >
                    {preview ? (
                        <img src={preview} alt="Avatar Preview" className="w-full h-full object-cover" />
                    ) : (
                        <div className="text-[10px] font-black text-[#8b5e3c] uppercase">Photo</div>
                    )}
                </div>
                <label className="cursor-pointer px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-white/60 hover:bg-white/80 border transition-all duration-200" style={{ borderColor: "rgba(139,94,60,0.25)", color: "#8b5e3c" }}>
                    Choose Photo
                    <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleFileChange} 
                        className="hidden" 
                    />
                </label>
            </div>
            {error && (
                <p className="text-xs font-medium mt-1" style={{ color: "#c0392b" }}>
                    {error}
                </p>
            )}
        </div>
    );
}

// ── Main Register page ───────────────────────────────────────────────────────
export default function Register() {
    const { data, setData, post, processing, errors } = useForm({
        name: "",
        email: "",
        password: "",
        password_confirmation: "",
        title: "",
        bio: "",
        avatar: null,
        recovery_question: "",
        recovery_answer: "",
    });

    const submit = (e) => {
        e.preventDefault();
        post("/register");
    };

    return (
        <div className="min-h-screen flex">
            <Head title="Create Account — Scaffold" />

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
                        <ScaffoldMark size={38} className="text-cream" style={{ color: "#f3e4c9" }} />
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
                        Join the workspace
                    </p>
                    <h2
                        className="text-5xl font-display font-black leading-[1.15] mb-6"
                        style={{ color: "#f3e4c9", letterSpacing: "0.04em" }}
                    >
                        Your team<br />
                        is waiting<br />
                        <span style={{ color: "rgba(243,228,201,0.45)" }}>for you.</span>
                    </h2>
                    <p
                        className="text-sm leading-relaxed max-w-xs"
                        style={{ color: "rgba(211,212,192,0.7)" }}
                    >
                        Get started in seconds. No credit card, no noise —
                        just a clean workspace built for focused teams.
                    </p>
                </div>

                {/* Bottom: Feature pills */}
                <div className="relative z-10 p-10">
                    <div className="flex flex-wrap gap-2">
                        {["Free to Start", "No Credit Card", "Team Collaboration", "Instant Access"].map((f) => (
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

                {/* Bottom gradient */}
                <div
                    className="absolute bottom-0 left-0 right-0 h-40 pointer-events-none"
                    style={{
                        background: "linear-gradient(to top, rgba(10,41,71,0.8) 0%, transparent 100%)",
                    }}
                />
            </div>

            {/* ── RIGHT PANEL: Register form ─────────────────────── */}
            <div
                className="flex-1 flex flex-col items-center justify-start lg:justify-center p-8 min-h-screen overflow-y-auto"
                style={{ background: "#f3e4c9" }}
            >
                {/* Mobile logo */}
                <div className="flex items-center gap-2.5 mb-10 lg:hidden">
                    <ScaffoldMark size={28} style={{ color: "#8b5e3c" }} />
                    <span
                        className="text-xl font-display font-black tracking-tight"
                        style={{ color: "#0a2947" }}
                    >
                        Scaffold
                    </span>
                </div>

                <div className="w-full max-w-sm my-auto py-8">
                    {/* Header */}
                    <div className="mb-8">
                        <h1
                            className="text-3xl font-display font-black mb-1.5"
                            style={{ color: "#0a2947", letterSpacing: "0.03em" }}
                        >
                            Create your account
                        </h1>
                        <p className="text-sm" style={{ color: "#8b7355" }}>
                            Join Scaffold and start building with your team.
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={submit} className="space-y-4">
                        <AuthInput
                            id="register-name"
                            label="Full Name"
                            type="text"
                            value={data.name}
                            onChange={(e) => setData("name", e.target.value)}
                            error={errors.name}
                            placeholder="Jane Doe"
                        />
                        <AuthInput
                            id="register-email"
                            label="Email Address"
                            type="email"
                            value={data.email}
                            onChange={(e) => setData("email", e.target.value)}
                            error={errors.email}
                            placeholder="you@example.com"
                        />
                        <AuthInput
                            id="register-title"
                            label="Job Title"
                            type="text"
                            value={data.title}
                            onChange={(e) => setData("title", e.target.value)}
                            error={errors.title}
                            placeholder="Lead Designer / Developer"
                        />
                        <AuthTextarea
                            id="register-bio"
                            label="Short Bio"
                            value={data.bio}
                            onChange={(e) => setData("bio", e.target.value)}
                            error={errors.bio}
                            placeholder="Tell us about yourself..."
                        />
                        <AuthAvatarUpload
                            label="Profile Photo"
                            error={errors.avatar}
                            onChange={(file) => setData("avatar", file)}
                        />
                        <AuthInput
                            id="register-password"
                            label="Password"
                            type="password"
                            value={data.password}
                            onChange={(e) => setData("password", e.target.value)}
                            error={errors.password}
                            placeholder="••••••••"
                        />
                        <AuthInput
                            id="register-password-confirm"
                            label="Confirm Password"
                            type="password"
                            value={data.password_confirmation}
                            onChange={(e) => setData("password_confirmation", e.target.value)}
                            error={errors.password_confirmation}
                            placeholder="••••••••"
                        />

                        <div
                            className="space-y-3 rounded-2xl border p-4"
                            style={{ borderColor: "rgba(139,94,60,0.2)", background: "rgba(139,94,60,0.04)" }}
                        >
                            <div className="flex items-start gap-3">
                                <ShieldQuestion size={18} className="mt-0.5 shrink-0" style={{ color: "#8b5e3c" }} />
                                <div>
                                    <p className="text-xs font-black uppercase tracking-widest" style={{ color: "#0a2947" }}>
                                        Optional account recovery
                                    </p>
                                    <p className="mt-1 text-xs leading-relaxed" style={{ color: "#8b7355" }}>
                                        Use a private question whose answer is memorable but difficult for others to discover.
                                    </p>
                                </div>
                            </div>
                            <AuthInput
                                id="register-recovery-question"
                                label="Recovery Question"
                                value={data.recovery_question}
                                onChange={(e) => setData("recovery_question", e.target.value)}
                                error={errors.recovery_question}
                                placeholder="e.g. What was the name of my first project?"
                            />
                            <AuthInput
                                id="register-recovery-answer"
                                label="Recovery Answer"
                                type="password"
                                value={data.recovery_answer}
                                onChange={(e) => setData("recovery_answer", e.target.value)}
                                error={errors.recovery_answer}
                                placeholder="Your private answer"
                                autoComplete="off"
                            />
                        </div>

                        {/* Submit */}
                        <button
                            id="register-submit"
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
                            {processing ? "Creating account…" : "Create Account"}
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
                        Already have an account?{" "}
                        <Link
                            href="/login"
                            className="font-bold transition-colors duration-150"
                            style={{ color: "#8b5e3c" }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = "#0a2947")}
                            onMouseLeave={(e) => (e.currentTarget.style.color = "#8b5e3c")}
                        >
                            Sign in →
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
