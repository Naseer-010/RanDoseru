"use client";

import { useEditorStore } from "@/store/editorStore";

const Breadcrumbs: React.FC = () => {
    const { selectedElementId, getBreadcrumbPath, selectElement } = useEditorStore();

    const path = selectedElementId ? getBreadcrumbPath(selectedElementId) : [];

    return (
        <div className="breadcrumbs-bar">
            <button
                className={`breadcrumb-item ${!selectedElementId ? "active" : ""}`}
                onClick={() => selectElement(null)}
            >
                Page
            </button>
            {path.map((node, i) => (
                <span key={node.id} className="breadcrumb-segment">
                    <span className="breadcrumb-sep">›</span>
                    <button
                        className={`breadcrumb-item ${i === path.length - 1 ? "active" : ""}`}
                        onClick={() => selectElement(node.id)}
                    >
                        {node.label || node.type}
                    </button>
                </span>
            ))}
        </div>
    );
};

export default Breadcrumbs;
