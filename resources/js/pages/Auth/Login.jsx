import { Head, useForm, Link } from "@inertiajs/react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

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
        <div className="min-h-screen bg-bg flex items-center justify-center p-6">
            <Head title="Login" />

            <div className="w-full max-w-sm space-y-8 bg-surface border border-border p-8 rounded-2xl shadow-2xl">
                <div className="space-y-2 text-center">
                    <h2 className="text-3xl font-display font-black text-accent uppercase tracking-tighter">
                        Welcome Back
                    </h2>
                    <p className="text-sm text-muted">
                        Sign in to your Scaffold.
                    </p>
                </div>

                <form onSubmit={submit} className="space-y-6">
                    <Input
                        label="Email Address"
                        type="email"
                        value={data.email}
                        onChange={(e) => setData("email", e.target.value)}
                        error={errors.email}
                        placeholder="john@example.com"
                    />
                    <Input
                        label="Password"
                        type="password"
                        value={data.password}
                        onChange={(e) => setData("password", e.target.value)}
                        error={errors.password}
                    />

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="remember"
                            checked={data.remember}
                            onChange={(e) =>
                                setData("remember", e.target.checked)
                            }
                            className="w-4 h-4 rounded border-border bg-surface2 text-accent focus:ring-accent/20"
                        />
                        <label
                            htmlFor="remember"
                            className="text-xs font-semibold text-muted uppercase tracking-wider cursor-pointer"
                        >
                            Remember Me
                        </label>
                    </div>

                    <Button loading={processing} type="submit">
                        Sign In
                    </Button>
                </form>

                <div className="text-center text-sm pt-4 border-t border-border">
                    <span className="text-muted">New to Scaffold? </span>
                    <Link
                        href="/register"
                        className="text-white hover:text-accent font-bold transition-colors"
                    >
                        Create Account
                    </Link>
                </div>
            </div>
        </div>
    );
}
