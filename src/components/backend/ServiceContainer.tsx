"use client";

import React from "react";
import { useBackendStore } from "@/store/backendStore";
import BackendBlockComponent from "./BackendBlock";
import {
    ServiceContainer,
    BackendBlockType,
    DEFAULT_BLOCK_CONFIGS,
} from "@/types/backend";
import {
    ChevronDown, ChevronRight, Trash2, Settings, Plus,
    Globe, Database, Shield, Braces, Layers,
} from "lucide-react";

interface Props {
    service: ServiceContainer;
}

const ServiceContainerComponent: React.FC<Props> = ({ service }) => {
    const {
        selectedServiceId,
        selectService,
        removeService,
        toggleServiceCollapse,
        addBlock,
    } = useBackendStore();

    const isSelected = selectedServiceId === service.id;

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const blockType = e.dataTransfer.getData("backend-block-type") as BackendBlockType;
        const label = e.dataTransfer.getData("backend-block-label");
        if (blockType) {
            addBlock(service.id, blockType, label || undefined);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const quickAddBlock = (type: BackendBlockType, label: string) => {
        addBlock(service.id, type, label);
    };

    return (
        <div
            id={`service-${service.id}`}
            className={`service-container ${isSelected ? "service-selected" : ""}`}
            style={{ borderTopColor: service.color }}
            onClick={(e) => {
                e.stopPropagation();
                selectService(service.id);
            }}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
        >
            {/* Header */}
            <div className="service-header" style={{ background: `${service.color}15` }}>
                <button
                    className="service-collapse-btn"
                    onClick={(e) => {
                        e.stopPropagation();
                        toggleServiceCollapse(service.id);
                    }}
                >
                    {service.collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                </button>
                <div
                    className="service-color-dot"
                    style={{ background: service.color }}
                />
                <div className="service-header-info">
                    <span className="service-name">{service.name}</span>
                    <span className="service-port">:{service.port}</span>
                </div>
                <div className="service-header-actions">
                    <button
                        className="service-action-btn"
                        onClick={(e) => {
                            e.stopPropagation();
                            selectService(service.id);
                        }}
                        title="Settings"
                    >
                        <Settings size={13} />
                    </button>
                    <button
                        className="service-action-btn service-delete-btn"
                        onClick={(e) => {
                            e.stopPropagation();
                            removeService(service.id);
                        }}
                        title="Delete Service"
                    >
                        <Trash2 size={13} />
                    </button>
                </div>
            </div>

            {/* Description */}
            {service.description && !service.collapsed && (
                <div className="service-description">{service.description}</div>
            )}

            {/* Blocks */}
            {!service.collapsed && (
                <div className="service-blocks">
                    {service.blocks.length === 0 ? (
                        <div className="service-empty">
                            <p>Drop blocks here or use quick add</p>
                            <div className="service-quick-add">
                                <button onClick={() => quickAddBlock("rest_endpoint", "GET Endpoint")} title="Add Endpoint">
                                    <Globe size={12} /> Endpoint
                                </button>
                                <button onClick={() => quickAddBlock("db_model", "Model")} title="Add Model">
                                    <Database size={12} /> Model
                                </button>
                                <button onClick={() => quickAddBlock("auth_block", "Auth")} title="Add Auth">
                                    <Shield size={12} /> Auth
                                </button>
                                <button onClick={() => quickAddBlock("middleware", "Middleware")} title="Add Middleware">
                                    <Layers size={12} /> Middleware
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            {service.blocks.map((block) => (
                                <BackendBlockComponent
                                    key={block.id}
                                    block={block}
                                    serviceId={service.id}
                                />
                            ))}
                            <button
                                className="service-add-block-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    quickAddBlock("rest_endpoint", "New Endpoint");
                                }}
                            >
                                <Plus size={12} /> Add Block
                            </button>
                        </>
                    )}
                </div>
            )}

            {/* Stats footer */}
            {!service.collapsed && service.blocks.length > 0 && (
                <div className="service-footer">
                    <span>{service.blocks.filter(b => b.type === "rest_endpoint").length} endpoints</span>
                    <span>{service.blocks.filter(b => b.type === "db_model").length} models</span>
                    <span>{service.blocks.filter(b => !["rest_endpoint", "db_model"].includes(b.type)).length} other</span>
                </div>
            )}
        </div>
    );
};

export default ServiceContainerComponent;
