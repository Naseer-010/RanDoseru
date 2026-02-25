"use client";

import { useState } from "react";
import DndProvider from "@/components/DndProvider";
import Sidebar from "@/components/Sidebar";
import Canvas from "@/components/Canvas";
import PropertyInspector from "@/components/PropertyInspector";
import DebugPanel from "@/components/DebugPanel";
import FloatingToolbar from "@/components/FloatingToolbar";
import Breadcrumbs from "@/components/Breadcrumbs";
import KeyboardShortcuts from "@/components/KeyboardShortcuts";
import PreviewPanel from "@/components/PreviewPanel";
import { useEditorStore } from "@/store/editorStore";

function UndoRedoButtons() {
  const { undo, redo, canUndo, canRedo } = useEditorStore();
  return (
    <div className="header-undo-redo">
      <button
        className="header-icon-btn"
        onClick={undo}
        disabled={!canUndo}
        title="Undo (Ctrl+Z)"
      >
        ↩
      </button>
      <button
        className="header-icon-btn"
        onClick={redo}
        disabled={!canRedo}
        title="Redo (Ctrl+Shift+Z)"
      >
        ↪
      </button>
    </div>
  );
}

export default function Home() {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [autosaveEnabled, setAutosaveEnabled] = useState(true);
  const { selectElement } = useEditorStore();

  const openPreview = () => {
    selectElement(null);
    setIsPreviewOpen(true);
  };

  return (
    <DndProvider>
      <div className="editor-root">
        <KeyboardShortcuts />
        {/* Top Header */}
        <header className="editor-header">
          <div className="header-left">
            <span className="header-logo">◇</span>
            <span className="header-title">Studio Editor</span>
          </div>
          <div className="header-center">
            <UndoRedoButtons />
            <button
              className={`autosave-toggle ${autosaveEnabled ? "on" : "off"}`}
              onClick={() => setAutosaveEnabled((v) => !v)}
              title="Toggle autosave"
            >
              Autosave {autosaveEnabled ? "On" : "Off"}
            </button>
          </div>
          <div className="header-right">
            <button className="header-btn" onClick={openPreview}>Preview</button>
            <button className="header-btn primary">Publish</button>
          </div>
        </header>

        {/* Main area */}
        <div className="editor-body">
          <Sidebar />
          <div className="editor-center">
            <Canvas />
            <FloatingToolbar />
          </div>
          <PropertyInspector />
        </div>

        {/* Bottom bar */}
        <div className="editor-footer">
          <Breadcrumbs />
          <DebugPanel />
        </div>

        {isPreviewOpen && <PreviewPanel onClose={() => setIsPreviewOpen(false)} />}
      </div>
    </DndProvider>
  );
}
