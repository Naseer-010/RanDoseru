// ═══════════════════════════════════════════════════
// Type definitions for the serializable editor state
// ═══════════════════════════════════════════════════

export interface AnimationData {
    type: "fade" | "slide" | "scale" | "bounce" | "none";
    duration: number;
    delay?: number;
}

export interface ActionData {
    type: "submit" | "redirect" | "api_call" | "scroll" | "none";
    target?: string;
}

export type ElementType =
    | "section"
    | "container"
    | "columns"
    | "stack"
    | "text"
    | "title"
    | "paragraph"
    | "button"
    | "image"
    | "video"
    | "gallery"
    | "form"
    | "input"
    | "shape"
    | "divider"
    | "menu"
    | "repeater"
    | "frame"
    | "icon"
    | "spacer"
    | "socialbar"
    | "accordion"
    | "tabs";

// Which element types can accept children
export const CONTAINER_TYPES: ElementType[] = [
    "section",
    "container",
    "columns",
    "stack",
    "form",
    "repeater",
    "frame",
    "accordion",
    "tabs",
];

// ─── Layout — separated from styles ───

export interface ElementLayout {
    x: number;
    y: number;
    w: number;
    h: number;
    position: "absolute" | "relative" | "static" | "fixed" | "sticky";
    opacity: number;    // 0–1
    rotation: number;   // degrees
    visible: boolean;
    locked: boolean;
}

// ─── Element Node ───

export interface ElementNode {
    id: string;
    type: ElementType;
    parentId: string | null;        // explicit parent reference (null = root)
    label?: string;                 // user-friendly display name

    props: Record<string, string | number | boolean>;
    styles: Record<string, string | number>;
    layout: ElementLayout;

    animation?: AnimationData;
    actions?: ActionData;

    children: string[];              // child element IDs (not nested objects)
}

// ─── Page ───

export interface Page {
    id: string;
    title: string;
    route: string;
    // Elements are tracked in the store via pageElementMap, not here.
}

// ─── Editor State (minimal shape for external consumers) ───

export interface EditorState {
    elementsById: Record<string, ElementNode>;
    rootIds: string[];
    selectedElementId: string | null;
}

// ─── Sidebar category definitions ───

export interface SidebarCategory {
    id: string;
    label: string;
    icon: string;
    items: { type: ElementType; label: string; icon: string }[];
}
