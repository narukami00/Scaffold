import React, { useState, useEffect, useRef } from "react";
import { Bell, Check, X, Mail, Loader2 } from "lucide-react";
import { router, usePage } from "@inertiajs/react";
import axios from "axios";

export default function NotificationPanel() {
    const { auth } = usePage().props;
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(false);
    const [processingId, setProcessingId] = useState(null);
    const panelRef = useRef(null);

    const unreadCount = notifications.filter((n) => !n.read_at).length;

    useEffect(() => {
        fetchNotifications();

        // Real-time listener
        const channel = window.Echo.private(`App.Models.User.${auth.user.id}`);
        channel.listen(".NotificationReceived", (e) => {
            setNotifications((prev) => [e.notification, ...prev]);
        });

        // Click outside to close
        const handleClickOutside = (event) => {
            if (panelRef.current && !panelRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            window.Echo.leave(`App.Models.User.${auth.user.id}`);
        };
    }, []);

    const fetchNotifications = async () => {
        try {
            const response = await axios.get("/notifications");
            setNotifications(response.data);
        } catch (error) {
            console.error("Failed to fetch notifications", error);
        }
    };

    const markAsRead = async (id) => {
        try {
            await axios.post(`/notifications/${id}/read`);
            setNotifications((prev) =>
                prev.map((n) =>
                    n.id === id ? { ...n, read_at: new Date().toISOString() } : n
                )
            );
        } catch (error) {
            console.error("Failed to mark notification as read", error);
        }
    };

    const handleAccept = async (notification) => {
        setProcessingId(notification.id);
        const token = notification.data.token;
        
        router.post(`/invitations/accept/${token}`, {}, {
            onSuccess: () => {
                markAsRead(notification.id);
                setIsOpen(false);
            },
            onFinish: () => setProcessingId(null)
        });
    };

    const handleDecline = async (notification) => {
        setProcessingId(notification.id);
        const token = notification.data.token;

        router.post(`/invitations/decline/${token}`, {}, {
            onSuccess: () => {
                markAsRead(notification.id);
            },
            onFinish: () => setProcessingId(null)
        });
    };

    return (
        <div className="relative" ref={panelRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`relative flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface2/50 text-muted transition-all hover:border-accent/40 hover:text-white ${isOpen ? "border-accent text-white shadow-[0_0_15px_rgba(var(--accent-rgb),0.2)]" : ""}`}
            >
                <Bell size={18} />
                {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[10px] font-black text-black ring-4 ring-bg">
                        {unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-3 w-80 origin-top-right rounded-2xl border border-border bg-surface shadow-2xl animate-in fade-in zoom-in duration-200 z-[100]">
                    <div className="flex items-center justify-between border-b border-border p-4">
                        <h3 className="text-xs font-black uppercase tracking-widest text-white">
                            Notifications
                        </h3>
                        {unreadCount > 0 && (
                            <button 
                                onClick={async () => {
                                    await axios.post("/notifications/read-all");
                                    setNotifications(prev => prev.map(n => ({...n, read_at: new Date().toISOString()})));
                                }}
                                className="text-[10px] font-bold uppercase text-accent hover:underline"
                            >
                                Mark all read
                            </button>
                        )}
                    </div>

                    <div className="max-h-[400px] overflow-y-auto overflow-x-hidden p-2">
                        {notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 text-center">
                                <Mail size={32} className="mb-2 opacity-10" />
                                <p className="text-xs text-muted">No notifications yet</p>
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {notifications.map((n) => (
                                    <div
                                        key={n.id}
                                        className={`group relative rounded-xl p-3 transition-colors ${!n.read_at ? "bg-accent/5" : "hover:bg-surface2/50"}`}
                                    >
                                        <div className="flex gap-3">
                                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface2 border border-border text-accent">
                                                {n.type === 'workspace.invitation' ? <Mail size={14} /> : <Bell size={14} />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs leading-relaxed text-white">
                                                    <span className="font-bold">{n.data.actor_name}</span>{" "}
                                                    {n.data.message}
                                                </p>
                                                <p className="mt-1 text-[10px] text-muted">
                                                    {new Date(n.created_at).toLocaleDateString()}
                                                </p>

                                                {n.type === 'workspace.invitation' && !n.read_at && (
                                                    <div className="mt-3 flex gap-2">
                                                        <button
                                                            disabled={processingId === n.id}
                                                            onClick={() => handleAccept(n)}
                                                            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-accent py-1.5 text-[10px] font-black uppercase text-black transition-all hover:scale-95 disabled:opacity-50"
                                                        >
                                                            {processingId === n.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                                                            Accept
                                                        </button>
                                                        <button
                                                            disabled={processingId === n.id}
                                                            onClick={() => handleDecline(n)}
                                                            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border bg-surface2 py-1.5 text-[10px] font-black uppercase text-white transition-all hover:bg-red-500/10 hover:text-red-500 disabled:opacity-50"
                                                        >
                                                            {processingId === n.id ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
                                                            Decline
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        {!n.read_at && (
                                            <button 
                                                onClick={() => markAsRead(n.id)}
                                                className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-accent opacity-0 group-hover:opacity-100 transition-opacity"
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
