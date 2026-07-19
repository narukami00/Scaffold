import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";

const IMAGE_URL = /^https:\/\/[^\s]+\.(?:png|jpe?g|gif|webp|avif)(?:\?[^\s]*)?$/i;
const GOOGLE_THUMB_URL = /^https:\/\/encrypted-tbn\d*\.gstatic\.com\/images\?[^\s]+$/i;
const GOOGLE_USERCONTENT_URL = /^https:\/\/[^\s]*googleusercontent\.com\/[^\s]+$/i;

export function isPastableImageUrl(value = "") {
    const url = value.trim();
    return IMAGE_URL.test(url) || GOOGLE_THUMB_URL.test(url) || GOOGLE_USERCONTENT_URL.test(url);
}

export function normalizeImageUrls(markdown = "") {
    return markdown
        .split("\n")
        .map((line) => {
            const value = line.trim();
            return isPastableImageUrl(value) ? `![External image](${value})` : line;
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
