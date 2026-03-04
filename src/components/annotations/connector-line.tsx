"use client";

import { useEffect, useState, useCallback } from "react";

interface ConnectorLineProps {
    activeCommentId: string | null;
    containerRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * Renders an SVG connector line from a shape annotation badge on the image
 * to the corresponding comment card in the sidebar.
 * The line starts at the EDGE of the badge (not its center) so the number
 * inside remains fully visible.
 */
export function ConnectorLine({ activeCommentId, containerRef }: ConnectorLineProps) {
    const [line, setLine] = useState<{ x1: number; y1: number; x2: number; y2: number; color: string } | null>(null);

    const updateLine = useCallback(() => {
        if (!activeCommentId || !containerRef.current) {
            setLine(null);
            return;
        }

        const root = containerRef.current;

        const badge = root.querySelector(`[data-shape-badge="${activeCommentId}"]`) as HTMLElement | null;
        const comment = root.querySelector(`#comment-${activeCommentId}`) as HTMLElement | null;

        if (!badge || !comment) {
            setLine(null);
            return;
        }

        const rootRect = root.getBoundingClientRect();
        const badgeRect = badge.getBoundingClientRect();
        const commentRect = comment.getBoundingClientRect();

        // Badge center
        const cx = badgeRect.left + badgeRect.width / 2 - rootRect.left;
        const cy = badgeRect.top + badgeRect.height / 2 - rootRect.top;

        // Comment left-center (edge of the sidebar)
        const tx = commentRect.left - rootRect.left;
        const ty = commentRect.top + commentRect.height / 2 - rootRect.top;

        // Distance from badge center to comment edge
        const dx = tx - cx;
        const dy = ty - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 1) {
            setLine(null);
            return;
        }

        // Unit vector from badge toward comment
        const ux = dx / dist;
        const uy = dy / dist;

        // Offset start point by badge radius + padding so line starts OUTSIDE the badge
        const badgeRadius = Math.max(badgeRect.width, badgeRect.height) / 2 + 4;
        const x1 = cx + ux * badgeRadius;
        const y1 = cy + uy * badgeRadius;

        const x2 = tx;
        const y2 = ty;

        // Get the shape color
        const badgeInner = badge.querySelector("div");
        const color = badgeInner?.style.backgroundColor || "#ef4444";

        setLine({ x1, y1, x2, y2, color });
    }, [activeCommentId, containerRef]);

    useEffect(() => {
        updateLine();

        const handleUpdate = () => requestAnimationFrame(updateLine);

        window.addEventListener("resize", handleUpdate);
        window.addEventListener("scroll", handleUpdate, true);

        const observer = new MutationObserver(handleUpdate);
        if (containerRef.current) {
            observer.observe(containerRef.current, { childList: true, subtree: true, attributes: true });
        }

        return () => {
            window.removeEventListener("resize", handleUpdate);
            window.removeEventListener("scroll", handleUpdate, true);
            observer.disconnect();
        };
    }, [updateLine, containerRef]);

    if (!line) return null;

    return (
        <svg
            className="absolute inset-0 pointer-events-none z-[5]"
            style={{ width: "100%", height: "100%", overflow: "visible" }}
        >
            <defs>
                <filter id="connector-glow">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>
            {/* Shadow line */}
            <line
                x1={line.x1}
                y1={line.y1}
                x2={line.x2}
                y2={line.y2}
                stroke={line.color}
                strokeWidth={1.5}
                strokeDasharray="6 4"
                opacity={0.3}
                filter="url(#connector-glow)"
            />
            {/* Main line */}
            <line
                x1={line.x1}
                y1={line.y1}
                x2={line.x2}
                y2={line.y2}
                stroke={line.color}
                strokeWidth={1.5}
                strokeDasharray="6 4"
                opacity={0.7}
            />
            {/* End dot at comment card */}
            <circle cx={line.x2} cy={line.y2} r={2.5} fill={line.color} opacity={0.7} />
        </svg>
    );
}
