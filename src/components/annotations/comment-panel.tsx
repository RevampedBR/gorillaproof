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
                    ${isReply ? "ml-8 mt-2 border-l-2 border-zinc-800/60 pl-3" : "border border-transparent hover:border-zinc-800/60"}
                    ${isActive ? "ring-1 ring-emerald-500/30 bg-emerald-500/5 border-emerald-500/30" : "bg-zinc-900/40"}
                `}
            >
                <div
                    className={`
                        p-3 rounded-xl cursor-pointer hover:bg-zinc-800/40 transition-colors
                        ${comment.status === "resolved" ? "opacity-60" : ""}
                    `}
                    onClick={() => !isReply && comment.pos_x != null && onPinClick(comment.id)}
                >
                    {/* Header: Avatar + Name + Time + Timestamp */}
                    <div className="flex items-start gap-2.5 mb-2">
                        {/* Avatar */}
                        <div className="h-6 w-6 rounded-full bg-emerald-600 flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                            <span className="text-[10px] font-bold text-white tracking-widest">
                                {getInitials(comment.users?.full_name ?? null, comment.users?.email ?? "?")}
                            </span>
                        </div>

                        <div className="flex flex-col flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="text-[13px] font-semibold text-zinc-200 truncate">
                                    {comment.users?.full_name || comment.users?.email || "User"}
                                </span>
                                <span className="text-[11px] text-zinc-500 shrink-0">{formatTime(comment.created_at)}</span>
                            </div>

                            {/* Pin / Timestamp Badges */}
                            {(pinNum || comment.video_timestamp != null) && (
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    {pinNum && (
                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-sm shrink-0 flex items-center gap-1 ${comment.status === "open"
                                            ? "bg-emerald-500/20 text-emerald-400"
                                            : "bg-zinc-700 text-zinc-400"
                                            }`}>
                                            <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                                            </svg>
                                            {pinNum}
                                        </span>
                                    )}
                                    {comment.video_timestamp != null && (
                                        <span className="text-[10px] font-mono text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded-sm hover:bg-blue-500/20 transition-colors">
                                            {formatVideoTime(comment.video_timestamp)}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Content */}
                    <div className="pl-8.5 ml-[26px]">
                        <p className="text-[13px] text-zinc-300 leading-relaxed whitespace-pre-wrap">{comment.content}</p>

                        {/* Actions */}
                        <div className="flex items-center gap-3 mt-2.5">
                            {!isReply && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); setReplyTo(replyTo === comment.id ? null : comment.id); }}
                                    className="text-[11px] font-medium text-zinc-500 hover:text-zinc-300 transition-colors"
                                >
                                    {t("reply")}
                                </button>
                            )}
                            {comment.status === "open" ? (
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleResolve(comment.id); }}
                                    className="text-[11px] font-medium text-zinc-500 hover:text-emerald-400 transition-colors flex items-center gap-1"
                                >
                                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                                    {t("resolve")}
                                </button>
                            ) : (
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleReopen(comment.id); }}
                                    className="text-[11px] font-medium text-zinc-500 hover:text-amber-400 transition-colors flex items-center gap-1"
                                >
                                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" /></svg>
                                    {t("reopen")}
                                </button>
                            )}
                            {comment.user_id === currentUserId && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDelete(comment.id); }}
                                    className="text-[11px] font-medium text-zinc-600 hover:text-red-400 transition-colors ml-auto"
                                >
                                    {t("delete")}
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Replies */}
                {commentReplies.map((reply) => renderComment(reply, true))}

                {/* Reply Input */}
                {replyTo === comment.id && (
                    <div className="ml-8 mt-1.5 mb-3 pr-2">
                        <div className="flex bg-zinc-800/80 border border-zinc-700/50 rounded-lg focus-within:border-emerald-500/50 transition-colors overflow-hidden">
                            <textarea
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                placeholder={t("replyPlaceholder")}
                                className="flex-1 bg-transparent px-3 py-2 text-[12px] text-zinc-200 placeholder:text-zinc-500 resize-none focus:outline-none min-h-[40px]"
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
                                    className="h-7 w-7 rounded-md bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white flex items-center justify-center transition-colors"
                                >
                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12h15m0 0l-6.75-6.75M19.5 12l-6.75 6.75" /></svg>
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
            {/* Header with counts + filter */}
            <div className="p-4 border-b border-zinc-800/60 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-[12px] font-bold text-zinc-400 tracking-wide">
                        {t("title").toUpperCase()} ({rootComments.length})
                    </h3>
                    <div className="flex items-center gap-1.5 text-[10px] font-medium">
                        <span className="text-emerald-400">{openCount} {t("open").toLowerCase()}</span>
                        <span className="text-zinc-600">·</span>
                        <span className="text-zinc-500">{resolvedCount} {t("resolved").toLowerCase()}</span>
                    </div>
                </div>
                <div className="flex gap-1">
                    {(["all", "open", "resolved"] as FilterType[]).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${filter === f
                                ? "bg-zinc-800 text-emerald-400"
                                : "text-zinc-500 hover:text-zinc-300"
                                }`}
                        >
                            {t(f)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Comment List */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-4">
                {filteredComments.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center px-4">
                        <div className="h-12 w-12 rounded-full bg-zinc-800/50 flex items-center justify-center mb-4">
                            <svg className="h-5 w-5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                            </svg>
                        </div>
                        <p className="text-[13px] font-medium text-zinc-300">{t("noComments")}</p>
                        <p className="text-[12px] text-zinc-500 mt-1.5">{t("noCommentsSub")}</p>
                    </div>
                ) : (
                    filteredComments.map((c) => renderComment(c))
                )}
            </div>

            {/* New Comment Input */}
            <div className="p-4 border-t border-zinc-800/60 bg-zinc-950">
                {pendingPin && (
                    <div className="flex items-center gap-2 mb-3 px-2">
                        <span className="h-5 w-5 rounded-full bg-emerald-500 shadow-sm flex items-center justify-center text-[10px] font-bold text-white">
                            {pinnedComments.length + 1}
                        </span>
                        <span className="text-[11px] font-medium text-emerald-400">{t("pinPlaced")}</span>
                        <button
                            onClick={onCancelPin}
                            className="text-[11px] font-medium text-zinc-500 hover:text-red-400 transition-colors ml-auto flex items-center gap-1"
                        >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            {t("cancelPin")}
                        </button>
                    </div>
                )}
                <div className="flex bg-zinc-900 border border-zinc-700/60 rounded-xl focus-within:border-emerald-500/60 focus-within:ring-1 focus-within:ring-emerald-500/20 transition-all overflow-hidden shadow-inner">
                    <textarea
                        ref={commentInputRef}
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder={pendingPin ? t("commentOnPin") : t("addComment")}
                        className="flex-1 bg-transparent px-3.5 py-3 text-[13px] text-zinc-200 placeholder:text-zinc-500 resize-none focus:outline-none min-h-[48px]"
                        rows={1}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleSubmit();
                            }
                        }}
                    />
                    <div className="p-1.5 flex items-end">
                        <button
                            onClick={handleSubmit}
                            disabled={submitting || !newComment.trim()}
                            className="h-8 w-8 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 disabled:hover:bg-emerald-600 text-white flex items-center justify-center transition-colors"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
