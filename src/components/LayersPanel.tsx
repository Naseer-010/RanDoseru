"use client";

import { useEditorStore } from "@/store/editorStore";
import { ElementNode } from "@/types";
import { useRef, useState, useCallback } from "react";
import {
    Layers, Type, Image, Square, Columns2, AlignJustify,
    MousePointerClick, PlayCircle, LayoutGrid, FileText,
    PenLine, Diamond, Minus, Menu, RotateCcw, Code2,
    Star, ArrowUpDown, Smartphone, ChevronDown, LayoutList,
    Eye, EyeOff, Lock, Unlock, GripVertical
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
};

interface DragState {
    elementId: string;
    parentId: string | null;
    index: number;
}

interface LayerItemProps {
    element: ElementNode;
    depth: number;
    index: number;
    parentId: string | null;
    onDragStart: (elementId: string, parentId: string | null, index: number) => void;
    dropIndicator: { parentId: string | null; index: number } | null;
}

const LayerItem: React.FC<LayerItemProps> = ({ element, depth, index, parentId, onDragStart, dropIndicator }) => {
    const { selectedElementId, selectElement, toggleVisibility, toggleLock } = useEditorStore();
    const isSelected = selectedElementId === element.id;

    const showDropAbove = dropIndicator &&
        dropIndicator.parentId === parentId &&
        dropIndicator.index === index;

    return (
        <>
            {showDropAbove && <div className="layer-drop-indicator" style={{ marginLeft: `${12 + depth * 16}px` }} />}
            <div
                className={`layer-item ${isSelected ? "layer-selected" : ""} ${!element.visible ? "layer-hidden" : ""}`}
                style={{ paddingLeft: `${12 + depth * 16}px` }}
                onClick={() => selectElement(element.id)}
            >
                <div
                    className="layer-grip"
                    onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onDragStart(element.id, parentId, index);
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
            {element.children.map((child, ci) => (
                <LayerItem
                    key={child.id}
                    element={child}
                    depth={depth + 1}
                    index={ci}
                    parentId={element.id}
                    onDragStart={onDragStart}
                    dropIndicator={dropIndicator}
                />
            ))}
        </>
    );
};

const LayersPanel: React.FC = () => {
    const { elements, reorderElements } = useEditorStore();
    const [dropIndicator, setDropIndicator] = useState<{ parentId: string | null; index: number } | null>(null);
    const dragRef = useRef<DragState | null>(null);
    const dropRef = useRef<{ parentId: string | null; index: number } | null>(null);
    const listRef = useRef<HTMLDivElement>(null);

    // Build flat mapping for drop target resolution
    const flattenElements = useCallback((els: ElementNode[], parentId: string | null): { elementId: string; parentId: string | null; index: number }[] => {
        const result: { elementId: string; parentId: string | null; index: number }[] = [];
        els.forEach((el, i) => {
            result.push({ elementId: el.id, parentId, index: i });
            result.push(...flattenElements(el.children, el.id));
        });
        return result;
    }, []);

    const handleDragStart = useCallback((elementId: string, parentId: string | null, index: number) => {
        dragRef.current = { elementId, parentId, index };
        dropRef.current = null;

        const handleMouseMove = (e: MouseEvent) => {
            if (!dragRef.current || !listRef.current) return;
            const items = listRef.current.querySelectorAll(".layer-item");
            // Get latest elements from store
            const currentElements = useEditorStore.getState().elements;
            const flat = flattenElements(currentElements, null);

            let closestIdx = 0;
            let closestDist = Infinity;

            items.forEach((item, i) => {
                const rect = item.getBoundingClientRect();
                const mid = rect.top + rect.height / 2;
                const dist = Math.abs(e.clientY - mid);
                if (dist < closestDist) {
                    closestDist = dist;
                    closestIdx = i;
                }
            });

            if (closestIdx < flat.length) {
                const target = flat[closestIdx];
                if (target.parentId === dragRef.current.parentId) {
                    const itemEl = items[closestIdx];
                    const rect = itemEl?.getBoundingClientRect();
                    const dropIndex = rect && e.clientY > rect.top + rect.height / 2
                        ? target.index + 1
                        : target.index;
                    const indicator = { parentId: target.parentId, index: dropIndex };
                    dropRef.current = indicator;
                    setDropIndicator(indicator);
                }
            }
        };

        const handleMouseUp = () => {
            const src = dragRef.current;
            const drop = dropRef.current;

            if (src && drop && src.parentId === drop.parentId && src.index !== drop.index) {
                const adjustedIndex = drop.index > src.index ? drop.index - 1 : drop.index;
                reorderElements(src.parentId, src.index, adjustedIndex);
            }

            dragRef.current = null;
            dropRef.current = null;
            setDropIndicator(null);
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
        };

        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);
    }, [flattenElements, reorderElements]);

    return (
        <div className="layers-panel">
            <div className="layers-header">
                <span>Layers</span>
                <span className="layers-count">{elements.length}</span>
            </div>
            <div className="layers-list" ref={listRef}>
                {elements.length === 0 ? (
                    <div className="layers-empty">
                        <span>No elements</span>
                        <span>Drag elements from the sidebar</span>
                    </div>
                ) : (
                    elements.map((el, i) => (
                        <LayerItem
                            key={el.id}
                            element={el}
                            depth={0}
                            index={i}
                            parentId={null}
                            onDragStart={handleDragStart}
                            dropIndicator={dropIndicator}
                        />
                    ))
                )}
            </div>
        </div>
    );
};

export default LayersPanel;
