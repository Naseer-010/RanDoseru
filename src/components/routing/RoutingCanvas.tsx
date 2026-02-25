"use client";

import React, { useRef, useCallback, useEffect, useState } from "react";
import { useRoutingStore } from "@/store/routingStore";
import { useEditorStore } from "@/store/editorStore";
import { useBackendStore } from "@/store/backendStore";
import RoutingNodeComponent from "./RoutingNode";
import ConnectionWire from "./ConnectionWire";
import { Plus, ZoomIn, ZoomOut, Maximize2, LayoutGrid } from "lucide-react";

const RoutingCanvas: React.FC = () => {
    const {
        nodes,
        connections,
        zoom,
        panX,
        panY,
        connectingFrom,
        mousePos,
        setZoom,
        setPan,
        zoomIn,
        zoomOut,
        resetView,
        cancelConnecting,
        updateMousePos,
        endConnecting,
        selectNode,
        selectConnection,
        autoLayoutNodes,
        getPortsForNode,
        addNode,
    } = useRoutingStore();

    const canvasRef = useRef<HTMLDivElement>(null);
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });
    const [spaceHeld, setSpaceHeld] = useState(false);

    // ─── Keyboard: space for pan mode ───
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.code === "Space" && !e.repeat) {
                e.preventDefault();
                setSpaceHeld(true);
            }
            if (e.code === "Escape") {
                cancelConnecting();
            }
        };
        const onKeyUp = (e: KeyboardEvent) => {
            if (e.code === "Space") {
                setSpaceHeld(false);
                setIsPanning(false);
            }
        };
        window.addEventListener("keydown", onKeyDown);
        window.addEventListener("keyup", onKeyUp);
        return () => {
            window.removeEventListener("keydown", onKeyDown);
            window.removeEventListener("keyup", onKeyUp);
        };
    }, [cancelConnecting]);

    // ─── Mouse wheel zoom ───
    const handleWheel = useCallback(
        (e: React.WheelEvent) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.08 : 0.08;
            const newZoom = Math.max(0.1, Math.min(3, zoom + delta));

            // Zoom toward cursor position
            if (canvasRef.current) {
                const rect = canvasRef.current.getBoundingClientRect();
                const mx = e.clientX - rect.left;
                const my = e.clientY - rect.top;
                const zoomRatio = newZoom / zoom;
                const newPanX = mx - (mx - panX) * zoomRatio;
                const newPanY = my - (my - panY) * zoomRatio;
                setPan(newPanX, newPanY);
            }
            setZoom(newZoom);
        },
        [zoom, panX, panY, setZoom, setPan]
    );

    // ─── Pan handlers ───
    const handleMouseDown = useCallback(
        (e: React.MouseEvent) => {
            // Middle button OR space+left button
            if (e.button === 1 || (spaceHeld && e.button === 0)) {
                e.preventDefault();
                setIsPanning(true);
                setPanStart({ x: e.clientX - panX, y: e.clientY - panY });
            }
        },
        [spaceHeld, panX, panY]
    );

    const handleMouseMove = useCallback(
        (e: React.MouseEvent) => {
            if (isPanning) {
                setPan(e.clientX - panStart.x, e.clientY - panStart.y);
            }
            // Track mouse for in-progress wiring
            if (connectingFrom && canvasRef.current) {
                const rect = canvasRef.current.getBoundingClientRect();
                updateMousePos(
                    (e.clientX - rect.left - panX) / zoom,
                    (e.clientY - rect.top - panY) / zoom
                );
            }
        },
        [isPanning, panStart, setPan, connectingFrom, panX, panY, zoom, updateMousePos]
    );

    const handleMouseUp = useCallback(
        (e: React.MouseEvent) => {
            if (isPanning) {
                setIsPanning(false);
            }
            // If wiring and clicking empty space, cancel
            if (connectingFrom && (e.target as HTMLElement).classList.contains("routing-canvas-transform")) {
                cancelConnecting();
            }
        },
        [isPanning, connectingFrom, cancelConnecting]
    );

    // Click empty canvas → deselect
    const handleCanvasClick = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).classList.contains("routing-canvas-transform")) {
            selectNode(null);
            selectConnection(null);
        }
    };

    // ─── Compute port positions for wires ───
    const getPortWorldPosition = useCallback(
        (portId: string): { x: number; y: number } | null => {
            for (const node of nodes) {
                const ports = getPortsForNode(node.id);
                const port = ports.find((p) => p.id === portId);
                if (port) {
                    return {
                        x: node.position.x + (port.portType === "output" ? node.width : 0),
                        y: node.position.y + (port.relativeY ?? 60),
                    };
                }
            }
            return null;
        },
        [nodes, getPortsForNode]
    );

    // Connecting-from port position for in-progress wire
    const connectingFromPos = connectingFrom
        ? getPortWorldPosition(connectingFrom.id)
        : null;

    // Drop handler for pages/services
    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            const data = e.dataTransfer.getData("text/plain");
            if (!data) return;

            try {
                const parsed = JSON.parse(data);
                if (parsed.routingType && parsed.refId) {
                    if (canvasRef.current) {
                        const rect = canvasRef.current.getBoundingClientRect();
                        const x = (e.clientX - rect.left - panX) / zoom;
                        const y = (e.clientY - rect.top - panY) / zoom;
                        addNode(parsed.routingType, parsed.refId, x, y);
                    }
                }
            } catch {
                // ignore non-JSON drops
            }
        },
        [addNode, panX, panY, zoom]
    );

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
    };

    const gridSize = 20;

    return (
        <div
            className={`routing-canvas ${spaceHeld ? "routing-panning" : ""}`}
            ref={canvasRef}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onClick={handleCanvasClick}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
        >
            {/* Zoom controls */}
            <div className="routing-zoom-controls">
                <button className="routing-zoom-btn" onClick={zoomOut} title="Zoom out">
                    <ZoomOut size={14} />
                </button>
                <span className="routing-zoom-level">{Math.round(zoom * 100)}%</span>
                <button className="routing-zoom-btn" onClick={zoomIn} title="Zoom in">
                    <ZoomIn size={14} />
                </button>
                <div className="routing-zoom-divider" />
                <button className="routing-zoom-btn" onClick={resetView} title="Reset view">
                    <Maximize2 size={14} />
                </button>
                <button className="routing-zoom-btn" onClick={autoLayoutNodes} title="Auto layout">
                    <LayoutGrid size={14} />
                </button>
            </div>

            {/* Top bar */}
            <div className="routing-topbar">
                <h2>Routing Canvas</h2>
                <span className="routing-stats">
                    {nodes.length} nodes · {connections.length} connections
                </span>
            </div>

            {/* Infinite canvas area */}
            <div
                className="routing-canvas-transform"
                style={{
                    transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
                    transformOrigin: "0 0",
                    backgroundSize: `${gridSize}px ${gridSize}px`,
                    backgroundPosition: `${panX % gridSize}px ${panY % gridSize}px`,
                }}
            >
                {/* Nodes */}
                {nodes.map((node) => (
                    <RoutingNodeComponent key={node.id} node={node} />
                ))}

                {/* SVG overlay for connections */}
                <svg className="routing-connections-svg">
                    {/* Completed connections */}
                    {connections.map((conn) => {
                        const fromPos = getPortWorldPosition(conn.fromPortId);
                        const toPos = getPortWorldPosition(conn.toPortId);
                        if (!fromPos || !toPos) return null;
                        return (
                            <ConnectionWire
                                key={conn.id}
                                connection={conn}
                                fromPos={fromPos}
                                toPos={toPos}
                            />
                        );
                    })}

                    {/* In-progress wire */}
                    {connectingFrom && connectingFromPos && (
                        <path
                            d={`M ${connectingFromPos.x} ${connectingFromPos.y} C ${connectingFromPos.x + 80} ${connectingFromPos.y}, ${mousePos.x - 80} ${mousePos.y}, ${mousePos.x} ${mousePos.y}`}
                            fill="none"
                            stroke="var(--accent)"
                            strokeWidth="2"
                            strokeDasharray="8 4"
                            opacity="0.8"
                            className="routing-wire-active"
                        />
                    )}
                </svg>
            </div>

            {/* Empty state */}
            {nodes.length === 0 && (
                <div className="routing-empty-state">
                    <Plus size={32} />
                    <p>Drop pages & services here</p>
                    <span>
                        Drag pages from the left panel and services from the right panel to start wiring your application flow.
                    </span>
                </div>
            )}
        </div>
    );
};

export default RoutingCanvas;
