"use client";

import { useEditorStore } from "@/store/editorStore";
import { CONTAINER_TYPES, ElementNode } from "@/types";
import { useRef, useState, useCallback, useMemo } from "react";
import { useShallow } from "zustand/shallow";
import {
    Layers, Type, Image, Square, Columns2, AlignJustify,
    MousePointerClick, PlayCircle, LayoutGrid, FileText,
    PenLine, Diamond, Minus, Menu, RotateCcw, Code2,
    Star, ArrowUpDown, Smartphone, ChevronDown, LayoutList,
    Eye, EyeOff, Lock, Unlock, GripVertical, Globe
} from "lucide-react";

const TYPE_ICON_MAP: Record<string, React.ReactNode> = {
    section: <AlignJustify size={14} />,
    container: <Square size={14} />,
    columns: <Columns2 size={14} />,
    stack: <Layers size={14} />,
    title: <Type size={14} strokeWidth={2.5} />,
    text: <Type size={14} />,
    paragraph: <FileText size={14} />,
    button: <MousePointerClick size={14} />,
    image: <Image size={14} />,
    video: <PlayCircle size={14} />,
    gallery: <LayoutGrid size={14} />,
    form: <FileText size={14} />,
    input: <PenLine size={14} />,
    shape: <Diamond size={14} />,
    divider: <Minus size={14} />,
    menu: <Menu size={14} />,
    repeater: <RotateCcw size={14} />,
    frame: <Code2 size={14} />,
    icon: <Star size={14} />,
    spacer: <ArrowUpDown size={14} />,
    socialbar: <Smartphone size={14} />,
    accordion: <ChevronDown size={14} />,
    tabs: <LayoutList size={14} />,
    global: <Globe size={14} />,
    page: <Layers size={14} />,
};

type Scope = "page" | "global";

type DropPosition = "before" | "after" | "inside";

interface DragState {
    elementId: string;
    parentId: string | null;
    index: number;
    scope: Scope;
}

interface DropIndicator {
    scope: Scope;
    position: DropPosition;
    parentId: string | null;
    index: number;
    depth: number;
    targetId: string | null;
}

interface FlatNode {
    id: string;
    parentId: string | null;
    index: number;
    depth: number;
    element: ElementNode;
}

interface LayerItemProps {
    element: ElementNode;
    depth: number;
    index: number;
    parentId: string | null;
    scope: Scope;
    onDragStart: (elementId: string, parentId: string | null, index: number, scope: Scope) => void;
    dropIndicator: DropIndicator | null;
}

const LayerItem: React.FC<LayerItemProps> = ({ element, depth, index, parentId, scope, onDragStart, dropIndicator }) => {
    const isSelected = useEditorStore((state) =>
        state.selectedElementId === element.id || state.selectedElementIds.includes(element.id)
    );
    const selectElement = useEditorStore((state) => state.selectElement);
    const toggleSelectElement = useEditorStore((state) => state.toggleSelectElement);
    const toggleVisibility = useEditorStore((state) => state.toggleVisibility);
    const toggleLock = useEditorStore((state) => state.toggleLock);

    const showDropBefore = Boolean(dropIndicator &&
        dropIndicator.scope === scope &&
        dropIndicator.position === "before" &&
        dropIndicator.targetId === element.id);

    const showDropAfter = Boolean(dropIndicator &&
        dropIndicator.scope === scope &&
        dropIndicator.position === "after" &&
        dropIndicator.targetId === element.id);

    const showDropInside = Boolean(dropIndicator &&
        dropIndicator.scope === scope &&
        dropIndicator.position === "inside" &&
        dropIndicator.targetId === element.id);

    return (
        <>
            {showDropBefore && <div className="layer-drop-indicator" style={{ marginLeft: `${12 + depth * 16}px` }} />}
            <div
                className={`layer-item ${isSelected ? "layer-selected" : ""} ${!element.visible ? "layer-hidden" : ""} ${showDropInside ? "layer-drop-inside" : ""}`}
                style={{ paddingLeft: `${12 + depth * 16}px` }}
                data-element-id={element.id}
                data-parent-id={parentId || ""}
                data-scope={scope}
                onClick={(e) => {
                    if (e.shiftKey) toggleSelectElement(element.id);
                    else selectElement(element.id);
                }}
            >
                <div
                    className="layer-grip"
                    onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onDragStart(element.id, parentId, index, scope);
                    }}
                    title="Drag to reorder"
                >
                    <GripVertical size={12} />
                </div>
                <span className="layer-icon">{TYPE_ICON_MAP[element.type] || <Square size={14} />}</span>
                <span className="layer-name">{element.label || element.type}</span>
                <div className="layer-actions">
                    <button
                        className={`layer-action-btn ${!element.visible ? "toggled" : ""}`}
                        onClick={(e) => { e.stopPropagation(); toggleVisibility(element.id); }}
                        title={element.visible ? "Hide" : "Show"}
                    >
                        {element.visible ? <Eye size={13} /> : <EyeOff size={13} />}
                    </button>
                    <button
                        className={`layer-action-btn ${element.locked ? "toggled" : ""}`}
                        onClick={(e) => { e.stopPropagation(); toggleLock(element.id); }}
                        title={element.locked ? "Unlock" : "Lock"}
                    >
                        {element.locked ? <Lock size={13} /> : <Unlock size={13} />}
                    </button>
                </div>
            </div>
            {showDropAfter && <div className="layer-drop-indicator" style={{ marginLeft: `${12 + depth * 16}px` }} />}
            {element.children.map((child, ci) => (
                <LayerItem
                    key={child.id}
                    element={child}
                    depth={depth + 1}
                    index={ci}
                    parentId={element.id}
                    scope={scope}
                    onDragStart={onDragStart}
                    dropIndicator={dropIndicator}
                />
            ))}
        </>
    );
};

interface LayerTreeProps {
    title: string;
    scope: Scope;
    elements: ElementNode[];
    dropIndicator: DropIndicator | null;
    onDragStart: (elementId: string, parentId: string | null, index: number, scope: Scope) => void;
    setListRef: (scope: Scope) => (node: HTMLDivElement | null) => void;
}

const LayerTree: React.FC<LayerTreeProps> = ({ title, scope, elements, dropIndicator, onDragStart, setListRef }) => {
    const total = useMemo(() => {
        const count = (els: ElementNode[]): number => els.reduce((sum, el) => sum + 1 + count(el.children), 0);
        return count(elements);
    }, [elements]);

    return (
        <div className="layers-section">
            <div className="layers-section-header">
                <div className="layers-section-title">
                    <span className="layer-icon">{TYPE_ICON_MAP[scope] || <Square size={14} />}</span>
                    <span>{title}</span>
                </div>
                <span className="layers-section-count">{total}</span>
            </div>
            <div className="layers-tree" ref={setListRef(scope)}>
                {elements.length === 0 ? (
                    <div className="layers-empty">
                        <span>No {title.toLowerCase()} elements</span>
                        <span>{scope === "global" ? "Add from Global panel" : "Drag elements from the sidebar"}</span>
                    </div>
                ) : (
                    elements.map((el, i) => (
                        <LayerItem
                            key={el.id}
                            element={el}
                            depth={0}
                            index={i}
                            parentId={null}
                            scope={scope}
                            onDragStart={onDragStart}
                            dropIndicator={dropIndicator}
                        />
                    ))
                )}
            </div>
        </div>
    );
};

const LayersPanel: React.FC = () => {
    const {
        elements,
        globalElements,
        reorderElements,
        reorderGlobalElements,
        moveElement,
        moveGlobalElement,
    } = useEditorStore(useShallow((state) => ({
        elements: state.elements,
        globalElements: state.globalElements,
        reorderElements: state.reorderElements,
        reorderGlobalElements: state.reorderGlobalElements,
        moveElement: state.moveElement,
        moveGlobalElement: state.moveGlobalElement,
    })));

    const [dropIndicator, setDropIndicator] = useState<DropIndicator | null>(null);
    const dragRef = useRef<DragState | null>(null);
    const dropRef = useRef<DropIndicator | null>(null);
    const listRefs = useRef<{ page: HTMLDivElement | null; global: HTMLDivElement | null }>({ page: null, global: null });

    const setListRef = useCallback((scope: Scope) => (node: HTMLDivElement | null) => {
        listRefs.current[scope] = node;
    }, []);

    const buildFlatList = useCallback((els: ElementNode[], parentId: string | null, depth: number, acc: FlatNode[]) => {
        els.forEach((el, i) => {
            acc.push({ id: el.id, parentId, index: i, depth, element: el });
            buildFlatList(el.children, el.id, depth + 1, acc);
        });
        return acc;
    }, []);

    const findNodeById = useCallback((nodes: ElementNode[], id: string): ElementNode | null => {
        for (const node of nodes) {
            if (node.id === id) return node;
            const found = findNodeById(node.children, id);
            if (found) return found;
        }
        return null;
    }, []);

    const containsId = useCallback((node: ElementNode, id: string): boolean => {
        if (node.id === id) return true;
        for (const child of node.children) {
            if (containsId(child, id)) return true;
        }
        return false;
    }, []);

    const getScopeElements = useCallback((scope: Scope, state: ReturnType<typeof useEditorStore.getState>) => {
        return scope === "global" ? state.globalElements : state.elements;
    }, []);

    const handleDragStart = useCallback((elementId: string, parentId: string | null, index: number, scope: Scope) => {
        dragRef.current = { elementId, parentId, index, scope };
        dropRef.current = null;

        const handleMouseMove = (e: MouseEvent) => {
            const src = dragRef.current;
            if (!src) return;
            const state = useEditorStore.getState();
            const currentElements = getScopeElements(src.scope, state);
            const flat = buildFlatList(currentElements, null, 0, []);
            const byId = new Map(flat.map((item) => [item.id, item]));

            const hovered = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
            const row = hovered?.closest(".layer-item") as HTMLElement | null;
            const rowScope = (row?.getAttribute("data-scope") as Scope | null) || null;

            const listEl = listRefs.current[src.scope];
            const listRect = listEl?.getBoundingClientRect();

            let indicator: DropIndicator | null = null;

            if (row && rowScope === src.scope) {
                const targetId = row.getAttribute("data-element-id");
                if (!targetId || targetId === src.elementId) {
                    setDropIndicator(null);
                    dropRef.current = null;
                    return;
                }
                const target = byId.get(targetId);
                if (!target) return;
                const rect = row.getBoundingClientRect();
                const midY = rect.top + rect.height / 2;
                const topZone = rect.top + rect.height * 0.25;
                const bottomZone = rect.bottom - rect.height * 0.25;

                const isContainer = CONTAINER_TYPES.includes(target.element.type);
                if (isContainer && e.clientY >= topZone && e.clientY <= bottomZone) {
                    const draggedNode = findNodeById(currentElements, src.elementId);
                    const invalidNest = src.elementId === target.id || (draggedNode ? containsId(draggedNode, target.id) : false);
                    if (!invalidNest) {
                        indicator = {
                            scope: src.scope,
                            position: "inside",
                            parentId: target.id,
                            index: target.element.children.length,
                            depth: target.depth + 1,
                            targetId: target.id,
                        };
                    }
                } else if (e.clientY < midY) {
                    indicator = {
                        scope: src.scope,
                        position: "before",
                        parentId: target.parentId,
                        index: target.index,
                        depth: target.depth,
                        targetId: target.id,
                    };
                } else {
                    indicator = {
                        scope: src.scope,
                        position: "after",
                        parentId: target.parentId,
                        index: target.index + 1,
                        depth: target.depth,
                        targetId: target.id,
                    };
                }

                if (indicator?.parentId) {
                    const draggedNode = findNodeById(currentElements, src.elementId);
                    if (draggedNode && containsId(draggedNode, indicator.parentId)) {
                        indicator = null;
                    }
                }
            } else if (listRect && e.clientY >= listRect.top && e.clientY <= listRect.bottom) {
                if (currentElements.length === 0) {
                    indicator = {
                        scope: src.scope,
                        position: "inside",
                        parentId: null,
                        index: 0,
                        depth: 0,
                        targetId: null,
                    };
                } else if (e.clientY < listRect.top + 6) {
                    indicator = {
                        scope: src.scope,
                        position: "before",
                        parentId: null,
                        index: 0,
                        depth: 0,
                        targetId: flat[0]?.id || null,
                    };
                } else if (e.clientY > listRect.bottom - 6) {
                    indicator = {
                        scope: src.scope,
                        position: "after",
                        parentId: null,
                        index: currentElements.length,
                        depth: 0,
                        targetId: flat[flat.length - 1]?.id || null,
                    };
                }
            }

            dropRef.current = indicator;
            setDropIndicator(indicator);
        };

        const handleMouseUp = () => {
            const src = dragRef.current;
            const drop = dropRef.current;

            if (src && drop && src.scope === drop.scope) {
                const state = useEditorStore.getState();
                const currentElements = getScopeElements(src.scope, state);
                const flat = buildFlatList(currentElements, null, 0, []);
                const current = flat.find((item) => item.id === src.elementId);
                if (!current) {
                    dragRef.current = null;
                    dropRef.current = null;
                    setDropIndicator(null);
                    document.body.style.userSelect = "";
                    document.removeEventListener("mousemove", handleMouseMove);
                    document.removeEventListener("mouseup", handleMouseUp);
                    return;
                }
                const parentId = drop.parentId;
                const isSameParent = parentId === current.parentId && drop.position !== "inside";

                if (isSameParent) {
                    const adjustedIndex = drop.index > current.index ? drop.index - 1 : drop.index;
                    if (src.scope === "global") {
                        reorderGlobalElements(parentId, current.index, adjustedIndex);
                    } else {
                        reorderElements(parentId, current.index, adjustedIndex);
                    }
                } else {
                    const parentNode = parentId ? findNodeById(currentElements, parentId) : null;
                    const maxIndex = parentNode ? parentNode.children.length : currentElements.length;
                    const safeIndex = Math.max(0, Math.min(maxIndex, drop.index));

                    if (src.scope === "global") {
                        moveGlobalElement(src.elementId, parentId, safeIndex);
                    } else {
                        moveElement(src.elementId, parentId, safeIndex);
                    }
                }
            }

            dragRef.current = null;
            dropRef.current = null;
            setDropIndicator(null);
            document.body.style.userSelect = "";
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
        };

        document.body.style.userSelect = "none";
        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);
    }, [buildFlatList, containsId, findNodeById, getScopeElements, moveElement, moveGlobalElement, reorderElements, reorderGlobalElements]);

    const totalCount = useMemo(() => {
        const count = (els: ElementNode[]): number => els.reduce((sum, el) => sum + 1 + count(el.children), 0);
        return count(elements) + count(globalElements);
    }, [elements, globalElements]);

    return (
        <div className="layers-panel">
            <div className="layers-header">
                <span>Layers</span>
                <span className="layers-count">{totalCount}</span>
            </div>
            <div className="layers-list">
                {totalCount === 0 ? (
                    <div className="layers-empty">
                        <span>No elements</span>
                        <span>Drag elements from the sidebar</span>
                    </div>
                ) : (
                    <>
                        <LayerTree
                            title="Page"
                            scope="page"
                            elements={elements}
                            dropIndicator={dropIndicator}
                            onDragStart={handleDragStart}
                            setListRef={setListRef}
                        />
                        <LayerTree
                            title="Global"
                            scope="global"
                            elements={globalElements}
                            dropIndicator={dropIndicator}
                            onDragStart={handleDragStart}
                            setListRef={setListRef}
                        />
                    </>
                )}
            </div>
        </div>
    );
};

export default LayersPanel;
