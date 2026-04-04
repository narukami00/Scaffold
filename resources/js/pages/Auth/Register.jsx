import { Head, useForm, Link } from "@inertiajs/react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

export default function Register() {
    const { data, setData, post, processing, errors } = useForm({
        name: "",
        email: "",
        password: "",
        password_confirmation: "",
    });

    const submit = (e) => {
        e.preventDefault();
        post("/register");
    };

    return (
        <div className="min-h-screen bg-bg flex items-center justify-center p-6">
            <Head title="Register" />

            <div className="w-full max-w-sm space-y-8 bg-surface border border-border p-8 rounded-2xl shadow-2xl">
                <div className="space-y-2 text-center">
                    <h2 className="text-3xl font-display font-black text-accent uppercase tracking-tighter">
                        Join Scaffold
                    </h2>
                    <p className="text-sm text-muted">
                        A minimal workspace for minimal teams.
                    </p>
                </div>

                <form onSubmit={submit} className="space-y-6 text-text">
                    <Input
                        label="Full Name"
                        type="text"
                        value={data.name}
                        onChange={(e) => setData("name", e.target.value)}
                        error={errors.name}
                        placeholder="John Doe"
                    />
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
                    <Input
                        label="Confirm Password"
                        type="password"
                        value={data.password_confirmation}
                        onChange={(e) =>
                            setData("password_confirmation", e.target.value)
                        }
                    />

                    <Button loading={processing} type="submit">
                        Create Account
                    </Button>
                </form>

                <div className="text-center text-sm pt-4 border-t border-border">
                    <span className="text-muted">Already a member? </span>
                    <Link
                        href="/login"
                        className="text-white hover:text-accent font-bold transition-colors"
                    >
                        Sign In
                    </Link>
                </div>
            </div>
        </div>
    );
}
