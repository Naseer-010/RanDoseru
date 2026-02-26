"use client";

import { useEffect, useMemo, useState } from "react";
import { useEditorStore } from "@/store/editorStore";
import { generateFrontendProject } from "@/lib/codegen/frontend";
import { X, FileCode2, Eye } from "lucide-react";

const FrontendCodePreviewPanel: React.FC = () => {
    const {
        elements,
        globalElements,
        canvasSettings,
        pages,
        activePageId,
        setFrontendGeneratedCode,
        setFrontendCodePreviewOpen,
    } = useEditorStore();
    const [activeTab, setActiveTab] = useState<"preview" | "code">("preview");
    const [selectedFile, setSelectedFile] = useState<string | null>(null);

    const activePage = pages.find((p) => p.id === activePageId);

    const { files, previewHtml } = useMemo(() => {
        return generateFrontendProject(elements, globalElements, canvasSettings, activePage);
    }, [elements, globalElements, canvasSettings, activePage]);

    const fileList = Object.keys(files).sort();
    const activeFile = selectedFile || fileList[0] || null;

    // Keep store in sync for export actions
    useEffect(() => {
        setFrontendGeneratedCode(files);
    }, [files, setFrontendGeneratedCode]);

    return (
        <div className="code-preview-overlay">
            <div className="code-preview-panel">
                <div className="code-preview-header">
                    <FileCode2 size={16} />
                    <h3>FUlly Functional Code</h3>
                    <span className="code-file-count">{fileList.length} files</span>
                    <button
                        className="code-preview-close"
                        onClick={() => setFrontendCodePreviewOpen(false)}
                    >
                        <X size={16} />
                    </button>
                </div>
                <div className="code-preview-body">
                    <div className="code-preview-sidebar">
                        <button
                            className={`code-file-btn ${activeTab === "preview" ? "active" : ""}`}
                            onClick={() => setActiveTab("preview")}
                        >
                            <Eye size={12} />
                            <span>Live Preview</span>
                        </button>
                        <div className="code-preview-divider" />
                        {fileList.map((f) => (
                            <button
                                key={f}
                                className={`code-file-btn ${activeTab === "code" && activeFile === f ? "active" : ""}`}
                                onClick={() => {
                                    setActiveTab("code");
                                    setSelectedFile(f);
                                }}
                            >
                                <FileCode2 size={12} />
                                <span>{f}</span>
                            </button>
                        ))}
                    </div>
                    <div className="code-preview-content">
                        {activeTab === "preview" ? (
                            <iframe
                                className="code-preview-iframe"
                                title="Frontend Preview"
                                sandbox="allow-scripts allow-same-origin"
                                srcDoc={previewHtml}
                            />
                        ) : (
                            activeFile && (
                                <pre className="code-preview-code">
                                    <code>{files[activeFile]}</code>
                                </pre>
                            )
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FrontendCodePreviewPanel;
