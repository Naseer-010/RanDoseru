"use client";

import { useEditorStore } from "@/store/editorStore";
import { useState } from "react";

const PagesPanel: React.FC = () => {
    const { pages, activePageId, elements, addPage, deletePage, renamePage, switchPage } = useEditorStore();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState("");

    const handleStartRename = (id: string, currentTitle: string) => {
        setEditingId(id);
        setEditValue(currentTitle);
    };

    const handleFinishRename = () => {
        if (editingId && editValue.trim()) {
            renamePage(editingId, editValue.trim());
        }
        setEditingId(null);
    };

    return (
        <div className="pages-panel">
            <div className="pages-header">
                <span>Pages</span>
                <button
                    className="pages-add-btn"
                    onClick={() => addPage()}
                    title="Add new page"
                >
                    +
                </button>
            </div>

            <div className="pages-list">
                {pages.map((page) => {
                    const pageElements = page.id === activePageId ? elements : page.elements;
                    return (
                    <div
                        key={page.id}
                        className={`page-card ${page.id === activePageId ? "page-card-active" : ""}`}
                        onClick={() => switchPage(page.id)}
                    >
                        <div className="page-thumb">
                            {pageElements.length === 0 ? (
                                <div className="page-thumb-empty">Empty Page</div>
                            ) : (
                                pageElements.slice(0, 5).map((el, i) => (
                                    <div key={`${page.id}-${el.id}`} className="page-thumb-row" style={{ opacity: Math.max(0.45, 1 - i * 0.1) }}>
                                        {el.label || el.type}
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="page-card-meta">
                            {editingId === page.id ? (
                                <input
                                    className="page-rename-input"
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    onBlur={handleFinishRename}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") handleFinishRename();
                                        if (e.key === "Escape") setEditingId(null);
                                    }}
                                    autoFocus
                                    onClick={(e) => e.stopPropagation()}
                                />
                            ) : (
                                <span
                                    className="page-title"
                                    onDoubleClick={(e) => {
                                        e.stopPropagation();
                                        handleStartRename(page.id, page.title);
                                    }}
                                >
                                    {page.title}
                                </span>
                            )}
                            <span className="page-route">{page.route}</span>
                        </div>

                        {pages.length > 1 && (
                            <button
                                className="page-delete-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    deletePage(page.id);
                                }}
                                title="Delete page"
                            >
                                ×
                            </button>
                        )}
                    </div>
                    );
                })}
            </div>

            <div className="pages-hint">
                Double-click to rename · Click to switch
            </div>
        </div>
    );
};

export default PagesPanel;
