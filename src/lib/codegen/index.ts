// ═══════════════════════════════════════════════════
// Code Generation — Orchestrator
// ═══════════════════════════════════════════════════

import { ServiceContainer, ConnectionEdge } from "@/types/backend";
import { generateServiceCode } from "./express";
import { DOCKER_COMPOSE_TEMPLATE, README_TEMPLATE } from "./templates";

/**
 * Generate all code files for the entire backend project.
 * Returns a flat file map: { "path/to/file.js": "content" }
 */
export function generateProject(
    services: ServiceContainer[],
    connections: ConnectionEdge[]
): Record<string, string> {
    const allFiles: Record<string, string> = {};

    // Generate code for each service
    for (const service of services) {
        const serviceFiles = generateServiceCode(service);
        Object.assign(allFiles, serviceFiles);
    }

    // Docker Compose (if multiple services)
    if (services.length > 0) {
        allFiles["docker-compose.yml"] = DOCKER_COMPOSE_TEMPLATE(
            services.map((s) => ({
                name: s.name,
                port: s.port,
            }))
        );
    }

    // README
    allFiles["README.md"] = README_TEMPLATE(
        "Backend Project",
        services.map((s) => ({
            name: s.name,
            port: s.port,
            description: s.description,
        }))
    );

    return allFiles;
}
