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

    const renderComment = (comment: Comment, isReply = false) => {
        const pinNum = !isReply ? getPinNumber(comment.id) : null;
        const commentReplies = !isReply ? getReplies(comment.id) : [];
        const isActive = activePinId === comment.id;

        return (
            <div
                key={comment.id}
                id={`comment-${comment.id}`}
                className={`
                    ${isReply ? "ml-6 mt-1.5" : ""}
                    ${isActive ? "ring-1 ring-emerald-500/30 bg-emerald-500/5" : ""}
                    rounded-lg transition-all duration-200
                `}
            >
                <div
                    className={`
                        p-3 rounded-lg cursor-pointer hover:bg-zinc-800/30 transition-colors
                        ${comment.status === "resolved" ? "opacity-60" : ""}
                    `}
                    onClick={() => !isReply && comment.pos_x != null && onPinClick(comment.id)}
                >
                    {/* Header */}
                    <div className="flex items-center gap-2 mb-1.5">
                        {/* Avatar */}
                        <div className="h-5 w-5 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0">
                            <span className="text-[8px] font-bold text-white">
                                {getInitials(comment.users?.full_name ?? null, comment.users?.email ?? "?")}
                            </span>
                        </div>
                        <span className="text-[11px] font-medium text-zinc-300 truncate">
                            {comment.users?.full_name || comment.users?.email || "User"}
                        </span>
                        <span className="text-[9px] text-zinc-600 shrink-0">{formatTime(comment.created_at)}</span>
                        {pinNum && (
                            <span className={`text-[9px] font-mono font-bold px-1.5 py-0 rounded-full shrink-0 ${comment.status === "open"
                                    ? "bg-emerald-500/20 text-emerald-400"
                                    : "bg-zinc-600/30 text-zinc-500"
                                }`}>
                                #{pinNum}
                            </span>
                        )}
                    </div>

                    {/* Content */}
                    <p className="text-[12px] text-zinc-300 leading-relaxed whitespace-pre-wrap">{comment.content}</p>

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-2">
                        {!isReply && (
                            <button
                                onClick={(e) => { e.stopPropagation(); setReplyTo(replyTo === comment.id ? null : comment.id); }}
                                className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
                            >
                                {t("reply")}
                            </button>
                        )}
                        {comment.status === "open" ? (
                            <button
                                onClick={(e) => { e.stopPropagation(); handleResolve(comment.id); }}
                                className="text-[10px] text-zinc-500 hover:text-emerald-400 transition-colors"
                            >
                                ✓ {t("resolve")}
                            </button>
                        ) : (
                            <button
                                onClick={(e) => { e.stopPropagation(); handleReopen(comment.id); }}
                                className="text-[10px] text-zinc-500 hover:text-amber-400 transition-colors"
                            >
                                ↩ {t("reopen")}
                            </button>
                        )}
                        {comment.user_id === currentUserId && (
                            <button
                                onClick={(e) => { e.stopPropagation(); handleDelete(comment.id); }}
                                className="text-[10px] text-zinc-600 hover:text-red-400 transition-colors ml-auto"
                            >
                                {t("delete")}
                            </button>
                        )}
                    </div>
                </div>

                {/* Replies */}
                {commentReplies.map((reply) => renderComment(reply, true))}

                {/* Reply Input */}
                {replyTo === comment.id && (
                    <div className="ml-6 mt-1 mb-2">
                        <div className="flex gap-1.5">
                            <textarea
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                placeholder={t("replyPlaceholder")}
                                className="flex-1 bg-zinc-800/50 border border-zinc-700/50 rounded-lg px-2.5 py-1.5 text-[11px] text-zinc-200 placeholder:text-zinc-600 resize-none focus:outline-none focus:border-emerald-500/50 min-h-[32px]"
                                rows={1}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        handleReply(comment.id);
                                    }
                                }}
                            />
                            <button
                                onClick={() => handleReply(comment.id)}
                                disabled={submitting || !replyText.trim()}
                                className="h-8 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-[10px] font-medium shrink-0 transition-colors"
                            >
                                ↵
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header with counts + filter */}
            <div className="p-3 border-b border-zinc-800/40 space-y-2">
                <div className="flex items-center justify-between">
                    <h3 className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">
                        {t("title")} ({rootComments.length})
                    </h3>
                    <div className="flex items-center gap-1.5 text-[9px]">
                        <span className="text-emerald-400">{openCount} {t("open")}</span>
                        <span className="text-zinc-600">·</span>
                        <span className="text-zinc-500">{resolvedCount} {t("resolved")}</span>
                    </div>
                </div>
                <div className="flex gap-1">
                    {(["all", "open", "resolved"] as FilterType[]).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-2 py-0.5 rounded text-[10px] transition-colors ${filter === f
                                    ? "bg-emerald-500/15 text-emerald-400"
                                    : "text-zinc-500 hover:text-zinc-300"
                                }`}
                        >
                            {t(f)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Comment List */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-2 space-y-1">
                {filteredComments.length === 0 ? (
                    <div className="text-center py-8">
                        <p className="text-[12px] text-zinc-500">{t("noComments")}</p>
                        <p className="text-[10px] text-zinc-600 mt-1">{t("noCommentsSub")}</p>
                    </div>
                ) : (
                    filteredComments.map((c) => renderComment(c))
                )}
            </div>

            {/* New Comment Input */}
            <div className="p-3 border-t border-zinc-800/40">
                {pendingPin && (
                    <div className="flex items-center gap-2 mb-2 text-[10px]">
                        <span className="h-4 w-4 rounded-full bg-emerald-500 flex items-center justify-center text-[8px] font-bold text-white">
                            {pinnedComments.length + 1}
                        </span>
                        <span className="text-emerald-400">{t("pinPlaced")}</span>
                        <button
                            onClick={onCancelPin}
                            className="text-zinc-500 hover:text-red-400 transition-colors ml-auto"
                        >
                            ✕ {t("cancelPin")}
                        </button>
                    </div>
                )}
                <div className="flex gap-1.5">
                    <textarea
                        ref={commentInputRef}
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder={pendingPin ? t("commentOnPin") : t("addComment")}
                        className="flex-1 bg-zinc-800/50 border border-zinc-700/50 rounded-lg px-3 py-2 text-[12px] text-zinc-200 placeholder:text-zinc-600 resize-none focus:outline-none focus:border-emerald-500/50 min-h-[36px]"
                        rows={1}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleSubmit();
                            }
                        }}
                    />
                    <button
                        onClick={handleSubmit}
                        disabled={submitting || !newComment.trim()}
                        className="h-9 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-[11px] font-medium shrink-0 transition-colors"
                    >
                        ↵
                    </button>
                </div>
            </div>
        </div>
    );
}
