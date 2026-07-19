import { Head, Link, useForm } from "@inertiajs/react";
import { ArrowLeft, Eye, EyeOff, KeyRound, ShieldCheck } from "lucide-react";
import { useState } from "react";

function PasswordField({ label, error, ...props }) {
    const [visible, setVisible] = useState(false);

    return (
        <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-widest" style={{ color: "#8b5e3c" }}>
                {label}
            </label>
            <div className="relative">
                <input
                    {...props}
                    type={visible ? "text" : "password"}
                    className="w-full rounded-xl border bg-white/60 px-4 py-3 pr-12 text-sm font-medium outline-none transition focus:border-[#8b5e3c] focus:ring-4 focus:ring-[#8b5e3c]/10"
                    style={{ borderColor: error ? "#c0392b" : "rgba(139,94,60,0.25)", color: "#2a1a0a" }}
                />
                <button
                    type="button"
                    onClick={() => setVisible((value) => !value)}
                    className="absolute inset-y-0 right-0 flex w-11 items-center justify-center"
                    style={{ color: "#8b7355" }}
                    aria-label={visible ? "Hide value" : "Show value"}
                >
                    {visible ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
            </div>
            {error && <p className="text-xs font-medium text-red-700">{error}</p>}
        </div>
    );
}

export default function RecoverPassword({ step = "email", question = null }) {
    const form = useForm({
        email: "",
        answer: "",
        password: "",
        password_confirmation: "",
    });

    const submit = (event) => {
        event.preventDefault();
        const paths = {
            email: "/forgot-password",
            question: "/forgot-password/question",
            reset: "/forgot-password/reset",
        };
        form.post(paths[step]);
    };

    const copy = {
        email: {
            title: "Recover your account",
            description: "Enter the email address associated with your Scaffold account.",
            button: "Continue securely",
        },
        question: {
            title: "Verify your identity",
            description: "Answer your private recovery question. Answers are not case-sensitive.",
            button: "Verify answer",
        },
        reset: {
            title: "Create a new password",
            description: "Choose a strong password you have not used for this account before.",
            button: "Reset password and sign in",
        },
    }[step];

    return (
        <div className="min-h-screen px-5 py-10 flex items-center justify-center" style={{ background: "#f3e4c9" }}>
            <Head title={`${copy.title} — Scaffold`} />
            <div className="w-full max-w-md">
                <Link href="/login" className="mb-5 inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest" style={{ color: "#8b5e3c" }}>
                    <ArrowLeft size={14} /> Back to sign in
                </Link>
                <div className="rounded-[28px] border p-7 shadow-xl sm:p-9" style={{ background: "#ede0c8", borderColor: "rgba(139,94,60,0.2)" }}>
                    <div className="mb-7 flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: "#0a2947", color: "#f3e4c9" }}>
                        {step === "reset" ? <KeyRound size={22} /> : <ShieldCheck size={22} />}
                    </div>
                    <h1 className="text-2xl font-black" style={{ color: "#0a2947" }}>{copy.title}</h1>
                    <p className="mt-2 text-sm leading-relaxed" style={{ color: "#8b7355" }}>{copy.description}</p>

                    <div className="my-6 flex gap-2" aria-label="Recovery progress">
                        {["email", "question", "reset"].map((item, index) => {
                            const active = ["email", "question", "reset"].indexOf(step) >= index;
                            return <div key={item} className="h-1.5 flex-1 rounded-full" style={{ background: active ? "#8b5e3c" : "rgba(139,94,60,0.15)" }} />;
                        })}
                    </div>

                    <form onSubmit={submit} className="space-y-5">
                        {step === "email" && (
                            <div className="space-y-1.5">
                                <label htmlFor="recovery-email" className="block text-xs font-semibold uppercase tracking-widest" style={{ color: "#8b5e3c" }}>Email address</label>
                                <input
                                    id="recovery-email"
                                    type="email"
                                    value={form.data.email}
                                    onChange={(event) => form.setData("email", event.target.value)}
                                    autoComplete="email"
                                    autoFocus
                                    className="w-full rounded-xl border bg-white/60 px-4 py-3 text-sm font-medium outline-none transition focus:border-[#8b5e3c] focus:ring-4 focus:ring-[#8b5e3c]/10"
                                    style={{ borderColor: form.errors.email ? "#c0392b" : "rgba(139,94,60,0.25)" }}
                                />
                                {form.errors.email && <p className="text-xs font-medium text-red-700">{form.errors.email}</p>}
                            </div>
                        )}

                        {step === "question" && (
                            <>
                                <div className="rounded-2xl border p-4" style={{ background: "rgba(10,41,71,0.04)", borderColor: "rgba(10,41,71,0.12)" }}>
                                    <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: "#8b5e3c" }}>Your recovery question</p>
                                    <p className="mt-2 text-sm font-bold leading-relaxed" style={{ color: "#0a2947" }}>{question}</p>
                                </div>
                                <PasswordField
                                    label="Recovery answer"
                                    value={form.data.answer}
                                    onChange={(event) => form.setData("answer", event.target.value)}
                                    error={form.errors.answer}
                                    autoFocus
                                    autoComplete="off"
                                />
                            </>
                        )}

                        {step === "reset" && (
                            <>
                                <PasswordField
                                    label="New password"
                                    value={form.data.password}
                                    onChange={(event) => form.setData("password", event.target.value)}
                                    error={form.errors.password}
                                    autoFocus
                                    autoComplete="new-password"
                                />
                                <PasswordField
                                    label="Confirm new password"
                                    value={form.data.password_confirmation}
                                    onChange={(event) => form.setData("password_confirmation", event.target.value)}
                                    error={form.errors.password_confirmation}
                                    autoComplete="new-password"
                                />
                            </>
                        )}

                        <button
                            type="submit"
                            disabled={form.processing}
                            className="w-full rounded-xl py-3 text-sm font-bold transition active:scale-[0.98] disabled:opacity-60"
                            style={{ background: "#8b5e3c", color: "#f3e4c9" }}
                        >
                            {form.processing ? "Please wait…" : copy.button}
                        </button>
                    </form>
                    <p className="mt-5 text-center text-[11px] leading-relaxed" style={{ color: "#8b7355" }}>
                        Recovery sessions expire after 10 minutes and repeated incorrect attempts are temporarily blocked.
                    </p>
                </div>
            </div>
        </div>
    );
}
