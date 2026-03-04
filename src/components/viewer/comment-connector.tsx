"use client";

import { useEffect, useState } from "react";

interface CommentConnectorProps {
    sourceId: string | null;
    targetId: string | null;
    color?: string;
}

export function CommentConnector({ sourceId, targetId, color = "#10b981" }: CommentConnectorProps) {
    const [path, setPath] = useState<string>("");
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (!sourceId || !targetId) {
            setVisible(false);
            return;
        }

        const updatePath = () => {
            const sourceEl = document.getElementById(sourceId);
            const targetEl = document.getElementById(targetId);

            if (!sourceEl || !targetEl) {
                setVisible(false);
                return;
            }

            const sourceRect = sourceEl.getBoundingClientRect();
            const targetRect = targetEl.getBoundingClientRect();

            // Source point: right edge (middle vertically) of the annotation
            const startX = sourceRect.right;
            const startY = sourceRect.top + sourceRect.height / 2;

            // Target point: left edge (middle vertically) of the comment card
            const endX = targetRect.left;
            const endY = targetRect.top + targetRect.height / 2;

            // If the target is somehow to the left of the source, adjust start/end
            const sX = startX < endX ? startX : sourceRect.left;
            const eX = startX < endX ? endX : targetRect.right;

            // Cubic bezier curve points
            // Adjust control points to make a smooth S-curve horizontally
            const dx = Math.abs(eX - sX);
            const cp1x = sX + dx * 0.4;
            const cp1y = startY;
            const cp2x = eX - dx * 0.4;
            const cp2y = endY;

            setPath(`M ${sX} ${startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${eX} ${endY}`);
            setVisible(true);
        };

        // Update on mount
        updatePath();

        // Update on window resize or scroll
        window.addEventListener("resize", updatePath);
        // We can't easily listen to scroll events on specific containers from here globally,
        // so we use a very fast interval or requestAnimationFrame when visible.
        let rafId: number;
        const loop = () => {
            updatePath();
            rafId = requestAnimationFrame(loop);
        };
        rafId = requestAnimationFrame(loop);

        return () => {
            window.removeEventListener("resize", updatePath);
            cancelAnimationFrame(rafId);
        };
    }, [sourceId, targetId]);

    if (!visible) return null;

    return (
        <svg
            className="fixed inset-0 pointer-events-none z-50 w-full h-full"
            style={{ width: "100vw", height: "100vh" }}
        >
            <path
                d={path}
                fill="none"
                stroke={color}
                strokeWidth="2"
                strokeDasharray="4 4"
                className="animate-pulse"
                style={{ opacity: 0.6 }}
            />
        </svg>
    );
}
