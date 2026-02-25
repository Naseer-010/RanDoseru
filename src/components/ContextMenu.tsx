"use client";

import { useEditorStore } from "@/store/editorStore";
import { useEffect, useRef } from "react";

interface ContextMenuProps {
    x: number;
    y: number;
    elementId: string;
    onClose: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, elementId, onClose }) => {
    const {
        getElement,
        copyElement,
        cutElement,
        pasteElement,
        duplicateElement,
        deleteElement,
        toggleVisibility,
        toggleLock,
        bringForward,
        sendBackward,
        bringToFront,
        sendToBack,
        clipboard,
    } = useEditorStore();

    const menuRef = useRef<HTMLDivElement>(null);
    const el = getElement(elementId);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("keydown", handleEsc);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("keydown", handleEsc);
        };
    }, [onClose]);

    if (!el) return null;

    const action = (fn: () => void) => {
        fn();
        onClose();
    };

    return (
        <div
            ref={menuRef}
            className="ctx-menu"
            style={{ left: x, top: y }}
        >
            <button className="ctx-item" onClick={() => action(() => cutElement(elementId))}>
                <span className="ctx-icon">✂</span>
                <span>Cut</span>
                <span className="ctx-shortcut">Ctrl+X</span>
            </button>
            <button className="ctx-item" onClick={() => action(() => copyElement(elementId))}>
                <span className="ctx-icon">📋</span>
                <span>Copy</span>
                <span className="ctx-shortcut">Ctrl+C</span>
            </button>
            <button
                className={`ctx-item ${!clipboard ? "ctx-disabled" : ""}`}
                onClick={() => clipboard && action(() => pasteElement())}
            >
                <span className="ctx-icon">📌</span>
                <span>Paste</span>
                <span className="ctx-shortcut">Ctrl+V</span>
            </button>

            <div className="ctx-divider" />

            <button className="ctx-item" onClick={() => action(() => duplicateElement(elementId))}>
                <span className="ctx-icon">⊕</span>
                <span>Duplicate</span>
                <span className="ctx-shortcut">Ctrl+D</span>
            </button>

            <div className="ctx-divider" />

            {/* Arrange submenu inline */}
            <div className="ctx-group-label">Arrange</div>
            <button className="ctx-item ctx-sub" onClick={() => action(() => bringToFront(elementId))}>
                <span className="ctx-icon">⤒</span>
                <span>Bring to Front</span>
            </button>
            <button className="ctx-item ctx-sub" onClick={() => action(() => bringForward(elementId))}>
                <span className="ctx-icon">↑</span>
                <span>Bring Forward</span>
            </button>
            <button className="ctx-item ctx-sub" onClick={() => action(() => sendBackward(elementId))}>
                <span className="ctx-icon">↓</span>
                <span>Send Backward</span>
            </button>
            <button className="ctx-item ctx-sub" onClick={() => action(() => sendToBack(elementId))}>
                <span className="ctx-icon">⤓</span>
                <span>Send to Back</span>
            </button>

            <div className="ctx-divider" />

            <button className="ctx-item" onClick={() => action(() => toggleVisibility(elementId))}>
                <span className="ctx-icon">{el.visible ? "👁" : "👁‍🗨"}</span>
                <span>{el.visible ? "Hide" : "Show"}</span>
            </button>
            <button className="ctx-item" onClick={() => action(() => toggleLock(elementId))}>
                <span className="ctx-icon">{el.locked ? "🔓" : "🔒"}</span>
                <span>{el.locked ? "Unlock" : "Lock"}</span>
            </button>

            <div className="ctx-divider" />

            <button className="ctx-item ctx-danger" onClick={() => action(() => deleteElement(elementId))}>
                <span className="ctx-icon">🗑</span>
                <span>Delete</span>
                <span className="ctx-shortcut">Del</span>
            </button>
        </div>
    );
};

export default ContextMenu;
