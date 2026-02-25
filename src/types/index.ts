// Type definitions for the serializable editor state

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

export interface ElementNode {
    id: string;
    type: ElementType;
    label?: string; // user-friendly display name
    props: Record<string, string | number | boolean>;
    styles: Record<string, string | number>;
    // Free-position coordinates (px, relative to canvas-page)
    x: number;
    y: number;
    w: number;
    h: number;
    opacity: number;    // 0–1
    rotation: number;   // degrees
    visible: boolean;
    locked: boolean;
    animation?: AnimationData;
    actions?: ActionData;
    children: ElementNode[];
}

export interface Page {
    id: string;
    title: string;
    route: string;
    elements: ElementNode[];
}

export interface EditorState {
    elements: ElementNode[];
    selectedElementId: string | null;
}

// Sidebar category definitions
export interface SidebarCategory {
    id: string;
    label: string;
    icon: string;
    items: { type: ElementType; label: string; icon: string }[];
}
