"use client";

import { useEffect } from "react";
import Renderer from "./Renderer";
import { useEditorStore } from "@/store/editorStore";

interface PreviewPanelProps {
    onClose: () => void;
}

const PreviewPanel: React.FC<PreviewPanelProps> = ({ onClose }) => {
    const { elements, globalElements, canvasSettings, pages, activePageId } = useEditorStore();
    const activePage = pages.find((p) => p.id === activePageId);
    const canvasWidth = Math.max(320, Number(canvasSettings.width) || 1280);
    const canvasHeight = Math.max(200, Number(canvasSettings.height) || 900);
    const canvasBackground = String(canvasSettings.backgroundColor || "#ffffff");
    const canvasHasGradient = /gradient\(/i.test(canvasBackground);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [onClose]);

    return (
        <div className="site-preview-overlay">
            <div className="site-preview-header">
                <button className="site-preview-close" onClick={onClose}>
                    Back To Editor
                </button>
                <div className="site-preview-meta">
                    <span className="site-preview-title">{activePage?.title || "Preview"}</span>
                    <span className="site-preview-route">{activePage?.route || "/"}</span>
                </div>
            </div>
            <div className="site-preview-body">
                <div className="site-preview-scroll">
                    <div
                        className="site-preview-page"
                        style={{
                            width: `${canvasWidth}px`,
                            maxWidth: `${canvasWidth}px`,
                            minHeight: `${canvasHeight}px`,
                            background: canvasBackground,
                            backgroundColor: canvasHasGradient ? undefined : canvasBackground,
                        }}
                    >
                        {globalElements.length > 0 && (
                            <Renderer elements={globalElements} parentId={null} isRoot={false} readOnly />
                        )}
                        <Renderer elements={elements} parentId={null} isRoot readOnly />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PreviewPanel;
