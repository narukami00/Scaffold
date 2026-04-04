export default function Button({
    children,
    loading,
    className = "",
    ...props
}) {
    return (
        <button
            {...props}
            disabled={loading || props.disabled}
            className={`w-full bg-accent hover:bg-accent/90 text-white font-bold py-2.5 px-4 rounded-lg
                transition-all duration-200 transform active:scale-[0.98]
                disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100
                flex items-center justify-center gap-2 ${className}`}
        >
            {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : null}
            {children}
        </button>
    );
}
