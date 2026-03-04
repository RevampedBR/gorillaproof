"use client";

import { useEffect, useRef, useState } from "react";

interface CommentConnectorProps {
    activeId: string | null;
}

export function CommentConnector({ activeId }: CommentConnectorProps) {
    const svgRef = useRef<SVGSVGElement>(null);
    const pathRef = useRef<SVGPathElement>(null);
    const requestRef = useRef<number | null>(null);

    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    const updateLine = () => {
        if (!activeId || !svgRef.current || !pathRef.current) return;

        // Try to find the shape first, then fallback to pin
        const sourceEl = document.getElementById(`shape-${activeId}`) || document.getElementById(`pin-${activeId}`);
        const targetEl = document.getElementById(`comment-${activeId}`);

        if (sourceEl && targetEl) {
            const svgRect = svgRef.current.getBoundingClientRect();
            const sourceRect = sourceEl.getBoundingClientRect();
            const targetRect = targetEl.getBoundingClientRect();

            // Source point (right side of the shape/pin if it's on the left of sidebar, or center)
            const x1 = sourceRect.right - svgRect.left;
            const y1 = sourceRect.top + sourceRect.height / 2 - svgRect.top;

            // Target point (left side of the comment card)
            const x2 = targetRect.left - svgRect.left;
            const y2 = targetRect.top + targetRect.height / 2 - svgRect.top;

            // Only draw if the target (sidebar comment) is visible on screen
            // or we might want to let it point to the edge.
            // Let's just draw the bezier curve.

            // Control points for a horizontal S-curve
            const offset = Math.max(Math.abs(x2 - x1) / 2, 50);
            const cx1 = x1 + offset;
            const cy1 = y1;
            const cx2 = x2 - offset;
            const cy2 = y2;

            const pathData = `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;

            pathRef.current.setAttribute("d", pathData);
            pathRef.current.style.opacity = "1";
        } else {
            pathRef.current.style.opacity = "0";
        }

        requestRef.current = requestAnimationFrame(updateLine);
    };

    useEffect(() => {
        if (!activeId) {
            if (pathRef.current) pathRef.current.style.opacity = "0";
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
            return;
        }

        requestRef.current = requestAnimationFrame(updateLine);

        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [activeId]);

    if (!isClient) return null;

    return (
        <svg
            ref={svgRef}
            className="fixed inset-0 pointer-events-none z-40 w-full h-full"
            style={{ width: "100vw", height: "100vh" }}
        >
            <path
                ref={pathRef}
                fill="none"
                stroke="#34d399" // emerald-400
                strokeWidth="2"
                strokeDasharray="4 4"
                className="transition-opacity duration-200"
                style={{ opacity: 0 }}
            />
            {/* We could also add a small circle at the end of the line */}
        </svg>
    );
}
