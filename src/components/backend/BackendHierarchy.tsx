"use client";

import React from "react";
import { useBackendStore } from "@/store/backendStore";
import {
    Globe, Database, Shield, Settings, GitBranch, Repeat,
    AlertTriangle, CheckCircle, Link2, ChevronDown, ChevronRight,
    Trash2, Server,
} from "lucide-react";

// Map block type → icon
const BLOCK_ICONS: Record<string, React.ReactNode> = {
    rest_endpoint: <Globe size={13} />,
    db_model: <Database size={13} />,
    middleware: <Settings size={13} />,
    auth_block: <Shield size={13} />,
    logic_if: <GitBranch size={13} />,
    logic_loop: <Repeat size={13} />,
    logic_trycatch: <AlertTriangle size={13} />,
    validation: <CheckCircle size={13} />,
    relation: <Link2 size={13} />,
    env_var: <Settings size={13} />,
};

const BackendHierarchy: React.FC = () => {
    const {
        services,
        selectedServiceId,
        selectedBlockId,
        selectService,
        selectBlock,
        removeService,
        removeBlock,
        toggleServiceCollapse,
    } = useBackendStore();

    return (
        <div className="backend-hierarchy">
            <div className="bh-header">
                <h3>Hierarchy</h3>
                <span className="bh-count">{services.length}</span>
            </div>
            <div className="bh-tree">
                {services.length === 0 ? (
                    <div className="bh-empty">
                        <Server size={20} strokeWidth={1} />
                        <span>No services yet</span>
                    </div>
                ) : (
                    services.map((service) => (
                        <div key={service.id} className="bh-service">
                            <div
                                className={`bh-service-row ${selectedServiceId === service.id && !selectedBlockId ? "bh-selected" : ""}`}
                                onClick={() => {
                                    selectService(service.id);
                                    selectBlock(null);
                                }}
                            >
                                <button
                                    className="bh-toggle"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        toggleServiceCollapse(service.id);
                                    }}
                                >
                                    {service.collapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                                </button>
                                <div className="bh-dot" style={{ background: service.color }} />
                                <span className="bh-service-name">{service.name}</span>
                                <span className="bh-port">:{service.port}</span>
                                <button
                                    className="bh-delete"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        removeService(service.id);
                                    }}
                                    title="Delete"
                                >
                                    <Trash2 size={11} />
                                </button>
                            </div>

                            {!service.collapsed && (
                                <div className="bh-blocks">
                                    {service.blocks.map((block) => (
                                        <div
                                            key={block.id}
                                            className={`bh-block-row ${selectedBlockId === block.id ? "bh-selected" : ""}`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                selectBlock(block.id);
                                            }}
                                        >
                                            <span className="bh-block-icon">
                                                {BLOCK_ICONS[block.type] || <Settings size={13} />}
                                            </span>
                                            <span className="bh-block-name">{block.label}</span>
                                            <button
                                                className="bh-delete"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    removeBlock(service.id, block.id);
                                                }}
                                                title="Delete"
                                            >
                                                <Trash2 size={11} />
                                            </button>
                                        </div>
                                    ))}

                                    {service.blocks.length === 0 && (
                                        <div className="bh-empty-blocks">No blocks</div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default BackendHierarchy;
