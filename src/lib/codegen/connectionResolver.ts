// ═══════════════════════════════════════════════════
// Code Generation — Connection Resolver (ADAPTER)
// ═══════════════════════════════════════════════════
//
// @deprecated — This module is a backward-compatible adapter.
// New code should use resolveGraph() from graphResolver.ts directly.
//
// Internally delegates to the unified graph resolver and converts
// FlowGraph → ElementWiring[] for legacy callers.
//

import { RoutingNode, RoutingConnection, NodePort } from "@/types/routing";
import { ServiceContainer, EndpointConfig } from "@/types/backend";
import { Page, ElementNode } from "@/types";
import { resolveGraph, GraphResolverInput } from "@/lib/graphResolver";
import { FlowGraph, Flow, ApiCallStep, NavigateStep } from "@/types/ir";

// ─── Wiring Types (kept for backward compat) ───

export interface EndpointTarget {
    kind: "endpoint";
    method: string;
    route: string;
    serviceName: string;
    servicePort: number;
}

export interface PageTarget {
    kind: "page";
    pageTitle: string;
    pageRoute: string;
}

export type WiringTarget = EndpointTarget | PageTarget;

export interface ElementWiring {
    elementId: string;
    elementType: string;
    target: WiringTarget;
}

// ─── Adapter: FlowGraph → ElementWiring[] ───

/**
 * Convert a FlowGraph into the legacy ElementWiring[] format.
 * Each flow produces one wiring entry based on its first actionable step.
 *
 * For multi-step flows (e.g. api_call → navigate), only the primary target
 * is exposed as an ElementWiring. Full multi-step semantics are available
 * through the FlowGraph directly.
 */
export function flowGraphToWirings(graph: FlowGraph): ElementWiring[] {
    const wirings: ElementWiring[] = [];

    for (const flow of graph.flows) {
        // Find the primary target step
        const apiStep = flow.steps.find((s) => s.type === "api_call") as ApiCallStep | undefined;
        const navStep = flow.steps.find((s) => s.type === "navigate") as NavigateStep | undefined;

        if (apiStep) {
            wirings.push({
                elementId: flow.trigger.elementId,
                elementType: flow.trigger.elementType,
                target: {
                    kind: "endpoint",
                    method: apiStep.method,
                    route: apiStep.endpoint,
                    serviceName: apiStep.serviceName,
                    servicePort: apiStep.servicePort,
                },
            });
        } else if (navStep) {
            wirings.push({
                elementId: flow.trigger.elementId,
                elementType: flow.trigger.elementType,
                target: {
                    kind: "page",
                    pageTitle: navStep.pageTitle,
                    pageRoute: navStep.pageRoute,
                },
            });
        }
    }

    return wirings;
}

// ─── Legacy Resolver (adapter) ───

/**
 * @deprecated Use resolveGraph() from graphResolver.ts instead.
 *
 * Resolves routing connections into a flat list of element wirings.
 * Internally delegates to the unified graph resolver.
 */
export function resolveConnections(
    nodes: RoutingNode[],
    connections: RoutingConnection[],
    pages: Page[],
    activeElements: ElementNode[],
    activePageId: string,
    services: ServiceContainer[],
    _getPortsForNode: (nodeId: string) => NodePort[]
): ElementWiring[] {
    const input: GraphResolverInput = {
        nodes,
        connections,
        pages,
        activePageId,
        activeElements,
        services,
    };

    const graph = resolveGraph(input);
    return flowGraphToWirings(graph);
}
