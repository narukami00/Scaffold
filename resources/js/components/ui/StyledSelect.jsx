import { useState } from "react";
import { ChevronDown } from "lucide-react";

/**
 * Themed wrapper around a native <select>. Keeps native keyboard/screen-reader
 * behavior while replacing the bland default chrome with the app's parchment
 * styling, a custom chevron, and hover/focus affordances.
 */
export default function StyledSelect({
    value,
    onChange,
    options = [],
    placeholder = null,
    icon: Icon = null,
    disabled = false,
    className = "",
    selectClassName = "",
    ...props
}) {
    const [isFocused, setIsFocused] = useState(false);

    return (
        <div
            className={`group relative inline-flex items-center rounded-2xl border transition-all duration-150 ${disabled ? "opacity-60" : "hover:shadow-sm"} ${className}`}
            style={{
                background: "#f3e4c9",
                borderColor: isFocused ? "#8b5e3c" : "rgba(139,94,60,0.18)",
                boxShadow: isFocused ? "0 0 0 3px rgba(139,94,60,0.12)" : undefined,
            }}
        >
            {Icon && (
                <Icon
                    size={13}
                    className="pointer-events-none absolute left-3.5 shrink-0 transition-colors"
                    style={{ color: isFocused ? "#8b5e3c" : "rgba(10,41,71,0.45)" }}
                />
            )}
            <select
                value={value ?? ""}
                onChange={onChange}
                disabled={disabled}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                className={`w-full cursor-pointer appearance-none bg-transparent py-2 pr-9 text-xs font-black uppercase tracking-widest outline-none disabled:cursor-not-allowed ${Icon ? "pl-9" : "pl-4"} ${selectClassName}`}
                style={{ color: "#0a2947" }}
                {...props}
            >
                {placeholder !== null && (
                    <option value="" style={{ background: "#f3e4c9", color: "#0a2947" }}>
                        {placeholder}
                    </option>
                )}
                {options.map((option) => (
                    <option
                        key={option.value}
                        value={option.value}
                        style={{ background: "#f3e4c9", color: "#0a2947" }}
                    >
                        {option.label}
                    </option>
                ))}
            </select>
            <ChevronDown
                size={14}
                className={`pointer-events-none absolute right-3 shrink-0 transition-transform duration-200 ${isFocused ? "rotate-180" : ""} group-hover:translate-y-[1px]`}
                style={{ color: isFocused ? "#8b5e3c" : "rgba(10,41,71,0.45)" }}
            />
        </div>
    );
}
