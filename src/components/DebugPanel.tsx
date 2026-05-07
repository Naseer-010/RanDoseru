"use client";

import { useEditorStore } from "@/store/editorStore";
import { useState } from "react";

const DebugPanel: React.FC = () => {
    const { elementsById, rootIds, selectedElementId } = useEditorStore();
    const [expanded, setExpanded] = useState(false);

    const state = { elementsById, rootIds, selectedElementId };
    const json = JSON.stringify(state, null, 2);
    const serializable = (() => { try { JSON.parse(json); return true; } catch { return false; } })();

    return (
        <div className={`debug-panel ${expanded ? "open" : ""}`}>
            <button className="debug-toggle" onClick={() => setExpanded(!expanded)}>
                <span className="debug-toggle-left">
                    <span className="debug-dot" />
                    JSON State
                    {serializable ? (
                        <span className="debug-ok">✓ Serializable</span>
                    ) : (
                        <span className="debug-err">✗ Error</span>
                    )}
                </span>
                <span className="debug-arrow">{expanded ? "▼" : "▲"}</span>
            </button>
            {expanded && (
                <div className="debug-body">
                    <div className="debug-actions-bar">
                        <button
                            onClick={async () => {
                                try {
                                    await navigator.clipboard.writeText(json);
                                } catch {
                                    // ignore clipboard errors in unsupported contexts
                                }
                            }}
                        >
                            Copy JSON
                        </button>
                        <span className="debug-count">{rootIds.length} root element(s)</span>
                    </div>
                    <pre>{json}</pre>
                </div>
            )}
        </div>
    );
};

export default DebugPanel;
