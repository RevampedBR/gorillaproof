"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { createComment, resolveComment, reopenComment, deleteComment } from "@/lib/actions/comments";

interface Comment {
    id: string;
    content: string;
    pos_x: number | null;
    pos_y: number | null;
    video_timestamp: number | null;
    status: string;
    parent_comment_id: string | null;
    created_at: string;
    user_id: string;
    users: { id: string; full_name: string | null; avatar_url: string | null; email: string } | null;
}

interface CommentPanelProps {
    comments: Comment[];
    versionId: string;
    proofId: string;
    currentUserId: string;
    activePinId: string | null;
    pendingPin: { posX: number; posY: number } | null;
    videoTimestamp?: number | null;
    onCommentCreated: () => void;
    onPinClick: (commentId: string) => void;
    onCancelPin: () => void;
}

type FilterType = "all" | "open" | "resolved";

export function CommentPanel({
    comments,
    versionId,
    proofId,
    currentUserId,
    activePinId,
    pendingPin,
    videoTimestamp,
    onCommentCreated,
    onPinClick,
    onCancelPin,
}: CommentPanelProps) {
    const t = useTranslations("dashboard.comments");
    const [filter, setFilter] = useState<FilterType>("all");
    const [newComment, setNewComment] = useState("");
    const [replyTo, setReplyTo] = useState<string | null>(null);
    const [replyText, setReplyText] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const commentInputRef = useRef<HTMLTextAreaElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Focus input when pending pin is placed
    useEffect(() => {
        if (pendingPin && commentInputRef.current) {
            commentInputRef.current.focus();
        }
    }, [pendingPin]);

    // Scroll to active comment
    useEffect(() => {
        if (activePinId) {
            const el = document.getElementById(`comment-${activePinId}`);
            el?.scrollIntoView({ behavior: "smooth", block: "center" });
        }
    }, [activePinId]);

    // Separate root comments from replies
    const rootComments = comments.filter((c) => !c.parent_comment_id);
    const replies = comments.filter((c) => c.parent_comment_id);
    const getReplies = (parentId: string) => replies.filter((r) => r.parent_comment_id === parentId);

    const filteredComments = rootComments.filter((c) => {
        if (filter === "open") return c.status === "open";
        if (filter === "resolved") return c.status === "resolved";
        return true;
    });

    const openCount = rootComments.filter((c) => c.status === "open").length;
    const resolvedCount = rootComments.filter((c) => c.status === "resolved").length;

    // Assign pin numbers to root comments that have positions
    const pinnedComments = rootComments.filter((c) => c.pos_x != null && c.pos_y != null);
    const getPinNumber = (commentId: string) => {
        const idx = pinnedComments.findIndex((c) => c.id === commentId);
        return idx >= 0 ? idx + 1 : null;
    };

    const handleSubmit = async () => {
        if (!newComment.trim()) return;
        setSubmitting(true);

        await createComment(
            versionId,
            newComment.trim(),
            proofId,
            pendingPin?.posX ?? null,
            pendingPin?.posY ?? null,
            videoTimestamp ?? null,
            null
        );

        setNewComment("");
        onCancelPin();
        onCommentCreated();
        setSubmitting(false);
    };

    const handleReply = async (parentId: string) => {
        if (!replyText.trim()) return;
        setSubmitting(true);

        await createComment(versionId, replyText.trim(), proofId, null, null, null, parentId);

        setReplyText("");
        setReplyTo(null);
        onCommentCreated();
        setSubmitting(false);
    };

    const handleResolve = async (commentId: string) => {
        await resolveComment(commentId, proofId);
        onCommentCreated();
    };

    const handleReopen = async (commentId: string) => {
        await reopenComment(commentId, proofId);
        onCommentCreated();
    };

    const handleDelete = async (commentId: string) => {
        await deleteComment(commentId, proofId);
        onCommentCreated();
    };

    const getInitials = (name: string | null, email: string) => {
        if (name) {
            return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
        }
        return email[0].toUpperCase();
    };

    const formatTime = (date: string) => {
        const d = new Date(date);
        const now = new Date();
        const diffMs = now.getTime() - d.getTime();
        const diffMin = Math.floor(diffMs / 60000);
        if (diffMin < 1) return t("justNow");
        if (diffMin < 60) return `${diffMin}m`;
        const diffHr = Math.floor(diffMin / 60);
        if (diffHr < 24) return `${diffHr}h`;
        return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
    };

    const formatVideoTime = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        const ms = Math.floor((s % 1) * 1000);
        return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}.${String(ms).padStart(3, "0")}`;
    };

    const renderComment = (comment: Comment, isReply = false) => {
        const pinNum = !isReply ? getPinNumber(comment.id) : null;
        const commentReplies = !isReply ? getReplies(comment.id) : [];
        const isActive = activePinId === comment.id;

        return (
            <div
                key={comment.id}
                id={`comment-${comment.id}`}
                className={`
                    ${isReply ? "ml-8 mt-1.5 pl-3 border-l-2 border-[#3a3a55]" : ""}
                    ${isActive ? "bg-blue-500/5 border-l-2 border-blue-400" : ""}
                    transition-all duration-150
                `}
            >
                <div
                    className={`
                        px-4 py-3 cursor-pointer hover:bg-[#2a2a40]/40 transition-colors
                        ${comment.status === "resolved" ? "opacity-50" : ""}
                    `}
                    onClick={() => !isReply && comment.pos_x != null && onPinClick(comment.id)}
                >
                    {/* Author + Time */}
                    <div className="flex items-center gap-2 mb-1.5">
                        <div className="h-6 w-6 rounded-full bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center shrink-0">
                            <span className="text-[9px] font-bold text-white">
                                {getInitials(comment.users?.full_name ?? null, comment.users?.email ?? "?")}
                            </span>
                        </div>
                        <span className="text-[13px] font-semibold text-white truncate flex-1">
                            {comment.users?.full_name || comment.users?.email || "User"}
                        </span>
                        <span className="text-[11px] text-zinc-500 shrink-0">{formatTime(comment.created_at)}</span>
                    </div>

                    {/* Badges: Pin # + Timestamp */}
                    {(pinNum || comment.video_timestamp != null) && (
                        <div className="flex items-center gap-2 mb-1.5 ml-8">
                            {pinNum && (
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 ${comment.status === "open" ? "bg-emerald-500/15 text-emerald-400" : "bg-[#2a2a40] text-zinc-500"}`}>
                                    📍 {pinNum}
                                </span>
                            )}
                            {comment.video_timestamp != null && (
                                <span className="text-[10px] font-mono text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded cursor-pointer hover:bg-blue-500/20 transition-colors">
                                    ⏱ {formatVideoTime(comment.video_timestamp)}
                                </span>
                            )}
                        </div>
                    )}

                    {/* Content */}
                    <p className="text-[13px] text-zinc-300 leading-relaxed whitespace-pre-wrap ml-8">{comment.content}</p>

                    {/* Actions */}
                    <div className="flex items-center gap-3 mt-2 ml-8">
                        {!isReply && (
                            <button
                                onClick={(e) => { e.stopPropagation(); setReplyTo(replyTo === comment.id ? null : comment.id); }}
                                className="text-[11px] font-medium text-zinc-500 hover:text-zinc-200 transition-colors"
                            >
                                Reply
                            </button>
                        )}
                        {comment.status === "open" ? (
                            <button
                                onClick={(e) => { e.stopPropagation(); handleResolve(comment.id); }}
                                className="text-[11px] font-medium text-zinc-500 hover:text-emerald-400 transition-colors"
                            >
                                ✓ Resolve
                            </button>
                        ) : (
                            <button
                                onClick={(e) => { e.stopPropagation(); handleReopen(comment.id); }}
                                className="text-[11px] font-medium text-zinc-500 hover:text-amber-400 transition-colors"
                            >
                                ↩ Reopen
                            </button>
                        )}
                        {comment.user_id === currentUserId && (
                            <button
                                onClick={(e) => { e.stopPropagation(); handleDelete(comment.id); }}
                                className="text-[11px] font-medium text-zinc-600 hover:text-red-400 transition-colors ml-auto"
                            >
                                Delete
                            </button>
                        )}
                    </div>
                </div>

                {/* Replies */}
                {commentReplies.map((reply) => renderComment(reply, true))}

                {/* Reply Input */}
                {replyTo === comment.id && (
                    <div className="ml-8 mt-1 mb-2 pr-3">
                        <div className="flex bg-[#1e1e32] border border-[#3a3a55] rounded-lg overflow-hidden focus-within:border-blue-500/50 transition-colors">
                            <textarea
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                placeholder={t("replyPlaceholder")}
                                className="flex-1 bg-transparent px-3 py-2 text-[12px] text-zinc-200 placeholder:text-zinc-600 resize-none focus:outline-none min-h-[36px]"
                                rows={1}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        handleReply(comment.id);
                                    }
                                }}
                            />
                            <div className="p-1 flex items-end">
                                <button
                                    onClick={() => handleReply(comment.id)}
                                    disabled={submitting || !replyText.trim()}
                                    className="h-7 w-7 rounded bg-emerald-600 hover:bg-emerald-700 disabled:opacity-30 text-white flex items-center justify-center transition-colors"
                                >
                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full">
            {/* ═══ ZIFLOW-STYLE: Rich text input AT THE TOP ═══ */}
            <div className="p-3 border-b border-[#2a2a40]">
                {/* Rich text toolbar */}
                <div className="flex items-center gap-0.5 mb-2 flex-wrap">
                    {["B", "I", "U", "S"].map(btn => (
                        <button key={btn} className="h-6 w-6 rounded text-[12px] font-bold text-zinc-500 hover:text-white hover:bg-[#3a3a55] transition-colors">
                            {btn}
                        </button>
                    ))}
                    <div className="w-px h-4 bg-[#3a3a55] mx-1" />
                    {/* List icons */}
                    <button className="h-6 w-6 rounded text-zinc-500 hover:text-white hover:bg-[#3a3a55] transition-colors flex items-center justify-center">
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>
                    </button>
                    <button className="h-6 w-6 rounded text-zinc-500 hover:text-white hover:bg-[#3a3a55] transition-colors flex items-center justify-center">
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.242 5.992h12m-12 6.003H20.24m-12 5.999h12M4.117 7.495v-3.75H2.99m1.125 3.75H2.99m1.125 0H5.24m-1.92 2.577a1.125 1.125 0 11-1.087 0m0 0v-.003" /></svg>
                    </button>
                    <div className="w-px h-4 bg-[#3a3a55] mx-1" />
                    <button className="h-6 w-6 rounded text-zinc-500 hover:text-white hover:bg-[#3a3a55] transition-colors flex items-center justify-center text-[12px]">
                        ···
                    </button>
                    <button className="h-6 w-6 rounded text-zinc-500 hover:text-white hover:bg-[#3a3a55] transition-colors flex items-center justify-center">
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.54a4.5 4.5 0 00-6.364-6.364L4.5 8.257" /></svg>
                    </button>
                    <div className="flex-1" />
                    <button className="h-5 px-2 rounded bg-[#e91e8c] text-white text-[9px] font-bold tracking-wider">
                        Ask AI
                    </button>
                </div>

                {/* Comment textarea */}
                <textarea
                    ref={commentInputRef}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder={pendingPin ? t("commentOnPin") : t("addComment")}
                    className="w-full bg-[#1e1e32] border border-[#3a3a55] rounded-lg px-3 py-2.5 text-[13px] text-zinc-200 placeholder:text-zinc-600 resize-none focus:outline-none focus:border-blue-500/50 min-h-[80px] transition-colors"
                    rows={3}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey && (e.metaKey || e.ctrlKey)) {
                            e.preventDefault();
                            handleSubmit();
                        }
                    }}
                />

                {/* Time badge + attachments */}
                <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px] text-zinc-500 font-mono">
                        Time {videoTimestamp != null ? formatVideoTime(videoTimestamp) : "00:00.000"}
                    </span>
                    <div className="flex items-center gap-1">
                        <button className="h-5 w-5 rounded text-zinc-500 hover:text-zinc-300 transition-colors flex items-center justify-center">
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" /></svg>
                        </button>
                        <button className="h-5 w-5 rounded text-zinc-500 hover:text-zinc-300 transition-colors flex items-center justify-center">
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.54a4.5 4.5 0 00-6.364-6.364L4.5 8.257" /></svg>
                        </button>
                    </div>
                </div>

                {/* Post / Cancel buttons */}
                <div className="flex items-center gap-2 mt-2.5">
                    <button
                        onClick={handleSubmit}
                        disabled={submitting || !newComment.trim()}
                        className="h-8 px-4 rounded-md text-[12px] font-bold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-30 text-white transition-colors"
                    >
                        Post
                    </button>
                    <button
                        onClick={() => { setNewComment(""); onCancelPin(); }}
                        className="h-8 px-4 rounded-md text-[12px] font-medium text-zinc-400 hover:text-white hover:bg-[#2a2a40] transition-colors"
                    >
                        Cancel
                    </button>
                </div>

                {/* Pending pin indicator */}
                {pendingPin && (
                    <div className="flex items-center gap-2 mt-2 px-2 py-1.5 bg-emerald-500/10 rounded-md border border-emerald-500/20">
                        <span className="h-5 w-5 rounded-full bg-emerald-500 flex items-center justify-center text-[10px] font-bold text-white">
                            {pinnedComments.length + 1}
                        </span>
                        <span className="text-[11px] text-emerald-400 font-medium">{t("pinPlaced")}</span>
                        <button
                            onClick={onCancelPin}
                            className="text-[11px] text-zinc-500 hover:text-red-400 transition-colors ml-auto"
                        >
                            ✕
                        </button>
                    </div>
                )}
            </div>

            {/* ═══ Sort / Filter bar ═══ */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-[#2a2a40]">
                <div className="flex items-center gap-1">
                    <span className="text-[11px] text-zinc-400">Date ↑</span>
                </div>
                <div className="flex items-center gap-1">
                    {/* Emoji / Reactions */}
                    <button className="h-6 w-6 rounded text-zinc-500 hover:text-zinc-200 hover:bg-[#2a2a40] transition-colors flex items-center justify-center text-[12px]">☺</button>
                    <button className="h-6 w-6 rounded text-zinc-500 hover:text-zinc-200 hover:bg-[#2a2a40] transition-colors flex items-center justify-center text-[12px]">☻</button>
                    {/* Search */}
                    <button className="h-6 w-6 rounded text-zinc-500 hover:text-zinc-200 hover:bg-[#2a2a40] transition-colors flex items-center justify-center">
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
                    </button>
                    {/* Filter */}
                    <button className="h-6 w-6 rounded text-zinc-500 hover:text-zinc-200 hover:bg-[#2a2a40] transition-colors flex items-center justify-center">
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" /></svg>
                    </button>
                    {/* More */}
                    <button className="h-6 w-6 rounded text-zinc-500 hover:text-zinc-200 hover:bg-[#2a2a40] transition-colors flex items-center justify-center text-[12px]">︙</button>
                </div>
            </div>

            {/* ═══ Comment List ═══ */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto">
                {filteredComments.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center px-6">
                        <div className="h-16 w-16 rounded-2xl bg-[#2a2a40] flex items-center justify-center mb-4">
                            <svg className="h-8 w-8 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                            </svg>
                        </div>
                        <p className="text-[14px] font-medium text-zinc-300">{t("noComments")}</p>
                        <p className="text-[12px] text-zinc-500 mt-1.5">{t("noCommentsSub")}</p>
                    </div>
                ) : (
                    <div className="divide-y divide-[#2a2a40]/50">
                        {filteredComments.map((c) => renderComment(c))}
                    </div>
                )}
            </div>
        </div>
    );
}
