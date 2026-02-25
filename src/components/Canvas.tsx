"use client";

import { useEditorStore } from "@/store/editorStore";
import { CONTAINER_TYPES, ElementNode } from "@/types";
import Renderer from "./Renderer";
import ContextMenu from "./ContextMenu";
import { useDroppable } from "@dnd-kit/core";
import { useRef, useState, useCallback } from "react";
import { Monitor, Tablet, Smartphone, Globe, Lock } from "lucide-react";

const ZOOM_LEVELS = [50, 75, 100, 125, 150];

const RESOLUTION_PRESETS = [
    { label: "Desktop", width: 1280, icon: <Monitor size={14} /> },
    { label: "Tablet", width: 768, icon: <Tablet size={14} /> },
    { label: "Mobile", width: 375, icon: <Smartphone size={14} /> },
];

const findParentId = (
    nodes: ElementNode[],
    targetId: string,
    parentId: string | null = null
): string | null | undefined => {
    for (const node of nodes) {
        if (node.id === targetId) return parentId;
        const childParentId = findParentId(node.children, targetId, node.id);
        if (childParentId !== undefined) return childParentId;
    }
    return undefined;
};

const Canvas: React.FC = () => {
    const {
        elements,
        globalElements,
        selectElement,
        updateElement,
        updateElementPosition,
        updateElementSize,
        moveElement,
        pages,
        activePageId,
        canvasSettings,
        updateCanvasSettings,
    } = useEditorStore();
    const [zoom, setZoom] = useState(100);
    const canvasPageRef = useRef<HTMLDivElement>(null);

    // Context menu state
    const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; elementId: string } | null>(null);

    const activePage = pages.find((p) => p.id === activePageId);
    const activePageTitle = activePage?.title || "Home";
    const activePageRoute = activePage?.route || "/";

    const canvasWidth = Math.max(320, Number(canvasSettings.width) || 1280);
    const canvasHeight = Math.max(200, Number(canvasSettings.height) || 900);
    const activeRes = RESOLUTION_PRESETS.find((r) => r.width === canvasWidth);
    const canvasBackground = String(canvasSettings.backgroundColor || "#ffffff");
    const canvasHasGradient = /gradient\(/i.test(canvasBackground);

    // Drag state for moving elements
    const dragState = useRef<{
        dragging: boolean;
        resizing: boolean;
        elementId: string;
        startX: number;
        startY: number;
        startElX: number;
        startElY: number;
        startElW: number;
        startElH: number;
        handle: string;
        parentContainerId: string | null;
    } | null>(null);

    const { setNodeRef, isOver } = useDroppable({
        id: "canvas-root",
        data: { type: "canvas", parentId: null },
    });

    const setRefs = useCallback((node: HTMLDivElement | null) => {
        setNodeRef(node);
        (canvasPageRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
    }, [setNodeRef]);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (ctxMenu) setCtxMenu(null);

        const target = e.target as HTMLElement;
        const resizeHandle = target.closest("[data-resize-handle]") as HTMLElement | null;
        const elementWrapper = target.closest("[data-element-id]") as HTMLElement | null;

        if (resizeHandle && elementWrapper) {
            e.preventDefault();
            e.stopPropagation();
            const elId = elementWrapper.getAttribute("data-element-id")!;
            const handle = resizeHandle.getAttribute("data-resize-handle")!;
            const el = useEditorStore.getState().getElement(elId);
            if (!el || el.locked) return;

            dragState.current = {
                dragging: false,
                resizing: true,
                elementId: elId,
                startX: e.clientX,
                startY: e.clientY,
                startElX: el.x,
                startElY: el.y,
                startElW: el.w,
                startElH: el.h,
                handle,
                parentContainerId: null,
            };
            return;
        }

        if (elementWrapper) {
            e.stopPropagation();
            const elId = elementWrapper.getAttribute("data-element-id")!;
            const el = useEditorStore.getState().getElement(elId);
            if (!el || el.locked) return;

            selectElement(elId);
            const parentWrapper = elementWrapper.parentElement?.closest("[data-element-id]") as HTMLElement | null;
            const parentId = parentWrapper?.getAttribute("data-element-id") || null;
            const parentEl = parentId ? useEditorStore.getState().getElement(parentId) : undefined;
            const parentContainerId = parentEl?.type === "container" ? parentId : null;
            const rawPosition = String(el.styles.position || "");
            const isStaticPosition = !rawPosition || rawPosition === "static";
            if (parentContainerId && isStaticPosition) {
                updateElement(el.id, {
                    styles: {
                        ...el.styles,
                        position: "absolute",
                    },
                });
            }

            dragState.current = {
                dragging: true,
                resizing: false,
                elementId: elId,
                startX: e.clientX,
                startY: e.clientY,
                startElX: el.x,
                startElY: el.y,
                startElW: el.w,
                startElH: el.h,
                handle: "",
                parentContainerId,
            };
        }
    }, [selectElement, ctxMenu, updateElement]);

    const handleContextMenu = useCallback((e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        const elementWrapper = target.closest("[data-element-id]") as HTMLElement | null;
        if (elementWrapper) {
            e.preventDefault();
            e.stopPropagation();
            const elId = elementWrapper.getAttribute("data-element-id")!;
            selectElement(elId);
            setCtxMenu({ x: e.clientX, y: e.clientY, elementId: elId });
        }
    }, [selectElement]);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (!dragState.current) return;
        const ds = dragState.current;
        const scale = zoom / 100;
        const dx = (e.clientX - ds.startX) / scale;
        const dy = (e.clientY - ds.startY) / scale;

        if (ds.dragging) {
            if (ds.parentContainerId) {
                const parentEl = useEditorStore.getState().getElement(ds.parentContainerId);
                if (!parentEl || parentEl.type !== "container") {
                    dragState.current = { ...ds, parentContainerId: null };
                    return;
                }

                const maxX = Math.max(0, parentEl.w - ds.startElW);
                const maxY = Math.max(0, parentEl.h - ds.startElH);
                const rawX = ds.startElX + dx;
                const rawY = ds.startElY + dy;
                const overflowLeft = Math.max(0, -rawX);
                const overflowRight = Math.max(0, rawX - maxX);
                const overflowTop = Math.max(0, -rawY);
                const overflowBottom = Math.max(0, rawY - maxY);
                const maxOverflow = Math.max(overflowLeft, overflowRight, overflowTop, overflowBottom);
                const detachThreshold = 48;
                const resistance = 0.28;

                if (maxOverflow > detachThreshold) {
                    const canvasNode = document.querySelector(".canvas-page") as HTMLElement | null;
                    const draggedNode = document.querySelector(`[data-element-id="${ds.elementId}"]`) as HTMLElement | null;
                    if (canvasNode && draggedNode) {
                        const canvasRect = canvasNode.getBoundingClientRect();
                        const draggedRect = draggedNode.getBoundingClientRect();
                        const detachedX = Math.max(0, (draggedRect.left - canvasRect.left) / scale);
                        const detachedY = Math.max(0, (draggedRect.top - canvasRect.top) / scale);
                        moveElement(ds.elementId, null, useEditorStore.getState().elements.length);
                        updateElementPosition(ds.elementId, detachedX, detachedY);
                        dragState.current = {
                            ...ds,
                            parentContainerId: null,
                            startX: e.clientX,
                            startY: e.clientY,
                            startElX: detachedX,
                            startElY: detachedY,
                        };
                        return;
                    }
                }

                let newX = rawX;
                let newY = rawY;
                if (rawX < 0) newX = -overflowLeft * resistance;
                if (rawX > maxX) newX = maxX + overflowRight * resistance;
                if (rawY < 0) newY = -overflowTop * resistance;
                if (rawY > maxY) newY = maxY + overflowBottom * resistance;
                updateElementPosition(ds.elementId, newX, newY);
                return;
            }

            const newX = Math.max(0, ds.startElX + dx);
            const newY = Math.max(0, ds.startElY + dy);
            updateElementPosition(ds.elementId, newX, newY);
        } else if (ds.resizing) {
            const handle = ds.handle;
            let newX = ds.startElX;
            let newY = ds.startElY;
            let newW = ds.startElW;
            let newH = ds.startElH;

            if (handle.includes("e")) newW = Math.max(40, ds.startElW + dx);
            if (handle.includes("s")) newH = Math.max(20, ds.startElH + dy);
            if (handle.includes("w")) {
                newW = Math.max(40, ds.startElW - dx);
                newX = ds.startElX + (ds.startElW - newW);
            }
            if (handle.includes("n")) {
                newH = Math.max(20, ds.startElH - dy);
                newY = ds.startElY + (ds.startElH - newH);
            }

            updateElementPosition(ds.elementId, newX, newY);
            updateElementSize(ds.elementId, newW, newH);
        }
    }, [zoom, moveElement, updateElementPosition, updateElementSize]);

    const handleMouseUp = useCallback((e?: React.MouseEvent) => {
        const ds = dragState.current;
        if (!ds) return;

        if (ds.dragging) {
            const state = useEditorStore.getState();
            const draggedEl = state.getElement(ds.elementId);
            const scale = zoom / 100;

            if (draggedEl) {
                let targetContainerId: string | null = null;
                if (e) {
                    const targetNode = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
                    let walkNode: HTMLElement | null = targetNode;
                    while (walkNode && !targetContainerId) {
                        const maybeId = walkNode.getAttribute("data-element-id");
                        if (maybeId && maybeId !== ds.elementId) {
                            const maybeEl = state.getElement(maybeId);
                            if (maybeEl && CONTAINER_TYPES.includes(maybeEl.type)) {
                                targetContainerId = maybeId;
                            }
                        }
                        walkNode = walkNode.parentElement;
                    }
                }

                const pageParentId = findParentId(state.elements, ds.elementId);
                if (pageParentId === undefined) {
                    dragState.current = null;
                    return;
                }
                const currentParentId = pageParentId;
                const currentParent = currentParentId ? state.getElement(currentParentId) : undefined;

                if (targetContainerId && targetContainerId !== currentParentId) {
                    const targetContainer = state.getElement(targetContainerId);
                    if (targetContainer) {
                        const targetIsDescendant = (() => {
                            const stack = [...draggedEl.children];
                            while (stack.length > 0) {
                                const node = stack.pop()!;
                                if (node.id === targetContainerId) return true;
                                stack.push(...node.children);
                            }
                            return false;
                        })();
                        if (!targetIsDescendant) {
                            let nextX = 0;
                            let nextY = 0;
                            const containerNode = document.querySelector(`[data-element-id="${targetContainerId}"]`) as HTMLElement | null;
                            const draggedNode = document.querySelector(`[data-element-id="${ds.elementId}"]`) as HTMLElement | null;
                            if (containerNode && draggedNode) {
                                const containerRect = containerNode.getBoundingClientRect();
                                const draggedRect = draggedNode.getBoundingClientRect();
                                const maxX = Math.max(0, targetContainer.w - draggedEl.w);
                                const maxY = Math.max(0, targetContainer.h - draggedEl.h);
                                const relX = (draggedRect.left - containerRect.left) / scale;
                                const relY = (draggedRect.top - containerRect.top) / scale;
                                nextX = Math.min(maxX, Math.max(0, relX));
                                nextY = Math.min(maxY, Math.max(0, relY));
                            }

                            moveElement(ds.elementId, targetContainerId, targetContainer.children.length);
                            const rawPosition = String(draggedEl.styles.position || "");
                            if (!rawPosition || rawPosition === "static") {
                                updateElement(ds.elementId, {
                                    styles: {
                                        ...draggedEl.styles,
                                        position: "absolute",
                                    },
                                });
                            }
                            updateElementPosition(ds.elementId, nextX, nextY);
                        }
                    }
                } else if (currentParent?.type === "container") {
                    const maxX = Math.max(0, currentParent.w - draggedEl.w);
                    const maxY = Math.max(0, currentParent.h - draggedEl.h);
                    const clampedX = Math.min(maxX, Math.max(0, draggedEl.x));
                    const clampedY = Math.min(maxY, Math.max(0, draggedEl.y));
                    if (clampedX !== draggedEl.x || clampedY !== draggedEl.y) {
                        updateElementPosition(ds.elementId, clampedX, clampedY);
                    }
                }
            }
        }

        dragState.current = null;
    }, [moveElement, updateElement, updateElementPosition, zoom]);

    return (
        <div className="canvas-area">
            {/* Top bar */}
            <div className="canvas-topbar">
                <div className="canvas-url-bar">
                    <span className="url-icon"><Lock size={12} /></span>
                    <span className="url-text">https://yoursite.com{activePageRoute}</span>
                    <span className="url-action">Connect Domain</span>
                </div>
                <div className="canvas-topbar-right">
                    <span className="page-label">{activePageTitle}</span>
                </div>
            </div>

            {/* Workspace */}
            <div
                className="canvas-workspace"
                onClick={() => { selectElement(null); setCtxMenu(null); }}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onContextMenu={handleContextMenu}
            >
                <div
                    ref={setRefs}
                    className={`canvas-page ${isOver ? "canvas-page-over" : ""}`}
                    style={{
                        width: `${canvasWidth}px`,
                        maxWidth: `${canvasWidth}px`,
                        minHeight: `${canvasHeight}px`,
                        transform: `scale(${zoom / 100})`,
                        transformOrigin: "top center",
                        background: canvasBackground,
                        backgroundColor: canvasHasGradient ? undefined : canvasBackground,
                    }}
                    onMouseDown={handleMouseDown}
                    onClick={(e) => {
                        if (e.target === e.currentTarget) selectElement(null);
                    }}
                >
                    {/* Global elements — rendered on top of every page */}
                    {globalElements.length > 0 && (
                        <div className="canvas-global-zone canvas-global-top">
                            <div className="global-zone-label">
                                <Globe size={10} />
                                <span>Global</span>
                            </div>
                            <Renderer elements={globalElements} parentId={null} isRoot={false} />
                        </div>
                    )}

                    {/* Page elements */}
                    {elements.length === 0 && globalElements.length === 0 ? (
                        <div className="canvas-empty-state">
                            <div className="empty-icon">
                                <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                                    <rect x="6" y="6" width="36" height="36" rx="4" stroke="#d1d5db" strokeWidth="2" strokeDasharray="4 4" />
                                    <path d="M24 16v16M16 24h16" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" />
                                </svg>
                            </div>
                            <h3>Start Building</h3>
                            <p>Drag elements from the sidebar or double-click to add</p>
                        </div>
                    ) : (
                        <Renderer elements={elements} parentId={null} isRoot={true} />
                    )}
                </div>

                {/* Context Menu */}
                {ctxMenu && (
                    <ContextMenu
                        x={ctxMenu.x}
                        y={ctxMenu.y}
                        elementId={ctxMenu.elementId}
                        onClose={() => setCtxMenu(null)}
                    />
                )}
            </div>

            {/* Bottom bar: resolution + zoom */}
            <div className="canvas-zoom-bar">
                <div className="resolution-controls">
                    {RESOLUTION_PRESETS.map((preset) => (
                        <button
                            key={preset.label}
                            className={`resolution-btn ${canvasWidth === preset.width ? "resolution-active" : ""}`}
                            onClick={() => updateCanvasSettings({ width: preset.width })}
                            title={`${preset.label} (${preset.width}px)`}
                        >
                            {preset.icon}
                        </button>
                    ))}
                    <span className="resolution-label">
                        {activeRes?.label || "Custom"} • {canvasWidth}px
                    </span>
                </div>
                <div className="zoom-controls">
                    <button onClick={() => setZoom((z) => Math.max(50, z - 25))} className="zoom-btn">−</button>
                    <select value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="zoom-select">
                        {ZOOM_LEVELS.map((z) => (
                            <option key={z} value={z}>{z}%</option>
                        ))}
                    </select>
                    <button onClick={() => setZoom((z) => Math.min(150, z + 25))} className="zoom-btn">+</button>
                </div>
            </div>
        </div>
    );
};

export default Canvas;
