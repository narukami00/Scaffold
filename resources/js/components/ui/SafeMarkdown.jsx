import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";

const IMAGE_URL = /^https:\/\/[^\s]+\.(?:png|jpe?g|gif|webp|avif)(?:\?[^\s]*)?$/i;

export function normalizeImageUrls(markdown = "") {
    return markdown
        .split("\n")
        .map((line) => {
            const value = line.trim();
            return IMAGE_URL.test(value) ? `![External image](${value})` : line;
        })
        .join("\n");
}

export default function SafeMarkdown({ children = "", className = "", components = {} }) {
    return (
        <div className={className}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeSanitize]}
                components={{
                    a: ({ children: linkChildren, ...props }) => (
                        <a {...props} target="_blank" rel="noopener noreferrer">
                            {linkChildren}
                        </a>
                    ),
                    img: ({ alt, ...props }) => (
                        <img
                            {...props}
                            alt={alt || "Embedded image"}
                            loading="lazy"
                            referrerPolicy="no-referrer"
                            className="my-3 max-h-[520px] max-w-full rounded-2xl border object-contain shadow-sm"
                            style={{ borderColor: "rgba(139,94,60,0.18)" }}
                        />
                    ),
                    ...components,
                }}
            >
                {normalizeImageUrls(children)}
            </ReactMarkdown>
        </div>
    );
}
