import React, { useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Image as ImageIcon, Loader2 } from 'lucide-react';
import axios from 'axios';

export default function MarkdownEditor({
    value = '',
    onChange,
    placeholder = 'Write something...',
    uploadUrl,
    disabled = false,
}) {
    const [view, setView] = useState('write');
    const [isUploading, setIsUploading] = useState(false);
    const textareaRef = useRef(null);

    const handlePaste = async (e) => {
        if (!uploadUrl) return;

        const items = e.clipboardData.items;
        const imageItem = Array.from(items).find(item => item.type.startsWith('image/'));

        if (!imageItem) return;

        e.preventDefault();
        const file = imageItem.getAsFile();
        await uploadImage(file);
    };

    const handleDrop = async (e) => {
        if (!uploadUrl) return;

        e.preventDefault();
        const file = Array.from(e.dataTransfer.files).find(f => f.type.startsWith('image/'));
        if (!file) return;

        await uploadImage(file);
    };

    const uploadImage = async (file) => {
        if (disabled) return;

        const textarea = textareaRef.current;
        if (!textarea) return;

        const startPos = textarea.selectionStart;
        const endPos = textarea.selectionEnd;

        // Insert uploading placeholder
        const placeholderText = `![Uploading ${file.name}...]()`;
        const newValue = value.substring(0, startPos) + placeholderText + value.substring(endPos);
        onChange(newValue);
        setIsUploading(true);

        const formData = new FormData();
        formData.append('image', file);

        try {
            const { data } = await axios.post(uploadUrl, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            // Replace placeholder with actual markdown
            const finalText = newValue.replace(placeholderText, `![${file.name}](${data.url})`);
            onChange(finalText);
        } catch (error) {
            console.error('Image upload failed', error);
            // Revert placeholder
            const reverted = newValue.replace(placeholderText, '');
            onChange(reverted);
            alert('Failed to upload image. Max size 10MB.');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="border border-white/10 rounded-lg overflow-hidden bg-black/40 focus-within:ring-2 focus-within:ring-white/20 transition-all duration-300">
            {/* Toolbar section */}
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-2 bg-black/60">
                <div className="flex space-x-1">
                    <button
                        type="button"
                        onClick={() => setView('write')}
                        className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                            view === 'write' ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-white hover:bg-white/5'
                        }`}
                        disabled={disabled}
                    >
                        Write
                    </button>
                    <button
                        type="button"
                        onClick={() => setView('preview')}
                        className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                            view === 'preview' ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-white hover:bg-white/5'
                        }`}
                        disabled={disabled}
                    >
                        Preview
                    </button>
                </div>
                {isUploading && (
                    <div className="flex items-center text-xs text-blue-400">
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" /> Uploading image...
                    </div>
                )}
            </div>

            {/* Input area */}
            <div className="p-3 relative max-h-[500px] overflow-y-auto custom-scrollbar">
                {view === 'write' ? (
                    <textarea
                        ref={textareaRef}
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        onPaste={handlePaste}
                        onDrop={handleDrop}
                        onDragOver={(e) => e.preventDefault()}
                        placeholder={placeholder}
                        disabled={disabled}
                        className="w-full min-h-[120px] bg-transparent text-sm resize-y outline-none text-zinc-200 placeholder:text-zinc-600 focus:ring-0 whitespace-pre-wrap"
                    />
                ) : (
                    <div className="prose prose-invert prose-sm max-w-none min-h-[120px] px-1">
                        {value ? (
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {value}
                            </ReactMarkdown>
                        ) : (
                            <span className="text-zinc-600 italic">Nothing to preview.</span>
                        )}
                    </div>
                )}
            </div>
            
            {/* Footer hints */}
            <div className="bg-black/80 px-3 py-1.5 flex justify-between items-center text-[10px] text-zinc-500 border-t border-white/5">
                <span className="flex items-center gap-1">
                    <ImageIcon className="w-3 h-3" /> Paste, drop, or click to attach images
                </span>
                <span>Markdown supported</span>
            </div>
        </div>
    );
}
