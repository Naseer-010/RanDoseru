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

export interface ElementLayout {
    x: number;
    y: number;
    w: number;
    h: number;
    position: "absolute" | "relative" | "static" | "fixed" | "sticky";
    opacity: number;
    rotation: number;
    visible: boolean;
    locked: boolean;
}

export interface ElementNode {
    id: string;
    type: ElementType;
    parentId: string | null;
    label?: string;
    props: Record<string, string | number | boolean>;
    styles: Record<string, string | number>;
    layout: ElementLayout;
    animation?: AnimationData;
    actions?: ActionData;
    children: string[]; // child element IDs
}

export interface Page {
    id: string;
    title: string;
    route: string;
}

export interface EditorState {
    elementsById: Record<string, ElementNode>;
    rootIds: string[];
    selectedElementId: string | null;
}

export interface SidebarCategory {
    id: string;
    label: string;
    icon: string;
    items: { type: ElementType; label: string; icon: string }[];
}
