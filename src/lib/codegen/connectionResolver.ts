// ═══════════════════════════════════════════════════
// Code Generation — Connection Resolver
// Resolves routing canvas connections into structured
// wiring data for code generation.
// ═══════════════════════════════════════════════════

import { RoutingNode, RoutingConnection, NodePort } from "@/types/routing";
import { ServiceContainer, EndpointConfig } from "@/types/backend";
import { Page, ElementNode } from "@/types";

// ─── Wiring Types ───

export interface EndpointTarget {
    kind: "endpoint";
    method: string;          // GET, POST, PUT, DELETE, PATCH
    route: string;           // /api/users
    serviceName: string;     // user-service
    servicePort: number;     // 3001
}

export interface PageTarget {
    kind: "page";
    pageTitle: string;
    pageRoute: string;       // /about
}

export type WiringTarget = EndpointTarget | PageTarget;

export interface ElementWiring {
    elementId: string;
    elementType: string;     // button, form, image, menu
    target: WiringTarget;
}

// ─── Resolver ───

/**
 * Resolves routing connections into a flat list of element wirings.
 * Each wiring maps a frontend element to its target (endpoint or page).
 */
export function resolveConnections(
    nodes: RoutingNode[],
    connections: RoutingConnection[],
    pages: Page[],
    activeElements: ElementNode[],
    activePageId: string,
    services: ServiceContainer[],
    getPortsForNode: (nodeId: string) => NodePort[]
): ElementWiring[] {
    const wirings: ElementWiring[] = [];

    for (const conn of connections) {
        // Parse port IDs — format is "nodeId:out:elementId" or "nodeId:in:blockId" or "nodeId:in:page"
        const fromParts = conn.fromPortId.split(":");
        const toParts = conn.toPortId.split(":");

        // fromParts: [nodeId, "out", elementOrBlockId]
        // toParts:   [nodeId, "in", blockIdOrPage]
        if (fromParts.length < 3 || toParts.length < 3) continue;

        const fromNodeId = conn.fromNodeId;
        const toNodeId = conn.toNodeId;
        const fromNode = nodes.find((n) => n.id === fromNodeId);
        const toNode = nodes.find((n) => n.id === toNodeId);
        if (!fromNode || !toNode) continue;

        // ── Case 1: Page element → Service endpoint ──
        if (fromNode.type === "page" && toNode.type === "service") {
            const elementId = fromParts[2];          // the element that triggers
            const blockId = toParts[2];              // the endpoint block

            // Find the element type by searching all pages
            const elementType = findElementType(elementId, pages, activeElements, activePageId);
            if (!elementType) continue;

            // Find the service and endpoint block
            const service = services.find((s) => s.id === toNode.refId);
            if (!service) continue;
            const block = service.blocks.find((b) => b.id === blockId);
            if (!block || block.type !== "rest_endpoint") continue;

            const endpointConfig = block.config as EndpointConfig;
            wirings.push({
                elementId,
                elementType,
                target: {
                    kind: "endpoint",
                    method: endpointConfig.method,
                    route: endpointConfig.route,
                    serviceName: service.name.toLowerCase().replace(/\s+/g, "-"),
                    servicePort: service.port,
                },
            });
        }

        // ── Case 2: Any element → Page (navigation) ──
        if (toNode.type === "page" && toParts[2] === "page") {
            const page = pages.find((p) => p.id === toNode.refId);
            if (!page) continue;

            // The from port could be from a page element or a service response
            if (fromNode.type === "page") {
                const elementId = fromParts[2];
                const elementType = findElementType(elementId, pages, activeElements, activePageId);
                if (!elementType) continue;

                wirings.push({
                    elementId,
                    elementType,
                    target: {
                        kind: "page",
                        pageTitle: page.title,
                        pageRoute: page.route,
                    },
                });
            }
        }
    }

    return wirings;
}

// ─── Helpers ───

/**
 * Finds the type of an element by searching through all pages and active elements.
 */
function findElementType(
    elementId: string,
    pages: Page[],
    activeElements: ElementNode[],
    activePageId: string
): string | null {
    // Search active elements first
    const found = findInTree(activeElements, elementId);
    if (found) return found.type;

    // Search through all pages
    for (const page of pages) {
        if (page.id === activePageId) continue; // already checked via activeElements
        const el = findInTree(page.elements, elementId);
        if (el) return el.type;
    }

    return null;
}

function findInTree(elements: ElementNode[], id: string): ElementNode | null {
    for (const el of elements) {
        if (el.id === id) return el;
        if (el.children && el.children.length > 0) {
            const child = findInTree(el.children, id);
            if (child) return child;
        }
    }
    return null;
}
