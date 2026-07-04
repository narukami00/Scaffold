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
                setNotifications((prev) =>
                    prev.map((n) =>
                        n.id === notification.id ? { ...n, read_at: new Date().toISOString() } : n
                    )
                );
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
                setNotifications((prev) =>
                    prev.map((n) =>
                        n.id === notification.id ? { ...n, read_at: new Date().toISOString() } : n
                    )
                );
            },
            onFinish: () => setProcessingId(null)
        });
    };

    return (
        <div className="relative" ref={panelRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`relative flex h-10 w-10 items-center justify-center rounded-xl border transition-all hover:scale-105 active:scale-95`}
                style={{
                    background: "#071d38",
                    borderColor: isOpen ? "#8b5e3c" : "rgba(139,94,60,0.18)",
                    color: "#f3e4c9",
                }}
            >
                <Bell size={18} />
                {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black ring-4 ring-[#ede0c8]"
                        style={{ backgroundColor: "#8b5e3c", color: "#f3e4c9" }}>
                        {unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-3 w-80 origin-top-right rounded-2xl border shadow-2xl animate-in fade-in zoom-in duration-200 z-[100] backdrop-blur-xl"
                    style={{
                        background: "rgba(10,41,71,0.82)",
                        borderColor: "rgba(243,228,201,0.15)",
                        boxShadow: "0 10px 30px rgba(0,0,0,0.25)"
                    }}
                >
                    <div className="flex items-center justify-between border-b p-4" style={{ borderColor: "rgba(243,228,201,0.15)" }}>
                        <h3 className="text-xs font-black uppercase tracking-widest text-[#f3e4c9]">
                            Notifications
                        </h3>
                        {unreadCount > 0 && (
                            <button 
                                onClick={async () => {
                                    await axios.post("/notifications/read-all");
                                    setNotifications(prev => prev.map(n => ({...n, read_at: new Date().toISOString()})));
                                }}
                                className="text-[10px] font-black uppercase text-[#8b5e3c] hover:underline hover:text-[#f3e4c9]"
                            >
                                Mark all read
                            </button>
                        )}
                    </div>

                    <div className="max-h-[400px] overflow-y-auto overflow-x-hidden p-2 custom-scrollbar">
                        {notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 text-center">
                                <Mail size={32} className="mb-2 opacity-20" style={{ color: "#f3e4c9" }} />
                                <p className="text-xs font-semibold text-[#f3e4c9]/60">No notifications yet</p>
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {notifications.map((n) => (
                                    <div
                                        key={n.id}
                                        className={`group relative rounded-xl p-3 transition-colors ${!n.read_at ? "bg-[#f3e4c9]/10" : "hover:bg-white/5"}`}
                                    >
                                        <div className="flex gap-3">
                                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-[#f3e4c9]"
                                                style={{ background: "#0a2947", borderColor: "rgba(243,228,201,0.15)" }}>
                                                {n.type === 'workspace.invitation' ? <Mail size={14} /> : <Bell size={14} />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs leading-relaxed text-[#f3e4c9] font-medium">
                                                    <span className="font-black">{n.data.actor_name}</span>{" "}
                                                    {n.data.message}
                                                </p>
                                                <p className="mt-1 text-[10px]" style={{ color: "rgba(211,212,192,0.55)" }}>
                                                    {new Date(n.created_at).toLocaleDateString()}
                                                </p>

                                                {n.type === 'workspace.invitation' && !n.read_at && (
                                                    <div className="mt-3 flex gap-2">
                                                        <button
                                                            disabled={processingId === n.id}
                                                            onClick={() => handleAccept(n)}
                                                            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-[10px] font-black uppercase text-black transition-all hover:scale-95 disabled:opacity-50"
                                                            style={{ background: "#8b5e3c", color: "#f3e4c9" }}
                                                        >
                                                            {processingId === n.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                                                            Accept
                                                        </button>
                                                        <button
                                                            disabled={processingId === n.id}
                                                            onClick={() => handleDecline(n)}
                                                            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border py-1.5 text-[10px] font-black uppercase transition-all hover:scale-95 disabled:opacity-50"
                                                            style={{ borderColor: "rgba(243,228,201,0.15)", background: "rgba(243,228,201,0.06)", color: "#f3e4c9" }}
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
                                                className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#8b5e3c] opacity-0 group-hover:opacity-100 transition-opacity"
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
