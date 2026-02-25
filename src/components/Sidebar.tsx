"use client";

import { useEditorStore } from "@/store/editorStore";
import { templates, sidebarCategories } from "@/templates";
import { ElementType, CONTAINER_TYPES } from "@/types";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useState } from "react";
import LayersPanel from "./LayersPanel";
import PagesPanel from "./PagesPanel";
import TemplatesPanel from "./TemplatesPanel";
import {
    Plus, FileText, Layers, Globe, Route, Code2,
    AlignJustify, Square, Columns2, LayoutList, ArrowUpDown,
    Minus, Type, MousePointerClick, Image, PlayCircle,
    LayoutGrid, Menu, Diamond, Star, FileInput, PenLine,
    Smartphone, RotateCcw, ChevronDown, Code, Sparkles
} from "lucide-react";

// Map element type string → Lucide icon for sidebar tiles
const TILE_ICONS: Record<string, React.ReactNode> = {
    section: <AlignJustify size={20} />,
    container: <Square size={20} />,
    columns: <Columns2 size={20} />,
    stack: <Layers size={20} />,
    spacer: <ArrowUpDown size={20} />,
    divider: <Minus size={20} />,
    title: <Type size={20} strokeWidth={2.5} />,
    text: <Type size={20} />,
    paragraph: <FileText size={20} />,
    button: <MousePointerClick size={20} />,
    image: <Image size={20} />,
    video: <PlayCircle size={20} />,
    gallery: <LayoutGrid size={20} />,
    menu: <Menu size={20} />,
    shape: <Diamond size={20} />,
    icon: <Star size={20} />,
    form: <FileInput size={20} />,
    input: <PenLine size={20} />,
    socialbar: <Smartphone size={20} />,
    frame: <Code size={20} />,
    repeater: <RotateCcw size={20} />,
    accordion: <ChevronDown size={20} />,
    tabs: <LayoutList size={20} />,
};

// Draggable sidebar element tile
const DraggableItem: React.FC<{
    type: ElementType;
    label: string;
    icon: string;
}> = ({ type, label, icon }) => {
    const { addElement } = useEditorStore();

    const { attributes, listeners, setNodeRef, transform, isDragging } =
        useDraggable({
            id: `template-${type}`,
            data: {
                type: "template",
                template: templates[type],
                templateType: type,
            },
        });

    const style: React.CSSProperties = {
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.4 : 1,
    };

    const handleClick = () => {
        const { selectedElementId, getElement } = useEditorStore.getState();
        let parentId: string | undefined;

        if (selectedElementId) {
            const sel = getElement(selectedElementId);
            if (sel && CONTAINER_TYPES.includes(sel.type)) {
                parentId = selectedElementId;
            }
        }

        addElement({ ...templates[type] }, parentId);
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="sidebar-tile"
            {...listeners}
            {...attributes}
            onDoubleClick={handleClick}
            title={`Drag or double-click to add ${label}`}
        >
            <div className="sidebar-tile-icon">{TILE_ICONS[icon] || TILE_ICONS[type] || <Square size={20} />}</div>
            <span className="sidebar-tile-label">{label}</span>
        </div>
    );
};

// Global element item
const GlobalItem: React.FC<{
    type: ElementType;
    label: string;
    description: string;
}> = ({ type, label, description }) => {
    const { addGlobalElement } = useEditorStore();

    const handleAdd = () => {
        addGlobalElement({ ...templates[type] });
    };

    return (
        <button className="global-item" onClick={handleAdd}>
            <div className="global-item-icon">{TILE_ICONS[type] || <Square size={20} />}</div>
            <div className="global-item-info">
                <span className="global-item-label">{label}</span>
                <span className="global-item-desc">{description}</span>
            </div>
            <Plus size={14} className="global-item-add" />
        </button>
    );
};

const Sidebar: React.FC = () => {
    const { sidebarOpen, setSidebarOpen, globalElements, deleteGlobalElement, selectElement } = useEditorStore();
    const [searchQuery, setSearchQuery] = useState("");

    const getFilteredCategories = () => {
        if (!searchQuery) return sidebarCategories;
        return sidebarCategories
            .map((cat) => ({
                ...cat,
                items: cat.items.filter((item) =>
                    item.label.toLowerCase().includes(searchQuery.toLowerCase())
                ),
            }))
            .filter((cat) => cat.items.length > 0);
    };

    const filteredCategories = getFilteredCategories();

    return (
        <div className="sidebar-container">
            <div className="sidebar-rail">
                <button
                    className={`rail-btn ${sidebarOpen === "add" ? "rail-active" : ""}`}
                    onClick={() => setSidebarOpen(sidebarOpen === "add" ? null : "add")}
                    title="Add Elements"
                >
                    <span className="rail-icon"><Plus size={18} /></span>
                    <span className="rail-label">Add</span>
                </button>
                <button
                    className={`rail-btn ${sidebarOpen === "templates" ? "rail-active" : ""}`}
                    onClick={() => setSidebarOpen(sidebarOpen === "templates" ? null : "templates")}
                    title="Templates"
                >
                    <span className="rail-icon"><Sparkles size={16} /></span>
                    <span className="rail-label">Templates</span>
                </button>
                <button
                    className={`rail-btn ${sidebarOpen === "pages" ? "rail-active" : ""}`}
                    onClick={() => setSidebarOpen(sidebarOpen === "pages" ? null : "pages")}
                    title="Pages"
                >
                    <span className="rail-icon"><FileText size={16} /></span>
                    <span className="rail-label">Pages</span>
                </button>
                <button
                    className={`rail-btn ${sidebarOpen === "layers" ? "rail-active" : ""}`}
                    onClick={() => setSidebarOpen(sidebarOpen === "layers" ? null : "layers")}
                    title="Layers"
                >
                    <span className="rail-icon"><Layers size={16} /></span>
                    <span className="rail-label">Layers</span>
                </button>
                <button
                    className={`rail-btn ${sidebarOpen === "global" ? "rail-active" : ""}`}
                    onClick={() => setSidebarOpen(sidebarOpen === "global" ? null : "global")}
                    title="Global"
                >
                    <span className="rail-icon"><Globe size={16} /></span>
                    <span className="rail-label">Global</span>
                </button>
                <button
                    className={`rail-btn ${sidebarOpen === "routes" ? "rail-active" : ""}`}
                    onClick={() => setSidebarOpen(sidebarOpen === "routes" ? null : "routes")}
                    title="Routes"
                >
                    <span className="rail-icon"><Route size={16} /></span>
                    <span className="rail-label">Routes</span>
                </button>
                <button
                    className={`rail-btn ${sidebarOpen === "code" ? "rail-active" : ""}`}
                    onClick={() => setSidebarOpen(sidebarOpen === "code" ? null : "code")}
                    title="Code"
                >
                    <span className="rail-icon"><Code2 size={16} /></span>
                    <span className="rail-label">Code</span>
                </button>
            </div>

            {/* Flyout — Add Elements */}
            {sidebarOpen === "add" && (
                <div className="sidebar-flyout">
                    <div className="flyout-header">
                        <h2>Add Elements</h2>
                        <button className="flyout-close" onClick={() => setSidebarOpen(null)}>✕</button>
                    </div>

                    <div className="flyout-search">
                        <svg className="search-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
                            <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Search elements..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="flyout-groups">
                        {filteredCategories.map((cat) => (
                            <div key={cat.id} className="flyout-group">
                                <div className="flyout-group-header">{cat.label}</div>
                                <div className="flyout-grid">
                                    {cat.items.map((item, idx) => (
                                        <DraggableItem
                                            key={`${item.type}-${idx}`}
                                            type={item.type}
                                            label={item.label}
                                            icon={item.icon}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flyout-hint">
                        Drag to canvas or double-click to add
                    </div>
                </div>
            )}

            {/* Flyout — Templates */}
            {sidebarOpen === "templates" && (
                <div className="sidebar-flyout sidebar-flyout-wide">
                    <div className="flyout-header">
                        <h2>Templates</h2>
                        <button className="flyout-close" onClick={() => setSidebarOpen(null)}>✕</button>
                    </div>
                    <div className="flyout-body">
                        <TemplatesPanel />
                    </div>
                </div>
            )}

            {/* Flyout — Pages */}
            {sidebarOpen === "pages" && (
                <div className="sidebar-flyout">
                    <div className="flyout-header">
                        <h2>Pages</h2>
                        <button className="flyout-close" onClick={() => setSidebarOpen(null)}>✕</button>
                    </div>
                    <div className="flyout-body">
                        <PagesPanel />
                    </div>
                </div>
            )}

            {/* Flyout — Layers */}
            {sidebarOpen === "layers" && (
                <div className="sidebar-flyout">
                    <div className="flyout-header">
                        <h2>Layers</h2>
                        <button className="flyout-close" onClick={() => setSidebarOpen(null)}>✕</button>
                    </div>
                    <div className="flyout-body">
                        <LayersPanel />
                    </div>
                </div>
            )}

            {/* Flyout — Global Elements */}
            {sidebarOpen === "global" && (
                <div className="sidebar-flyout">
                    <div className="flyout-header">
                        <h2>Global</h2>
                        <button className="flyout-close" onClick={() => setSidebarOpen(null)}>✕</button>
                    </div>
                    <div className="flyout-body">
                        <div className="global-panel">
                            <p className="global-info">
                                <Globe size={14} />
                                Elements added here appear on <strong>all pages</strong>.
                            </p>

                            <div className="global-add-section">
                                <span className="global-section-title">Add Global Element</span>
                                <GlobalItem type="section" label="Header" description="Top navigation bar" />
                                <GlobalItem type="section" label="Footer" description="Bottom page section" />
                                <GlobalItem type="menu" label="Navigation" description="Site-wide nav menu" />
                                <GlobalItem type="socialbar" label="Social Bar" description="Social media links" />
                            </div>

                            {globalElements.length > 0 && (
                                <div className="global-current">
                                    <span className="global-section-title">Active Global Elements</span>
                                    {globalElements.map((el) => (
                                        <div key={el.id} className="global-active-item">
                                            <span className="global-active-icon">{TILE_ICONS[el.type] || <Square size={14} />}</span>
                                            <span
                                                className="global-active-name"
                                                onClick={() => selectElement(el.id)}
                                            >
                                                {el.label || el.type}
                                            </span>
                                            <button
                                                className="global-remove-btn"
                                                onClick={() => deleteGlobalElement(el.id)}
                                                title="Remove"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Flyout — Routes */}
            {sidebarOpen === "routes" && (
                <div className="sidebar-flyout">
                    <div className="flyout-header">
                        <h2>Routes</h2>
                        <button className="flyout-close" onClick={() => setSidebarOpen(null)}>✕</button>
                    </div>
                    <div className="flyout-body">
                        <div className="placeholder-panel">
                            <Route size={32} />
                            <p>Route Editor</p>
                            <span>Connect pages and define navigation flow. Coming soon.</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Flyout — Code */}
            {sidebarOpen === "code" && (
                <div className="sidebar-flyout">
                    <div className="flyout-header">
                        <h2>Code</h2>
                        <button className="flyout-close" onClick={() => setSidebarOpen(null)}>✕</button>
                    </div>
                    <div className="flyout-body">
                        <div className="placeholder-panel">
                            <Code2 size={32} />
                            <p>Code Viewer</p>
                            <span>View and edit generated HTML/CSS. Coming soon.</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Sidebar;
