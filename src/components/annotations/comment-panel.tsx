"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { createComment, resolveComment, reopenComment, deleteComment } from "@/lib/actions/comments";
import { summarizeComments } from "@/lib/actions/ai";
import { logActivity } from "@/lib/actions/activity";
import { notifyMention } from "@/lib/actions/email";
import { useToast } from "@/components/ui/toast-provider";
import DOMPurify from "dompurify";
import { Lock, MapPin, Clock, Check, RefreshCw, X, Globe, RotateCcw } from "lucide-react";

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
    attachment_url?: string | null;
    is_internal?: boolean;
    users: { id: string; full_name: string | null; avatar_url: string | null; email: string } | null;
}

interface CommentPanelProps {
    comments: Comment[];
    versionId: string;
    proofId: string;
    proofTitle?: string;
    currentUserId: string;
    activePinId: string | null;
    pendingPin: { posX: number; posY: number } | null;
    videoTimestamp?: number | null;
    onCommentCreated: () => void;
    onPinClick: (commentId: string) => void;
    onCancelPin: () => void;
    orgMembers?: any[];
}

type FilterType = "all" | "open" | "resolved";

export function CommentPanel({
    comments,
    versionId,
    proofId,
    proofTitle,
    currentUserId,
    activePinId,
    pendingPin,
    videoTimestamp,
    onCommentCreated,
    onPinClick,
    onCancelPin,
    orgMembers = [],
}: CommentPanelProps) {
    const t = useTranslations("dashboard.comments");
    const { toast } = useToast();
    const [filter, setFilter] = useState<FilterType>("all");
    const [newComment, setNewComment] = useState("");
    const [replyTo, setReplyTo] = useState<string | null>(null);
    const [replyText, setReplyText] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [showSearch, setShowSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [showFilterMenu, setShowFilterMenu] = useState(false);
    const [aiSummary, setAiSummary] = useState<string | null>(null);
    const [aiLoading, setAiLoading] = useState(false);
    const commentInputRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const [isInternal, setIsInternal] = useState(false);
    const [sortBy, setSortBy] = useState<"date" | "status" | "author">("date");
    const [showSortMenu, setShowSortMenu] = useState(false);

    // @mentions state
    const [mentionQuery, setMentionQuery] = useState("");
    const [showMentions, setShowMentions] = useState(false);
    const [mentionIndex, setMentionIndex] = useState(0);
    const mentionDropdownRef = useRef<HTMLDivElement>(null);

    const filteredMembers = orgMembers.filter((m) => {
        if (!mentionQuery) return true;
        const q = mentionQuery.toLowerCase();
        const user = m.users;
        if (!user) return false;
        return (user.full_name?.toLowerCase().includes(q) || user.email?.toLowerCase().includes(q));
    }).slice(0, 6);

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
    }).filter((c) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return c.content.toLowerCase().includes(q) ||
            c.users?.full_name?.toLowerCase().includes(q) ||
            c.users?.email?.toLowerCase().includes(q);
    }).sort((a, b) => {
        if (sortBy === "status") return a.status.localeCompare(b.status);
        if (sortBy === "author") return (a.users?.full_name || a.users?.email || "").localeCompare(b.users?.full_name || b.users?.email || "");
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });

    const openCount = rootComments.filter((c) => c.status === "open").length;
    const resolvedCount = rootComments.filter((c) => c.status === "resolved").length;

    // Assign pin numbers to root comments that have positions
    const pinnedComments = rootComments.filter((c) => c.pos_x != null && c.pos_y != null);
    const getPinNumber = (commentId: string) => {
        const idx = pinnedComments.findIndex((c) => c.id === commentId);
        return idx >= 0 ? idx + 1 : null;
    };

    // Rich text formatting — WYSIWYG via execCommand
    const applyFormat = useCallback((tag: string) => {
        const editor = commentInputRef.current;
        if (!editor) return;
        editor.focus();

        switch (tag) {
            case "B": document.execCommand("bold"); break;
            case "I": document.execCommand("italic"); break;
            case "U": document.execCommand("underline"); break;
            case "S": document.execCommand("strikeThrough"); break;
            case "UL": document.execCommand("insertUnorderedList"); break;
            case "OL": document.execCommand("insertOrderedList"); break;
            case "LINK": {
                const url = prompt("Enter URL:");
                if (url) document.execCommand("createLink", false, url);
                break;
            }
        }
        // Sync state for submit button disabled check
        setTimeout(() => {
            setNewComment(editor.innerHTML || "");
        }, 0);
    }, []);

    // Helper to get clean text content from the editor
    const getEditorContent = useCallback(() => {
        const editor = commentInputRef.current;
        if (!editor) return "";
        return editor.innerHTML || "";
    }, []);

    const getEditorTextContent = useCallback(() => {
        const editor = commentInputRef.current;
        if (!editor) return "";
        return editor.textContent?.trim() || "";
    }, []);

    const clearEditor = useCallback(() => {
        const editor = commentInputRef.current;
        if (editor) editor.innerHTML = "";
        setNewComment("");
    }, []);

    // Insert @mention into contentEditable
    const insertMention = useCallback((member: any) => {
        const editor = commentInputRef.current;
        if (!editor) return;
        const user = member.users;
        if (!user) return;
        const name = user.full_name || user.email;

        const sel = window.getSelection();
        if (!sel || !sel.rangeCount) return;
        const range = sel.getRangeAt(0);
        const textNode = range.startContainer;

        if (textNode.nodeType === Node.TEXT_NODE) {
            const text = textNode.textContent || "";
            const cursorPos = range.startOffset;
            const beforeCursor = text.slice(0, cursorPos);
            const atIdx = beforeCursor.lastIndexOf("@");
            if (atIdx >= 0) {
                // Split the text node: before @, mention span, after cursor
                const before = text.slice(0, atIdx);
                const after = text.slice(cursorPos);

                // Create mention span
                const mentionSpan = document.createElement("span");
                mentionSpan.className = "mention-tag";
                mentionSpan.setAttribute("data-mention-id", user.id);
                mentionSpan.setAttribute("contenteditable", "false");
                mentionSpan.style.cssText = "color:#34d399;background:#34d39915;padding:0 3px;border-radius:3px;font-weight:600;cursor:default;";
                mentionSpan.textContent = `@${name}`;

                // Create space after
                const spaceNode = document.createTextNode("\u00A0");

                // Build new nodes
                const parent = textNode.parentNode!;
                const beforeNode = document.createTextNode(before);
                const afterNode = document.createTextNode(after);
                parent.replaceChild(afterNode, textNode);
                parent.insertBefore(spaceNode, afterNode);
                parent.insertBefore(mentionSpan, spaceNode);
                parent.insertBefore(beforeNode, mentionSpan);

                // Move cursor after the space
                const newRange = document.createRange();
                newRange.setStartAfter(spaceNode);
                newRange.collapse(true);
                sel.removeAllRanges();
                sel.addRange(newRange);
            }
        }

        setShowMentions(false);
        setMentionQuery("");
        setNewComment(editor.textContent?.trim() || "");
    }, []);

    const handleSubmit = async () => {
        const content = getEditorContent();
        const textContent = getEditorTextContent();
        if (!textContent) return;
        setSubmitting(true);

        await createComment(
            versionId,
            content,
            proofId,
            pendingPin?.posX ?? null,
            pendingPin?.posY ?? null,
            videoTimestamp ?? null,
            null,
            null,
            isInternal
        );

        // Activity log
        logActivity({ proofId, action: "comment_added", metadata: { text: textContent.slice(0, 100) } });

        // Detect @mentions and send email notifications
        const mentionMatches = content.match(/data-mention-id="([^"]+)"/g);
        if (mentionMatches && proofTitle) {
            const currentUserName = orgMembers.find(m => m.users?.id === currentUserId)?.users?.full_name || "Alguém";
            mentionMatches.forEach((match) => {
                const idMatch = match.match(/data-mention-id="([^"]+)"/);
                if (idMatch) {
                    const mentionedMember = orgMembers.find(m => m.users?.id === idMatch[1]);
                    if (mentionedMember?.users?.email && mentionedMember.users.id !== currentUserId) {
                        notifyMention({
                            proofTitle,
                            proofUrl: `${typeof window !== "undefined" ? window.location.href : ""}`,
                            mentionedBy: currentUserName,
                            commentText: content,
                            recipientEmail: mentionedMember.users.email,
                            recipientName: mentionedMember.users.full_name || undefined,
                        });
                    }
                }
            });
        }

        clearEditor();
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
        logActivity({ proofId, action: "comment_resolved", metadata: { commentId } });
        onCommentCreated();
    };

    const handleReopen = async (commentId: string) => {
        await reopenComment(commentId, proofId);
        logActivity({ proofId, action: "comment_reopened", metadata: { commentId } });
        onCommentCreated();
    };

    const handleDelete = async (commentId: string) => {
        if (!confirm("Delete this comment? This cannot be undone.")) return;
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

                    {/* Badges: Pin # + Timestamp + Internal */}
                    {(pinNum || comment.video_timestamp != null || comment.is_internal) && (
                        <div className="flex items-center gap-2 mb-1.5 ml-8">
                            {pinNum && (
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 ${comment.status === "open" ? "bg-emerald-500/15 text-emerald-400" : "bg-[#2a2a40] text-zinc-500"}`}>
                                    <MapPin className="h-3 w-3" /> {pinNum}
                                </span>
                            )}
                            {comment.video_timestamp != null && (
                                <span className="text-[10px] font-mono flex items-center gap-1 text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded cursor-pointer hover:bg-blue-500/20 transition-colors" title="Jump to this timestamp">
                                    <Clock className="h-3 w-3" /> {formatVideoTime(comment.video_timestamp)}
                                </span>
                            )}
                            {comment.is_internal && (
                                <span className="text-[9px] flex items-center gap-1 font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20" title="Visível apenas para sua equipe">
                                    <Lock className="h-2.5 w-2.5" /> INTERNAL
                                </span>
                            )}
                        </div>
                    )}

                    {/* Content — render HTML (with markdown fallback for old comments) */}
                    <div className="text-[13px] text-zinc-300 leading-relaxed whitespace-pre-wrap ml-8 [&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4 [&_a]:text-blue-400 [&_a]:underline" dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(comment.content.includes("<") ? comment.content : comment.content
                            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                            .replace(/\*(.+?)\*/g, '<em>$1</em>')
                            .replace(/__(.+?)__/g, '<u>$1</u>')
                            .replace(/~~(.+?)~~/g, '<del>$1</del>'))
                    }} />

                    {/* Actions */}
                    <div className="flex items-center gap-3 mt-2 ml-8">
                        {!isReply && (
                            <button
                                onClick={(e) => { e.stopPropagation(); setReplyTo(replyTo === comment.id ? null : comment.id); }}
                                className="text-[11px] font-medium text-zinc-500 hover:text-zinc-200 transition-colors cursor-pointer"
                                title="Reply to this comment"
                            >
                                Reply
                            </button>
                        )}
                        {comment.status === "open" ? (
                            <button
                                onClick={(e) => { e.stopPropagation(); handleResolve(comment.id); }}
                                className="flex items-center gap-1 text-[11px] font-medium text-zinc-500 hover:text-emerald-400 transition-colors cursor-pointer"
                                title="Mark as resolved"
                            >
                                <Check className="h-3 w-3" /> Resolve
                            </button>
                        ) : (
                            <button
                                onClick={(e) => { e.stopPropagation(); handleReopen(comment.id); }}
                                className="flex items-center gap-1 text-[11px] font-medium text-zinc-500 hover:text-amber-400 transition-colors cursor-pointer"
                                title="Reopen this comment"
                            >
                                <RefreshCw className="h-3 w-3" /> Reopen
                            </button>
                        )}
                        {comment.user_id === currentUserId && (
                            <button
                                onClick={(e) => { e.stopPropagation(); handleDelete(comment.id); }}
                                className="text-[11px] font-medium text-zinc-600 hover:text-red-400 transition-colors ml-auto cursor-pointer"
                                title="Delete this comment"
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
                                    className="h-7 w-7 rounded bg-emerald-600 hover:bg-emerald-700 disabled:opacity-30 text-white flex items-center justify-center transition-colors cursor-pointer"
                                    title="Send reply"
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
                {/* Rich text toolbar — FUNCTIONAL */}
                <div className="flex items-center gap-0.5 mb-2 flex-wrap">
                    <button onClick={() => applyFormat("B")} className="h-7 w-7 rounded text-[13px] font-bold text-zinc-500 hover:text-white hover:bg-[#3a3a55] transition-colors cursor-pointer" title="Bold (**text**)">B</button>
                    <button onClick={() => applyFormat("I")} className="h-7 w-7 rounded text-[13px] italic text-zinc-500 hover:text-white hover:bg-[#3a3a55] transition-colors cursor-pointer" title="Italic (*text*)">I</button>
                    <button onClick={() => applyFormat("U")} className="h-7 w-7 rounded text-[13px] underline text-zinc-500 hover:text-white hover:bg-[#3a3a55] transition-colors cursor-pointer" title="Underline (__text__)">U</button>
                    <button onClick={() => applyFormat("S")} className="h-7 w-7 rounded text-[13px] line-through text-zinc-500 hover:text-white hover:bg-[#3a3a55] transition-colors cursor-pointer" title="Strikethrough (~~text~~)">S</button>
                    <div className="w-px h-4 bg-[#3a3a55] mx-1" />
                    {/* Unordered list */}
                    <button onClick={() => applyFormat("UL")} className="h-7 w-7 rounded text-zinc-500 hover:text-white hover:bg-[#3a3a55] transition-colors flex items-center justify-center cursor-pointer" title="Bullet list">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>
                    </button>
                    {/* Ordered list */}
                    <button onClick={() => applyFormat("OL")} className="h-7 w-7 rounded text-zinc-500 hover:text-white hover:bg-[#3a3a55] transition-colors flex items-center justify-center cursor-pointer" title="Numbered list">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.242 5.992h12m-12 6.003H20.24m-12 5.999h12M4.117 7.495v-3.75H2.99m1.125 3.75H2.99m1.125 0H5.24m-1.92 2.577a1.125 1.125 0 11-1.087 0m0 0v-.003" /></svg>
                    </button>
                    <div className="w-px h-4 bg-[#3a3a55] mx-1" />
                    {/* Link */}
                    <button onClick={() => applyFormat("LINK")} className="h-7 w-7 rounded text-zinc-500 hover:text-white hover:bg-[#3a3a55] transition-colors flex items-center justify-center cursor-pointer" title="Insert link">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.54a4.5 4.5 0 00-6.364-6.364L4.5 8.257" /></svg>
                    </button>
                    <div className="flex-1" />
                    <button
                        onClick={async () => {
                            if (aiLoading) return;
                            if (aiSummary) { setAiSummary(null); return; }
                            setAiLoading(true);
                            const commentData = rootComments.map((c) => ({
                                author: c.users?.full_name || c.users?.email || "User",
                                content: c.content,
                                status: c.status,
                                hasPin: c.pos_x != null,
                                timestamp: c.video_timestamp != null ? formatVideoTime(c.video_timestamp) : null,
                            }));
                            const result = await summarizeComments(commentData);
                            setAiLoading(false);
                            if (result.summary) setAiSummary(result.summary);
                            else toast(result.error || "Erro ao gerar resumo", "error");
                        }}
                        disabled={rootComments.length === 0}
                        className={`h-6 px-2.5 rounded text-white text-[10px] font-bold tracking-wider cursor-pointer transition-colors disabled:opacity-30 ${aiSummary ? "bg-[#e91e8c] ring-2 ring-[#e91e8c]/40" : "bg-[#e91e8c] hover:bg-[#d41a7e]"}`}
                        title="AI Summary of all comments"
                    >
                        {aiLoading ? (
                            <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /></span>
                        ) : aiSummary ? "Close" : "Ask AI"}
                    </button>
                </div>

                {/* Comment rich text editor (contentEditable) */}
                <div className="relative">
                    <div
                        ref={commentInputRef}
                        contentEditable
                        suppressContentEditableWarning
                        className="w-full bg-[#1e1e32] border border-[#3a3a55] rounded-lg px-3 py-2.5 text-[13px] text-zinc-200 focus:outline-none focus:border-blue-500/50 min-h-[80px] max-h-[200px] transition-colors overflow-y-auto overflow-x-hidden [&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4 [&_a]:text-blue-400 [&_a]:underline empty:before:content-[attr(data-placeholder)] empty:before:text-zinc-600 empty:before:pointer-events-none"
                        data-placeholder={pendingPin ? t("commentOnPin") : t("addComment")}
                        onInput={() => {
                            const editor = commentInputRef.current;
                            if (editor) setNewComment(editor.textContent?.trim() || "");

                            // @mention detection
                            const sel = window.getSelection();
                            if (sel && sel.rangeCount > 0 && editor) {
                                const range = sel.getRangeAt(0);
                                const textNode = range.startContainer;
                                if (textNode.nodeType === Node.TEXT_NODE) {
                                    const text = textNode.textContent || "";
                                    const cursorPos = range.startOffset;
                                    const beforeCursor = text.slice(0, cursorPos);
                                    const mentionMatch = beforeCursor.match(/@([\w\s]*)$/);
                                    if (mentionMatch) {
                                        setMentionQuery(mentionMatch[1]);
                                        setShowMentions(true);
                                        setMentionIndex(0);
                                        return;
                                    }
                                }
                            }
                            setShowMentions(false);
                        }}
                        onKeyDown={(e) => {
                            // @mention keyboard navigation
                            if (showMentions && filteredMembers.length > 0) {
                                if (e.key === "ArrowDown") {
                                    e.preventDefault();
                                    setMentionIndex((i) => Math.min(i + 1, filteredMembers.length - 1));
                                    return;
                                }
                                if (e.key === "ArrowUp") {
                                    e.preventDefault();
                                    setMentionIndex((i) => Math.max(i - 1, 0));
                                    return;
                                }
                                if (e.key === "Enter" || e.key === "Tab") {
                                    e.preventDefault();
                                    insertMention(filteredMembers[mentionIndex]);
                                    return;
                                }
                                if (e.key === "Escape") {
                                    setShowMentions(false);
                                    return;
                                }
                            }
                            if (e.key === "Enter" && !e.shiftKey && (e.metaKey || e.ctrlKey)) {
                                e.preventDefault();
                                handleSubmit();
                            }
                        }}
                    />

                    {/* @mention dropdown */}
                    {showMentions && filteredMembers.length > 0 && (
                        <div ref={mentionDropdownRef} className="absolute left-0 right-0 bottom-full mb-1 bg-[#1e1e32] border border-[#3a3a55] rounded-lg shadow-xl z-50 overflow-hidden max-h-48 overflow-y-auto">
                            {filteredMembers.map((member, idx) => {
                                const user = member.users;
                                if (!user) return null;
                                const name = user.full_name || user.email;
                                return (
                                    <button
                                        key={user.id}
                                        className={`w-full px-3 py-2 flex items-center gap-2 text-left text-[12px] transition-colors cursor-pointer ${idx === mentionIndex ? "bg-emerald-500/20 text-emerald-300" : "text-zinc-300 hover:bg-[#2a2a40]"}`}
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            insertMention(member);
                                        }}
                                        onMouseEnter={() => setMentionIndex(idx)}
                                    >
                                        <div className="h-6 w-6 rounded-full bg-emerald-600/30 flex items-center justify-center text-[10px] font-bold text-emerald-300 shrink-0">
                                            {(user.full_name || user.email).charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-medium">{name}</span>
                                            {user.full_name && <span className="text-[10px] text-zinc-500">{user.email}</span>}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Time badge + attachments */}
                <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px] text-zinc-500 font-mono" title="Video timestamp for this comment">
                        Time {videoTimestamp != null ? formatVideoTime(videoTimestamp) : "00:00.000"}
                    </span>
                    <div className="flex items-center gap-1">
                        <button className="h-6 w-6 rounded text-zinc-500 hover:text-zinc-300 transition-colors flex items-center justify-center cursor-pointer" title="Attach file">
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" /></svg>
                        </button>
                        <button onClick={() => applyFormat("LINK")} className="h-6 w-6 rounded text-zinc-500 hover:text-zinc-300 transition-colors flex items-center justify-center cursor-pointer" title="Insert link">
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.54a4.5 4.5 0 00-6.364-6.364L4.5 8.257" /></svg>
                        </button>
                    </div>
                </div>

                {/* Post / Cancel buttons */}
                <div className="flex items-center gap-2 mt-2.5">
                    <button
                        onClick={handleSubmit}
                        disabled={submitting || !newComment}
                        className="h-8 px-4 rounded-md text-[12px] font-bold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-30 text-white transition-colors cursor-pointer"
                        title="Post comment (Ctrl+Enter)"
                    >
                        Post
                    </button>
                    <button
                        onClick={() => { clearEditor(); onCancelPin(); }}
                        className="h-8 px-4 rounded-md text-[12px] font-medium text-zinc-400 hover:text-white hover:bg-[#2a2a40] transition-colors cursor-pointer"
                        title="Cancel and clear"
                    >
                        Cancel
                    </button>
                    <div className="flex-1" />
                    <button
                        onClick={() => setIsInternal(!isInternal)}
                        className={`h-7 px-2.5 rounded-md text-[10px] font-medium transition-all cursor-pointer flex items-center gap-1 ${isInternal
                            ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                            : "bg-zinc-800/50 text-zinc-500 border border-zinc-700/30 hover:text-zinc-300"
                            }`}
                        title={isInternal ? "Visível apenas para sua equipe" : "Visível para todos"}
                    >
                        {isInternal ? (
                            <><Lock className="h-3 w-3" /> Internal</>
                        ) : (
                            <><Globe className="h-3 w-3" /> All</>
                        )}
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
                            className="text-[11px] text-zinc-500 hover:text-red-400 transition-colors ml-auto cursor-pointer flex items-center"
                            title="Remove pin"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    </div>
                )}
            </div>

            {/* ═══ AI Summary Panel ═══ */}
            {aiSummary && (
                <div className="border-b border-[#2a2a40] bg-gradient-to-r from-[#e91e8c]/5 to-[#7c3aed]/5">
                    <div className="px-4 py-2.5 flex items-center gap-2 border-b border-[#2a2a40]/50">
                        <span className="text-[11px] font-bold text-[#e91e8c]">AI Summary</span>
                        <span className="text-[9px] text-zinc-600 bg-[#2a2a40] px-1.5 py-0.5 rounded-full">Gemini 2.0</span>
                        <button onClick={() => setAiSummary(null)} className="ml-auto text-zinc-500 hover:text-zinc-300 cursor-pointer flex items-center">
                            <X className="h-3.5 w-3.5" />
                        </button>
                    </div>
                    <div className="px-4 py-3 text-[12px] text-zinc-300 leading-relaxed whitespace-pre-wrap max-h-[200px] overflow-y-auto"
                        dangerouslySetInnerHTML={{
                            __html: DOMPurify.sanitize(aiSummary
                                .replace(/\*\*(.+?)\*\*/g, '<strong class="text-white">$1</strong>')
                                .replace(/^- /gm, '• ')
                                .replace(/^### (.+)$/gm, '<span class="text-[#e91e8c] font-semibold block mt-2 mb-1">$1</span>')
                                .replace(/^## (.+)$/gm, '<span class="text-[#e91e8c] font-bold block mt-2 mb-1">$1</span>')
                                .replace(/\n/g, '<br/>'))
                        }}
                    />
                </div>
            )}

            {/* ═══ Sort / Filter bar ═══ */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-[#2a2a40]">
                <div className="flex items-center gap-1">
                    <span className="text-[11px] text-zinc-400">Date ↑</span>
                    <span className="text-[10px] text-zinc-600 ml-1">{openCount} open · {resolvedCount} resolved</span>
                </div>
                <div className="flex items-center gap-1 relative">
                    {/* Search */}
                    <button onClick={() => setShowSearch(!showSearch)} className="h-7 w-7 rounded text-zinc-500 hover:text-zinc-200 hover:bg-[#2a2a40] transition-colors flex items-center justify-center cursor-pointer" title="Search comments">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
                    </button>
                    {/* Filter */}
                    <button onClick={() => setShowFilterMenu(!showFilterMenu)} className={`h-7 w-7 rounded transition-colors flex items-center justify-center cursor-pointer ${filter !== "all" ? "text-blue-400 bg-blue-500/15" : "text-zinc-500 hover:text-zinc-200 hover:bg-[#2a2a40]"}`} title="Filter comments">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" /></svg>
                    </button>
                    {/* Filter dropdown */}
                    {showFilterMenu && (
                        <div className="absolute top-full right-0 mt-1 bg-[#1e1e32] border border-[#3a3a55] rounded-lg shadow-2xl py-1 min-w-[120px] z-50">
                            {(["all", "open", "resolved"] as FilterType[]).map((f) => (
                                <button
                                    key={f}
                                    onClick={() => { setFilter(f); setShowFilterMenu(false); }}
                                    className={`w-full text-left px-3 py-1.5 text-[12px] transition-colors cursor-pointer ${filter === f ? "text-blue-400 bg-blue-500/10" : "text-zinc-400 hover:bg-[#2a2a40]"}`}
                                >
                                    {f === "all" ? `All (${rootComments.length})` : f === "open" ? `Open (${openCount})` : `Resolved (${resolvedCount})`}
                                </button>
                            ))}
                        </div>
                    )}
                    {/* Sort */}
                    <button onClick={() => setShowSortMenu(!showSortMenu)} className={`h-7 w-7 rounded transition-colors flex items-center justify-center cursor-pointer ${sortBy !== "date" ? "text-emerald-400 bg-emerald-500/15" : "text-zinc-500 hover:text-zinc-200 hover:bg-[#2a2a40]"}`} title="Sort comments">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5L7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5" /></svg>
                    </button>
                    {showSortMenu && (
                        <div className="absolute top-full right-0 mt-1 bg-[#1e1e32] border border-[#3a3a55] rounded-lg shadow-2xl py-1 min-w-[120px] z-50">
                            {([{ key: "date", label: "Date" }, { key: "status", label: "Status" }, { key: "author", label: "Author" }] as const).map((s) => (
                                <button
                                    key={s.key}
                                    onClick={() => { setSortBy(s.key); setShowSortMenu(false); }}
                                    className={`w-full text-left px-3 py-1.5 text-[12px] transition-colors cursor-pointer ${sortBy === s.key ? "text-emerald-400 bg-emerald-500/10" : "text-zinc-400 hover:bg-[#2a2a40]"}`}
                                >
                                    {s.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Search bar (toggle) */}
            {showSearch && (
                <div className="px-4 py-2 border-b border-[#2a2a40]">
                    <input
                        autoFocus
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search comments..."
                        className="w-full bg-[#1e1e32] border border-[#3a3a55] rounded-lg px-3 py-2 text-[12px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/50"
                    />
                </div>
            )}

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
