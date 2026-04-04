export default function Input({ label, error, ...props }) {
    return (
        <div className="space-y-1.5">
            {label && (
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider">
                    {label}
                </label>
            )}
            <input
                {...props}
                className={`w-full bg-surface2 border border-border rounded-lg px-4 py-2.5 text-sm text-text
                    focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent 
                    transition-all duration-200 placeholder:text-muted/50
                    ${error ? 'border-accent-red ring-accent-red/20' : ''}`}
            />
            {error && (
                <p className="text-xs text-accent-red font-medium mt-1">
                    {error}
                </p>
            )}
        </div>
    );
}
