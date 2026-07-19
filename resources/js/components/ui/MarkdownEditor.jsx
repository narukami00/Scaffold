import React, { useRef, useState } from 'react';
import { Image as ImageIcon, Loader2 } from 'lucide-react';
import axios from 'axios';
import SafeMarkdown, { isPastableImageUrl } from '@/components/ui/SafeMarkdown';

// ── Palette tokens ────────────────────────────────────────────────────────────
const C = {
    bg:      "#ede0c8",
    card:    "#f3e4c9",
    navy:    "#0a2947",
    brown:   "#8b5e3c",
    sage:    "#d3d4c0",
    border:  "rgba(139,94,60,0.18)",
    muted:   "rgba(10,41,71,0.68)",
    faint:   "rgba(10,41,71,0.25)",
};

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
    const fileInputRef = useRef(null);

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        await uploadImage(file);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handlePaste = async (e) => {
        const items = e.clipboardData.items;
        const fileItem = Array.from(items).find(item => item.kind === 'file');

        if (!fileItem) {
            const pasted = e.clipboardData.getData('text/plain').trim();
            if (isPastableImageUrl(pasted)) {
                e.preventDefault();
                const textarea = textareaRef.current;
                const start = textarea.selectionStart;
                const end = textarea.selectionEnd;
                onChange(`${value.slice(0, start)}![External image](${pasted})${value.slice(end)}`);
            }
            return;
        }

        if (!uploadUrl) return;

        e.preventDefault();
        const file = fileItem.getAsFile();
        await uploadImage(file);
    };

    const handleDrop = async (e) => {
        if (!uploadUrl) return;

        e.preventDefault();
        const file = Array.from(e.dataTransfer.files)[0];
        if (!file) return;

        await uploadImage(file);
    };

    const uploadImage = async (file) => {
        if (disabled) return;

        const textarea = textareaRef.current;
        if (!textarea) return;

        const startPos = textarea.selectionStart;
        const endPos = textarea.selectionEnd;

        const isImage = file.type.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name);
        const placeholderText = isImage ? `![Uploading ${file.name}...]()` : `[Uploading ${file.name}...]()`;
        const newValue = value.substring(0, startPos) + placeholderText + value.substring(endPos);
        onChange(newValue);
        setIsUploading(true);

        const formData = new FormData();
        formData.append('image', file);

        try {
            const { data } = await axios.post(uploadUrl, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            const linkSyntax = isImage ? `![${file.name}](${data.url})` : `[${file.name}](${data.url})`;
            const finalText = newValue.replace(placeholderText, linkSyntax);
            onChange(finalText);
        } catch (error) {
            console.error('File upload failed', error);
            const reverted = newValue.replace(placeholderText, '');
            onChange(reverted);
            const serverMsg =
                error?.response?.data?.errors?.image?.[0] ||
                error?.response?.data?.message ||
                null;
            const status = error?.response?.status;
            if (serverMsg) {
                alert(serverMsg);
            } else if (status === 413) {
                alert('File is too large for the server (max 10MB).');
            } else if (status === 422) {
                alert('This file type is not allowed.');
            } else {
                alert('Failed to upload file. Please try again.');
            }
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="rounded-xl overflow-hidden transition-all duration-300 focus-within:ring-2 focus-within:ring-[#8b5e3c]/20"
            style={{ background: "rgba(139,94,60,0.03)", border: `1px solid ${C.border}` }}>
            {/* Toolbar section */}
            <div className="flex items-center justify-between px-4 py-2 border-b"
                style={{ background: "rgba(139,94,60,0.06)", borderColor: C.border }}>
                <div className="flex space-x-1">
                    <button
                        type="button"
                        onClick={() => setView('write')}
                        className="px-3 py-1 text-xs font-semibold rounded-md transition-colors"
                        style={{
                            background: view === 'write' ? C.brown : 'transparent',
                            color: view === 'write' ? '#f3e4c9' : C.muted
                        }}
                        disabled={disabled}
                    >
                        Write
                    </button>
                    <button
                        type="button"
                        onClick={() => setView('preview')}
                        className="px-3 py-1 text-xs font-semibold rounded-md transition-colors"
                        style={{
                            background: view === 'preview' ? C.brown : 'transparent',
                            color: view === 'preview' ? '#f3e4c9' : C.muted
                        }}
                        disabled={disabled}
                    >
                        Preview
                    </button>
                </div>
                {isUploading && (
                    <div className="flex items-center text-xs text-blue-700">
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
                        className="w-full min-h-[120px] bg-transparent text-sm resize-y outline-none whitespace-pre-wrap placeholder:text-slate-400 focus:ring-0"
                        style={{ color: C.navy }}
                    />
                ) : (
                    <div className="prose prose-sm max-w-none min-h-[120px] px-1 text-slate-800">
                        {value ? (
                            <SafeMarkdown>{value}</SafeMarkdown>
                        ) : (
                            <span className="italic" style={{ color: C.muted }}>Nothing to preview.</span>
                        )}
                    </div>
                )}
            </div>
            
            {/* Hidden File Input for Click-to-Attach */}
            {uploadUrl && (
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    accept="image/*,.txt,.md,.markdown,.json,.js,.ts,.py,.rs,.go,.c,.cpp,.h,.hpp,.cs,.java,.sh,.xml,.yaml,.yml,.sql,.pdf" 
                    className="hidden" 
                />
            )}

            {/* Footer hints */}
            <div className="px-3 py-1.5 flex justify-between items-center text-[10px] border-t cursor-pointer hover:bg-black/[0.02] transition-colors"
                onClick={() => { if (!disabled && uploadUrl) fileInputRef.current?.click(); }}
                style={{ background: "rgba(139,94,60,0.04)", borderColor: C.border, color: C.muted }}>
                <span className="flex items-center gap-1">
                    <ImageIcon className="w-3 h-3" /> Paste, drop, or click to attach images
                </span>
                <span>Markdown supported</span>
            </div>
        </div>
    );
}
