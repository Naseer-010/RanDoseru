"use client";

import { useEditorStore } from "@/store/editorStore";
import { useEffect } from "react";

const KeyboardShortcuts: React.FC = () => {
    const {
        undo, redo,
        deleteElement, duplicateElement,
        selectedElementId,
        getElement,
        copyElement, cutElement, pasteElement,
    } = useEditorStore();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement).tagName;
            if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

            const isCtrl = e.ctrlKey || e.metaKey;

            // Ctrl+Z — Undo
            if (isCtrl && !e.shiftKey && e.key === "z") {
                e.preventDefault();
                undo();
                return;
            }

            // Ctrl+Shift+Z or Ctrl+Y — Redo
            if ((isCtrl && e.shiftKey && e.key === "Z") || (isCtrl && e.key === "y")) {
                e.preventDefault();
                redo();
                return;
            }

            // Ctrl+C — Copy
            if (isCtrl && e.key === "c" && selectedElementId) {
                e.preventDefault();
                copyElement(selectedElementId);
                return;
            }

            // Ctrl+X — Cut
            if (isCtrl && e.key === "x" && selectedElementId) {
                e.preventDefault();
                cutElement(selectedElementId);
                return;
            }

            // Ctrl+V — Paste
            if (isCtrl && e.key === "v") {
                e.preventDefault();
                pasteElement();
                return;
            }

            // Delete / Backspace — delete selected
            if ((e.key === "Delete" || e.key === "Backspace") && selectedElementId) {
                e.preventDefault();
                const el = getElement(selectedElementId);
                if (el && !el.locked) {
                    deleteElement(selectedElementId);
                }
                return;
            }

            // Ctrl+D — duplicate selected
            if (isCtrl && e.key === "d" && selectedElementId) {
                e.preventDefault();
                duplicateElement(selectedElementId);
                return;
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [undo, redo, deleteElement, duplicateElement, selectedElementId, getElement, copyElement, cutElement, pasteElement]);

    return null;
};

export default KeyboardShortcuts;
