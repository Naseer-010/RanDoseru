"use client";

import React, { useEffect, useState } from "react";
import { useBackendStore } from "@/store/backendStore";
import ServiceContainerComponent from "./ServiceContainer";
import { Plus, Zap } from "lucide-react";

const BackendCanvas: React.FC = () => {
    const { services, connections, addService, selectService, selectBlock } = useBackendStore();
    const [connectionPaths, setConnectionPaths] = useState<
        { id: string; d: string; label: string; x: number; y: number }[]
    >([]);

    const handleCanvasClick = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).classList.contains("backend-canvas-area")) {
            selectService(null);
            selectBlock(null);
        }
    };

    useEffect(() => {
        const computePaths = () => {
            const canvas = document.querySelector(".backend-canvas-area") as HTMLElement | null;
            if (!canvas) return;
            const canvasRect = canvas.getBoundingClientRect();
            const next = connections
                .map((conn) => {
                    const fromEl = document.getElementById(`service-${conn.fromServiceId}`);
                    const toEl = document.getElementById(`service-${conn.toServiceId}`);
                    if (!fromEl || !toEl) return null;
                    const fromRect = fromEl.getBoundingClientRect();
                    const toRect = toEl.getBoundingClientRect();
                    const x1 = fromRect.right - canvasRect.left;
                    const y1 = fromRect.top + fromRect.height / 2 - canvasRect.top;
                    const x2 = toRect.left - canvasRect.left;
                    const y2 = toRect.top + toRect.height / 2 - canvasRect.top;
                    const d = `M ${x1} ${y1} C ${x1 + 60} ${y1}, ${x2 - 60} ${y2}, ${x2} ${y2}`;
                    return {
                        id: conn.id,
                        d,
                        label: conn.label,
                        x: (x1 + x2) / 2,
                        y: (y1 + y2) / 2 - 8,
                    };
                })
                .filter((v): v is { id: string; d: string; label: string; x: number; y: number } => Boolean(v));
            setConnectionPaths(next);
        };

        const rafId = requestAnimationFrame(computePaths);
        const handleResize = () => requestAnimationFrame(computePaths);
        const canvas = document.querySelector(".backend-canvas-area");
        window.addEventListener("resize", handleResize);
        canvas?.addEventListener("scroll", handleResize);

        return () => {
            cancelAnimationFrame(rafId);
            window.removeEventListener("resize", handleResize);
            canvas?.removeEventListener("scroll", handleResize);
        };
    }, [connections, services.length]);

    return (
        <div className="backend-canvas">
            {/* Top bar */}
            <div className="backend-topbar">
                <div className="backend-topbar-left">
                    <Zap size={14} />
                    <span>Backend Services</span>
                    <span className="backend-service-count">{services.length} service{services.length !== 1 ? "s" : ""}</span>
                </div>
                <div className="backend-topbar-right">
                    <button className="backend-add-service-btn" onClick={() => addService()}>
                        <Plus size={14} />
                        Add Service
                    </button>
                </div>
            </div>

            {/* Canvas area */}
            <div className="backend-canvas-area" onClick={handleCanvasClick}>
                {services.length === 0 ? (
                    <div className="backend-empty-state">
                        <div className="backend-empty-icon">
                            <Zap size={48} strokeWidth={1} />
                        </div>
                        <h3>No Backend Services Yet</h3>
                        <p>Create your first service container to start building your backend</p>
                        <button className="backend-empty-cta" onClick={() => addService()}>
                            <Plus size={16} />
                            Create Service
                        </button>
                    </div>
                ) : (
                    <div className="backend-services-grid">
                        {services.map((service) => (
                            <ServiceContainerComponent key={service.id} service={service} />
                        ))}
                    </div>
                )}
            </div>

            {/* Connection lines (SVG overlay) */}
            {connectionPaths.length > 0 && (
                <svg className="backend-connections-svg">
                    {connectionPaths.map((conn) => (
                        <g key={conn.id}>
                            <path
                                d={conn.d}
                                fill="none"
                                stroke="var(--accent)"
                                strokeWidth="2"
                                strokeDasharray="6 3"
                                opacity="0.6"
                            />
                            <text
                                x={conn.x}
                                y={conn.y}
                                fill="var(--text-3)"
                                fontSize="11"
                                textAnchor="middle"
                            >
                                {conn.label}
                            </text>
                        </g>
                    ))}
                </svg>
            )}
        </div>
    );
};

export default BackendCanvas;
