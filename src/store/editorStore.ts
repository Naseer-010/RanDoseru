import { create } from "zustand";
import { ElementNode, Page } from "@/types";
import { v4 as uuidv4 } from "uuid";

// Default sizes per element type
const DEFAULT_SIZES: Record<string, { w: number; h: number }> = {
    section: { w: 800, h: 200 },
    container: { w: 400, h: 200 },
    columns: { w: 600, h: 200 },
    stack: { w: 400, h: 200 },
    title: { w: 400, h: 50 },
    text: { w: 300, h: 30 },
    paragraph: { w: 500, h: 80 },
    button: { w: 160, h: 44 },
    image: { w: 400, h: 280 },
    video: { w: 480, h: 300 },
    gallery: { w: 500, h: 250 },
    form: { w: 400, h: 300 },
    input: { w: 300, h: 44 },
    shape: { w: 120, h: 120 },
    divider: { w: 500, h: 4 },
    menu: { w: 500, h: 44 },
    repeater: { w: 400, h: 200 },
    frame: { w: 500, h: 300 },
    icon: { w: 48, h: 48 },
    spacer: { w: 500, h: 40 },
    socialbar: { w: 300, h: 48 },
    accordion: { w: 500, h: 200 },
    tabs: { w: 600, h: 300 },
};

const MAX_HISTORY = 50;

interface EditorStore {
    // Multi-page
    pages: Page[];
    activePageId: string;
    elements: ElementNode[];
    globalElements: ElementNode[];
    selectedElementId: string | null;
    selectedElementIds: string[];
    sidebarOpen: string | null;

    // Clipboard
    clipboard: ElementNode | null;

    // History
    past: ElementNode[][];
    future: ElementNode[][];
    canUndo: boolean;
    canRedo: boolean;

    // Actions
    addElement: (element: Omit<ElementNode, "id">, parentId?: string, x?: number, y?: number) => string;
    updateElement: (id: string, updates: Partial<ElementNode>) => void;
    updateElementPosition: (id: string, x: number, y: number) => void;
    updateElementSize: (id: string, w: number, h: number) => void;
    updateElementOpacity: (id: string, opacity: number) => void;
    updateElementRotation: (id: string, rotation: number) => void;
    updateElementRotationLive: (id: string, rotation: number) => void;
    toggleVisibility: (id: string) => void;
    toggleLock: (id: string) => void;
    deleteElement: (id: string) => void;
    duplicateElement: (id: string) => void;
    moveElement: (id: string, targetParentId: string | null, index: number) => void;
    moveGlobalElement: (id: string, targetParentId: string | null, index: number) => void;
    selectElement: (id: string | null) => void;
    selectElements: (ids: string[]) => void;
    toggleSelectElement: (id: string) => void;
    setSidebarOpen: (categoryId: string | null) => void;
    reorderElements: (parentId: string | null, oldIndex: number, newIndex: number) => void;
    reorderGlobalElements: (parentId: string | null, oldIndex: number, newIndex: number) => void;
    undo: () => void;
    redo: () => void;

    // Arrange (z-order)
    bringForward: (id: string) => void;
    sendBackward: (id: string) => void;
    bringToFront: (id: string) => void;
    sendToBack: (id: string) => void;

    // Clipboard
    copyElement: (id: string) => void;
    cutElement: (id: string) => void;
    pasteElement: () => void;

    // Pages
    addPage: (title?: string) => string;
    deletePage: (id: string) => void;
    renamePage: (id: string, title: string) => void;
    switchPage: (id: string) => void;

    // Global elements
    addGlobalElement: (element: Omit<ElementNode, "id">) => string;
    deleteGlobalElement: (id: string) => void;

    // Templates
    loadTemplate: (elements: Omit<ElementNode, "id">[]) => void;

    // Getters
    getElement: (id: string) => ElementNode | undefined;
    getSelectedElement: () => ElementNode | undefined;
    getBreadcrumbPath: (id: string) => { id: string; type: string; label?: string }[];

    // Canvas settings
    canvasSettings: { backgroundColor: string; width: number; height: number };
    updateCanvasSettings: (settings: Partial<{ backgroundColor: string; width: number; height: number }>) => void;

    // Frontend code preview
    frontendGeneratedCode: Record<string, string> | null;
    frontendCodePreviewOpen: boolean;
    setFrontendGeneratedCode: (code: Record<string, string> | null) => void;
    setFrontendCodePreviewOpen: (open: boolean) => void;
}

// Helper to find element
const findElementById = (
    elements: ElementNode[],
    id: string
): ElementNode | undefined => {
    for (const el of elements) {
        if (el.id === id) return el;
        const found = findElementById(el.children, id);
        if (found) return found;
    }
    return undefined;
};

// Helper to get breadcrumb path
const findPathToElement = (
    elements: ElementNode[],
    targetId: string,
    path: { id: string; type: string; label?: string }[] = []
): { id: string; type: string; label?: string }[] | null => {
    for (const el of elements) {
        const currentPath = [...path, { id: el.id, type: el.type, label: el.label }];
        if (el.id === targetId) return currentPath;
        const found = findPathToElement(el.children, targetId, currentPath);
        if (found) return found;
    }
    return null;
};

// Collect all ids in a subtree
const collectElementIds = (element: ElementNode): string[] => {
    const ids: string[] = [element.id];
    element.children.forEach((child) => ids.push(...collectElementIds(child)));
    return ids;
};

const containsId = (element: ElementNode, id: string): boolean => {
    if (element.id === id) return true;
    for (const child of element.children) {
        if (containsId(child, id)) return true;
    }
    return false;
};

// Helper to update element in tree (preserve references when unchanged)
const updateElementInTree = (
    elements: ElementNode[],
    id: string,
    updates: Partial<ElementNode>
): ElementNode[] => {
    let changed = false;
    const next = elements.map((el) => {
        if (el.id === id) {
            changed = true;
            return { ...el, ...updates, children: updates.children ?? el.children };
        }
        const nextChildren = updateElementInTree(el.children, id, updates);
        if (nextChildren !== el.children) {
            changed = true;
            return { ...el, children: nextChildren };
        }
        return el;
    });
    return changed ? next : elements;
};

// Helper to delete element from tree (preserve references when unchanged)
const deleteElementFromTree = (
    elements: ElementNode[],
    id: string
): ElementNode[] => {
    let changed = false;
    const next: ElementNode[] = [];
    for (const el of elements) {
        if (el.id === id) {
            changed = true;
            continue;
        }
        const nextChildren = deleteElementFromTree(el.children, id);
        if (nextChildren !== el.children) {
            changed = true;
            next.push({ ...el, children: nextChildren });
        } else {
            next.push(el);
        }
    }
    return changed ? next : elements;
};

// Helper to add element to tree (preserve references when unchanged)
const addElementToTree = (
    elements: ElementNode[],
    element: ElementNode,
    parentId?: string
): ElementNode[] => {
    if (!parentId) return [...elements, element];
    let changed = false;
    const next = elements.map((el) => {
        if (el.id === parentId) {
            changed = true;
            return { ...el, children: [...el.children, element] };
        }
        const nextChildren = addElementToTree(el.children, element, parentId);
        if (nextChildren !== el.children) {
            changed = true;
            return { ...el, children: nextChildren };
        }
        return el;
    });
    return changed ? next : elements;
};

// Deep clone with new IDs
const deepCloneWithNewIds = (element: ElementNode): ElementNode => {
    return {
        ...element,
        id: uuidv4(),
        children: element.children.map(deepCloneWithNewIds),
    };
};

// Remove element and return it
const removeAndGetElement = (
    elements: ElementNode[],
    id: string
): { elements: ElementNode[]; removed: ElementNode | null } => {
    let removed: ElementNode | null = null;
    const newElements = elements
        .filter((el) => {
            if (el.id === id) { removed = el; return false; }
            return true;
        })
        .map((el) => {
            if (!removed) {
                const result = removeAndGetElement(el.children, id);
                if (result.removed) {
                    removed = result.removed;
                    return { ...el, children: result.elements };
                }
            }
            return el;
        });
    return { elements: newElements, removed };
};

// Insert element at index
const insertElementAtIndex = (
    elements: ElementNode[],
    element: ElementNode,
    parentId: string | null,
    index: number
): ElementNode[] => {
    if (!parentId) {
        const arr = [...elements];
        arr.splice(index, 0, element);
        return arr;
    }
    let changed = false;
    const next = elements.map((el) => {
        if (el.id === parentId) {
            const c = [...el.children];
            c.splice(index, 0, element);
            changed = true;
            return { ...el, children: c };
        }
        const nextChildren = insertElementAtIndex(el.children, element, parentId, index);
        if (nextChildren !== el.children) {
            changed = true;
            return { ...el, children: nextChildren };
        }
        return el;
    });
    return changed ? next : elements;
};

// Find parent of element
const findParentOf = (
    elements: ElementNode[],
    id: string,
    parent: ElementNode | null = null
): { parent: ElementNode | null; index: number } | null => {
    for (let i = 0; i < elements.length; i++) {
        if (elements[i].id === id) return { parent, index: i };
        const found = findParentOf(elements[i].children, id, elements[i]);
        if (found) return found;
    }
    return null;
};

// Reorder within a parent at any depth
const reorderInTree = (
    elements: ElementNode[],
    parentId: string | null,
    oldIndex: number,
    newIndex: number
): ElementNode[] => {
    if (!parentId) {
        const arr = [...elements];
        if (oldIndex < 0 || newIndex < 0 || oldIndex >= arr.length || newIndex >= arr.length) return elements;
        const [r] = arr.splice(oldIndex, 1);
        arr.splice(newIndex, 0, r);
        return arr;
    }
    let changed = false;
    const next = elements.map((el) => {
        if (el.id === parentId) {
            const c = [...el.children];
            if (oldIndex < 0 || newIndex < 0 || oldIndex >= c.length || newIndex >= c.length) return el;
            const [r] = c.splice(oldIndex, 1);
            c.splice(newIndex, 0, r);
            changed = true;
            return { ...el, children: c };
        }
        const nextChildren = reorderInTree(el.children, parentId, oldIndex, newIndex);
        if (nextChildren !== el.children) {
            changed = true;
            return { ...el, children: nextChildren };
        }
        return el;
    });
    return changed ? next : elements;
};

// Push a snapshot to history and mutate elements
const pushHistory = (state: EditorStore): { past: ElementNode[][]; future: ElementNode[][] } => {
    const newPast = [...state.past, state.elements].slice(-MAX_HISTORY);
    return { past: newPast, future: [] };
};

const defaultPageId = uuidv4();

export const useEditorStore = create<EditorStore>((set, get) => ({
    pages: [{ id: defaultPageId, title: "Home", route: "/", elements: [] }],
    activePageId: defaultPageId,
    elements: [],
    globalElements: [],
    selectedElementId: null,
    selectedElementIds: [],
    sidebarOpen: "add",
    clipboard: null,
    past: [],
    future: [],
    canUndo: false,
    canRedo: false,
    canvasSettings: { backgroundColor: "#ffffff", width: 1280, height: 900 },
    frontendGeneratedCode: null,
    frontendCodePreviewOpen: false,

    addElement: (elementData, parentId, dropX, dropY) => {
        const id = uuidv4();
        const defaults = DEFAULT_SIZES[elementData.type] || { w: 200, h: 100 };
        const existingCount = get().elements.length;
        const offsetX = dropX ?? 100 + (existingCount % 5) * 30;
        const offsetY = dropY ?? 100 + (existingCount % 5) * 30;
        set((state) => {
            const parentInGlobal = parentId ? Boolean(findElementById(state.globalElements, parentId)) : false;
            const parentNode = parentId
                ? (parentInGlobal
                    ? findElementById(state.globalElements, parentId)
                    : findElementById(state.elements, parentId))
                : undefined;
            const inFreeContainer = parentNode?.type === "container";
            const childX = Math.max(0, dropX ?? 0);
            const childY = Math.max(0, dropY ?? 0);
            const element: ElementNode = {
                ...elementData,
                id,
                styles: inFreeContainer
                    ? {
                        ...elementData.styles,
                        position: String(elementData.styles.position || "absolute"),
                    }
                    : elementData.styles,
                x: parentId ? (inFreeContainer ? childX : 0) : offsetX,
                y: parentId ? (inFreeContainer ? childY : 0) : offsetY,
                w: elementData.w || defaults.w,
                h: elementData.h || defaults.h,
                opacity: elementData.opacity ?? 1,
                rotation: elementData.rotation ?? 0,
                visible: elementData.visible ?? true,
                locked: elementData.locked ?? false,
                children: elementData.children?.map(deepCloneWithNewIds) || [],
            };

            if (parentInGlobal) {
                return {
                    globalElements: addElementToTree(state.globalElements, element, parentId),
                    selectedElementId: id,
                };
            }

            const validPageParent = parentId && findElementById(state.elements, parentId) ? parentId : undefined;
            const history = pushHistory(state);
            return {
                elements: addElementToTree(state.elements, element, validPageParent),
                selectedElementId: id,
                ...history,
                canUndo: true,
                canRedo: false,
            };
        });
        return id;
    },

    updateElement: (id, updates) => {
        set((state) => {
            if (findElementById(state.globalElements, id)) {
                return {
                    globalElements: updateElementInTree(state.globalElements, id, updates),
                };
            }

            if (!findElementById(state.elements, id)) return state;
            const history = pushHistory(state);
            return {
                elements: updateElementInTree(state.elements, id, updates),
                ...history,
                canUndo: true,
                canRedo: false,
            };
        });
    },

    updateElementPosition: (id, x, y) => {
        // Position updates are frequent during drag — don't push to history
        set((state) => {
            if (findElementById(state.globalElements, id)) {
                return {
                    globalElements: updateElementInTree(state.globalElements, id, { x, y }),
                };
            }

            if (!findElementById(state.elements, id)) return state;
            return {
                elements: updateElementInTree(state.elements, id, { x, y }),
            };
        });
    },

    updateElementSize: (id, w, h) => {
        // Size updates are frequent during resize — don't push to history
        set((state) => {
            if (findElementById(state.globalElements, id)) {
                return {
                    globalElements: updateElementInTree(state.globalElements, id, { w, h }),
                };
            }

            if (!findElementById(state.elements, id)) return state;
            return {
                elements: updateElementInTree(state.elements, id, { w, h }),
            };
        });
    },

    updateElementOpacity: (id, opacity) => {
        set((state) => {
            if (findElementById(state.globalElements, id)) {
                return {
                    globalElements: updateElementInTree(state.globalElements, id, { opacity }),
                };
            }

            if (!findElementById(state.elements, id)) return state;
            const history = pushHistory(state);
            return {
                elements: updateElementInTree(state.elements, id, { opacity }),
                ...history,
                canUndo: true,
                canRedo: false,
            };
        });
    },

    updateElementRotation: (id, rotation) => {
        set((state) => {
            if (findElementById(state.globalElements, id)) {
                return {
                    globalElements: updateElementInTree(state.globalElements, id, { rotation }),
                };
            }

            if (!findElementById(state.elements, id)) return state;
            const history = pushHistory(state);
            return {
                elements: updateElementInTree(state.elements, id, { rotation }),
                ...history,
                canUndo: true,
                canRedo: false,
            };
        });
    },

    updateElementRotationLive: (id, rotation) => {
        // Rotation updates are frequent during drag — don't push to history
        set((state) => {
            if (findElementById(state.globalElements, id)) {
                return {
                    globalElements: updateElementInTree(state.globalElements, id, { rotation }),
                };
            }

            if (!findElementById(state.elements, id)) return state;
            return {
                elements: updateElementInTree(state.elements, id, { rotation }),
            };
        });
    },

    toggleVisibility: (id) => {
        set((state) => {
            const globalEl = findElementById(state.globalElements, id);
            if (globalEl) {
                return {
                    globalElements: updateElementInTree(state.globalElements, id, { visible: !globalEl.visible }),
                };
            }

            const el = findElementById(state.elements, id);
            if (!el) return state;
            const history = pushHistory(state);
            return {
                elements: updateElementInTree(state.elements, id, { visible: !el.visible }),
                ...history,
                canUndo: true,
                canRedo: false,
            };
        });
    },

    toggleLock: (id) => {
        set((state) => {
            const globalEl = findElementById(state.globalElements, id);
            if (globalEl) {
                return {
                    globalElements: updateElementInTree(state.globalElements, id, { locked: !globalEl.locked }),
                };
            }

            const el = findElementById(state.elements, id);
            if (!el) return state;
            const history = pushHistory(state);
            return {
                elements: updateElementInTree(state.elements, id, { locked: !el.locked }),
                ...history,
                canUndo: true,
                canRedo: false,
            };
        });
    },

    deleteElement: (id) => {
        set((state) => {
            const globalEl = findElementById(state.globalElements, id);
            if (globalEl) {
                const removedIds = collectElementIds(globalEl);
                return {
                    globalElements: deleteElementFromTree(state.globalElements, id),
                    selectedElementId: removedIds.includes(state.selectedElementId || "") ? null : state.selectedElementId,
                    selectedElementIds: state.selectedElementIds.filter((sid) => !removedIds.includes(sid)),
                };
            }

            const pageEl = findElementById(state.elements, id);
            if (!pageEl) return state;
            const removedIds = collectElementIds(pageEl);
            const history = pushHistory(state);
            return {
                elements: deleteElementFromTree(state.elements, id),
                selectedElementId: removedIds.includes(state.selectedElementId || "") ? null : state.selectedElementId,
                selectedElementIds: state.selectedElementIds.filter((sid) => !removedIds.includes(sid)),
                ...history,
                canUndo: true,
                canRedo: false,
            };
        });
    },

    duplicateElement: (id) => {
        const state = get();
        const pageElement = findElementById(state.elements, id);
        if (pageElement) {
            const clone = deepCloneWithNewIds(pageElement);
            clone.x += 20;
            clone.y += 20;
            const parentInfo = findParentOf(state.elements, id);
            const parentId = parentInfo?.parent?.id;

            set((s) => {
                const history = pushHistory(s);
                return {
                    elements: addElementToTree(s.elements, clone, parentId),
                    selectedElementId: clone.id,
                    ...history,
                    canUndo: true,
                    canRedo: false,
                };
            });
            return;
        }

        const globalElement = findElementById(state.globalElements, id);
        if (!globalElement) return;

        const clone = deepCloneWithNewIds(globalElement);
        clone.x += 20;
        clone.y += 20;
        const parentInfo = findParentOf(state.globalElements, id);
        const parentId = parentInfo?.parent?.id;

        set((s) => ({
            globalElements: addElementToTree(s.globalElements, clone, parentId),
            selectedElementId: clone.id,
        }));
    },

    moveElement: (id, targetParentId, index) => {
        set((state) => {
            const element = findElementById(state.elements, id);
            if (!element) return state;
            if (targetParentId && containsId(element, targetParentId)) return state;
            if (targetParentId && !findElementById(state.elements, targetParentId)) return state;
            const history = pushHistory(state);
            const { elements, removed } = removeAndGetElement(state.elements, id);
            if (!removed) return state;
            return {
                elements: insertElementAtIndex(elements, removed, targetParentId, index),
                ...history,
                canUndo: true,
                canRedo: false,
            };
        });
    },

    moveGlobalElement: (id, targetParentId, index) => {
        set((state) => {
            const element = findElementById(state.globalElements, id);
            if (!element) return state;
            if (targetParentId && containsId(element, targetParentId)) return state;
            if (targetParentId && !findElementById(state.globalElements, targetParentId)) return state;
            const { elements, removed } = removeAndGetElement(state.globalElements, id);
            if (!removed) return state;
            return {
                globalElements: insertElementAtIndex(elements, removed, targetParentId, index),
            };
        });
    },

    selectElement: (id) => {
        set({ selectedElementId: id, selectedElementIds: id ? [id] : [] });
    },

    selectElements: (ids) => {
        const unique = Array.from(new Set(ids));
        set({
            selectedElementIds: unique,
            selectedElementId: unique.length > 0 ? unique[unique.length - 1] : null,
        });
    },

    toggleSelectElement: (id) => {
        set((state) => {
            const exists = state.selectedElementIds.includes(id);
            const nextIds = exists
                ? state.selectedElementIds.filter((sid) => sid !== id)
                : [...state.selectedElementIds, id];
            const nextPrimary = nextIds.length > 0 ? nextIds[nextIds.length - 1] : null;
            return {
                selectedElementIds: nextIds,
                selectedElementId: nextPrimary,
            };
        });
    },

    setSidebarOpen: (categoryId) => {
        set({ sidebarOpen: categoryId });
    },

    reorderElements: (parentId, oldIndex, newIndex) => {
        set((state) => {
            if (oldIndex === newIndex) return state;
            if (parentId && !findElementById(state.elements, parentId)) return state;
            const history = pushHistory(state);
            const nextElements = reorderInTree(state.elements, parentId, oldIndex, newIndex);
            if (nextElements === state.elements) return state;
            return { elements: nextElements, ...history, canUndo: true, canRedo: false };
        });
    },

    reorderGlobalElements: (parentId, oldIndex, newIndex) => {
        set((state) => {
            if (oldIndex === newIndex) return state;
            if (parentId && !findElementById(state.globalElements, parentId)) return state;
            const nextElements = reorderInTree(state.globalElements, parentId, oldIndex, newIndex);
            if (nextElements === state.globalElements) return state;
            return { globalElements: nextElements };
        });
    },

    undo: () => {
        set((state) => {
            if (state.past.length === 0) return state;
            const newPast = [...state.past];
            const previous = newPast.pop()!;
            return {
                past: newPast,
                elements: previous,
                future: [state.elements, ...state.future],
                canUndo: newPast.length > 0,
                canRedo: true,
            };
        });
    },

    redo: () => {
        set((state) => {
            if (state.future.length === 0) return state;
            const newFuture = [...state.future];
            const next = newFuture.shift()!;
            return {
                future: newFuture,
                elements: next,
                past: [...state.past, state.elements],
                canUndo: true,
                canRedo: newFuture.length > 0,
            };
        });
    },

    getElement: (id) => {
        const found = findElementById(get().elements, id);
        if (found) return found;
        return findElementById(get().globalElements, id);
    },

    getSelectedElement: () => {
        const { selectedElementId, elements, globalElements } = get();
        if (!selectedElementId) return undefined;
        return findElementById(elements, selectedElementId) || findElementById(globalElements, selectedElementId);
    },

    getBreadcrumbPath: (id) => {
        return findPathToElement(get().elements, id) || findPathToElement(get().globalElements, id) || [];
    },

    // ─── Arrange (z-order) ───
    bringForward: (id) => {
        const state = get();
        const info = findParentOf(state.elements, id);
        if (!info) return;
        const siblings = info.parent ? info.parent.children : state.elements;
        if (info.index >= siblings.length - 1) return;
        get().reorderElements(info.parent?.id ?? null, info.index, info.index + 1);
    },

    sendBackward: (id) => {
        const state = get();
        const info = findParentOf(state.elements, id);
        if (!info || info.index <= 0) return;
        get().reorderElements(info.parent?.id ?? null, info.index, info.index - 1);
    },

    bringToFront: (id) => {
        const state = get();
        const info = findParentOf(state.elements, id);
        if (!info) return;
        const siblings = info.parent ? info.parent.children : state.elements;
        if (info.index >= siblings.length - 1) return;
        get().reorderElements(info.parent?.id ?? null, info.index, siblings.length - 1);
    },

    sendToBack: (id) => {
        const state = get();
        const info = findParentOf(state.elements, id);
        if (!info || info.index <= 0) return;
        get().reorderElements(info.parent?.id ?? null, info.index, 0);
    },

    // ─── Clipboard ───
    copyElement: (id) => {
        const el = findElementById(get().elements, id) || findElementById(get().globalElements, id);
        if (el) set({ clipboard: el });
    },

    cutElement: (id) => {
        const el = findElementById(get().elements, id) || findElementById(get().globalElements, id);
        if (el) {
            set({ clipboard: el });
            get().deleteElement(id);
        }
    },

    pasteElement: () => {
        const { clipboard } = get();
        if (!clipboard) return;
        const clone = deepCloneWithNewIds(clipboard);
        clone.x += 20;
        clone.y += 20;
        set((state) => {
            const history = pushHistory(state);
            return {
                elements: [...state.elements, clone],
                selectedElementId: clone.id,
                ...history,
                canUndo: true,
                canRedo: false,
            };
        });
    },

    // ─── Pages ───
    addPage: (title) => {
        const id = uuidv4();
        const pageCount = get().pages.length;
        const newPage: Page = {
            id,
            title: title || `Page ${pageCount + 1}`,
            route: `/page-${pageCount + 1}`,
            elements: [],
        };
        set((state) => {
            // Save current page's elements
            const updatedPages = state.pages.map((p) =>
                p.id === state.activePageId ? { ...p, elements: state.elements } : p
            );
            return {
                pages: [...updatedPages, newPage],
                activePageId: id,
                elements: [],
                selectedElementId: null,
                past: [],
                future: [],
                canUndo: false,
                canRedo: false,
            };
        });
        return id;
    },

    deletePage: (id) => {
        const state = get();
        if (state.pages.length <= 1) return; // Can't delete last page
        const remaining = state.pages.filter((p) => p.id !== id);
        const switchTo = id === state.activePageId ? remaining[0] : remaining.find((p) => p.id === state.activePageId) || remaining[0];
        set({
            pages: remaining,
            activePageId: switchTo.id,
            elements: switchTo.elements,
            selectedElementId: null,
            past: [],
            future: [],
            canUndo: false,
            canRedo: false,
        });
    },

    renamePage: (id, title) => {
        set((state) => ({
            pages: state.pages.map((p) => (p.id === id ? { ...p, title } : p)),
        }));
    },

    switchPage: (id) => {
        const state = get();
        if (id === state.activePageId) return;
        const targetPage = state.pages.find((p) => p.id === id);
        if (!targetPage) return;
        // Save current page's elements
        const updatedPages = state.pages.map((p) =>
            p.id === state.activePageId ? { ...p, elements: state.elements } : p
        );
        set({
            pages: updatedPages,
            activePageId: id,
            elements: targetPage.elements,
            selectedElementId: null,
            past: [],
            future: [],
            canUndo: false,
            canRedo: false,
        });
    },

    // ─── Global Elements ───
    addGlobalElement: (elementData) => {
        const id = uuidv4();
        const defaults = DEFAULT_SIZES[elementData.type] || { w: 200, h: 100 };
        const element: ElementNode = {
            ...elementData,
            id,
            x: 0,
            y: 0,
            w: elementData.w || defaults.w,
            h: elementData.h || defaults.h,
            opacity: elementData.opacity ?? 1,
            rotation: elementData.rotation ?? 0,
            visible: elementData.visible ?? true,
            locked: elementData.locked ?? false,
            children: elementData.children?.map(deepCloneWithNewIds) || [],
        };
        set((state) => ({
            globalElements: [...state.globalElements, element],
            selectedElementId: id,
        }));
        return id;
    },

    deleteGlobalElement: (id) => {
        set((state) => {
            const globalEl = findElementById(state.globalElements, id);
            if (!globalEl) return state;
            const removedIds = collectElementIds(globalEl);
            return {
                globalElements: deleteElementFromTree(state.globalElements, id),
                selectedElementId: removedIds.includes(state.selectedElementId || "") ? null : state.selectedElementId,
                selectedElementIds: state.selectedElementIds.filter((sid) => !removedIds.includes(sid)),
            };
        });
    },

    // ─── Templates ───
    loadTemplate: (templateElements) => {
        set((state) => {
            const history = pushHistory(state);
            // Deep-clone each template element with fresh IDs
            const cloned = templateElements.map((el) => {
                const withId: ElementNode = {
                    ...el,
                    id: uuidv4(),
                    children: el.children?.map(deepCloneWithNewIds) || [],
                };
                return withId;
            });
            return {
                elements: cloned,
                selectedElementId: null,
                ...history,
                canUndo: true,
                canRedo: false,
            };
        });
    },

    // ─── Canvas Settings ───
    updateCanvasSettings: (settings) => {
        set((state) => ({
            canvasSettings: { ...state.canvasSettings, ...settings },
        }));
    },

    setFrontendGeneratedCode: (code) => set({ frontendGeneratedCode: code }),
    setFrontendCodePreviewOpen: (open) => set({ frontendCodePreviewOpen: open }),
}));
