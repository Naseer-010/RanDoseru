// ═══════════════════════════════════════════════════
// Routing Engine — Resolves connections at runtime
// ═══════════════════════════════════════════════════
//
// Given the routing canvas connections and the current form/action context,
// this engine determines:
//   1. What service block to invoke
//   2. What to do with the response (navigate to page, pass data, etc.)
//

import { useRoutingStore } from "@/store/routingStore";
import { useEditorStore } from "@/store/editorStore";
import { useBackendStore } from "@/store/backendStore";
import { RoutingConnection, RoutingNode, NodePort } from "@/types/routing";
import { BackendBlock, ServiceContainer } from "@/types/backend";

// ─── Route Resolution ───

export interface ResolvedRoute {
    // Connection chain: element → service → target page
    sourceElementId: string;
    sourcePageId: string;
    // Intermediate service (may be null for page→page)
    service?: ServiceContainer;
    block?: BackendBlock;
    // Target navigation
    targetPageId?: string;
    targetPageTitle?: string;
    // All connections in the chain
    connections: RoutingConnection[];
}

/**
 * For a given actionable element on a given page, trace the routing connections
 * to find what happens when the element is activated (click/submit).
 */
export function resolveRouteForElement(
    elementId: string,
    pageId: string
): ResolvedRoute | null {
    const routingState = useRoutingStore.getState();
    const editorState = useEditorStore.getState();
    const backendState = useBackendStore.getState();

    const { nodes, connections } = routingState;

    // 1. Find the page node on the canvas
    const pageNode = nodes.find((n) => n.type === "page" && n.refId === pageId);
    if (!pageNode) return null;

    // 2. Find the output port for this element
    const outputPortId = `${pageNode.id}:out:${elementId}`;

    // 3. Find connection from this port
    const outConn = connections.find((c) => c.fromPortId === outputPortId);
    if (!outConn) return null;

    const result: ResolvedRoute = {
        sourceElementId: elementId,
        sourcePageId: pageId,
        connections: [outConn],
    };

    // 4. Determine what the element connects to
    const targetNode = nodes.find((n) => n.id === outConn.toNodeId);
    if (!targetNode) return null;

    if (targetNode.type === "page") {
        // Direct page→page navigation
        const page = editorState.pages.find((p) => p.id === targetNode.refId);
        result.targetPageId = targetNode.refId;
        result.targetPageTitle = page?.title;
        return result;
    }

    if (targetNode.type === "service") {
        // Element → Service block
        const service = backendState.services.find((s) => s.id === targetNode.refId);
        if (service) {
            result.service = service;
            // Find which block the port targets
            const portIdParts = outConn.toPortId.split(":");
            const blockId = portIdParts[portIdParts.length - 1];
            const block = service.blocks.find((b) => b.id === blockId);
            result.block = block;

            // 5. Now check if the service has an outgoing connection to a page
            //    (response → page navigation)
            const serviceOutputPorts = connections.filter(
                (c) => c.fromNodeId === targetNode.id
            );
            for (const serviceConn of serviceOutputPorts) {
                const destNode = nodes.find((n) => n.id === serviceConn.toNodeId);
                if (destNode?.type === "page") {
                    const page = editorState.pages.find((p) => p.id === destNode.refId);
                    result.targetPageId = destNode.refId;
                    result.targetPageTitle = page?.title;
                    result.connections.push(serviceConn);
                    break;
                }
            }
        }
        return result;
    }

    return null;
}

/**
 * Resolve all routes for all actionable elements across all pages.
 * Returns a map: elementId → ResolvedRoute
 */
export function resolveAllRoutes(): Map<string, ResolvedRoute> {
    const routeMap = new Map<string, ResolvedRoute>();
    const routingState = useRoutingStore.getState();
    const { nodes, connections } = routingState;

    // For each page node on the canvas
    const pageNodes = nodes.filter((n) => n.type === "page");
    for (const pageNode of pageNodes) {
        // Find all output connections from this page
        const outConns = connections.filter((c) => c.fromNodeId === pageNode.id);
        for (const conn of outConns) {
            // Extract element ID from port ID: "nodeId:out:elementId"
            const parts = conn.fromPortId.split(":");
            if (parts.length >= 3 && parts[1] === "out") {
                const elementId = parts.slice(2).join(":");
                const route = resolveRouteForElement(elementId, pageNode.refId);
                if (route) {
                    routeMap.set(elementId, route);
                }
            }
        }
    }

    return routeMap;
}

/**
 * Simulate a backend service block execution.
 * Returns a simulated response based on block type/config.
 */
export function simulateServiceBlock(
    block: BackendBlock,
    inputData: Record<string, string>
): { success: boolean; data: Record<string, unknown>; message: string } {
    switch (block.type) {
        case "auth_block": {
            // Simulate authentication — check if username/email and password exist
            const hasCredentials = Object.values(inputData).some(
                (v) => v && v.trim().length > 0
            );
            if (hasCredentials) {
                return {
                    success: true,
                    data: { token: "sim_jwt_" + Date.now(), authenticated: true },
                    message: "Authentication successful",
                };
            }
            return {
                success: false,
                data: {},
                message: "Authentication failed — missing credentials",
            };
        }

        case "logic_if": {
            // If/else — pass if input data is non-empty
            const condition = Object.values(inputData).some(
                (v) => v && v.trim().length > 0
            );
            return {
                success: condition,
                data: { condition, inputData },
                message: condition ? "Condition met" : "Condition not met",
            };
        }

        case "rest_endpoint": {
            return {
                success: true,
                data: { received: inputData, status: 200 },
                message: `${block.label} processed`,
            };
        }

        case "db_model": {
            return {
                success: true,
                data: { id: "sim_" + Date.now(), ...inputData, createdAt: new Date().toISOString() },
                message: `Record created in ${block.label}`,
            };
        }

        case "validation": {
            const allFilled = Object.values(inputData).every(
                (v) => v && v.trim().length > 0
            );
            return {
                success: allFilled,
                data: { valid: allFilled, inputData },
                message: allFilled ? "Validation passed" : "Validation failed — empty fields",
            };
        }

        case "middleware": {
            return {
                success: true,
                data: { processed: true, inputData },
                message: "Middleware processed",
            };
        }

        default: {
            return {
                success: true,
                data: inputData,
                message: `${block.type} processed`,
            };
        }
    }
}
