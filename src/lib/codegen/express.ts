// ═══════════════════════════════════════════════════
// Code Generation — Express.js Generator
// ═══════════════════════════════════════════════════

import {
    ServiceContainer,
    BackendBlock,
    EndpointConfig,
    DbModelConfig,
    MiddlewareConfig,
    AuthConfig,
    SchemaField,
} from "@/types/backend";
import {
    PACKAGE_JSON_TEMPLATE,
    SERVER_TEMPLATE,
    MODEL_TEMPLATE,
    ROUTE_TEMPLATE,
    AUTH_MIDDLEWARE_TEMPLATE,
    CONTROLLER_TEMPLATE,
    ENV_TEMPLATE,
    DOCKERFILE_TEMPLATE,
} from "./templates";

// ─── Field type → Mongoose type ───
function mongooseType(type: SchemaField["type"]): string {
    switch (type) {
        case "string": return "String";
        case "number": return "Number";
        case "boolean": return "Boolean";
        case "date": return "Date";
        case "object": return "mongoose.Schema.Types.Mixed";
        case "array": return "[mongoose.Schema.Types.Mixed]";
        case "objectId": return "mongoose.Schema.Types.ObjectId";
        default: return "String";
    }
}

// ─── Generate model file ───
function generateModel(block: BackendBlock): string {
    const config = block.config as DbModelConfig;
    const fields = config.fields.map((f) => {
        let fieldDef = `    ${f.name}: {\n      type: ${mongooseType(f.type)}`;
        if (f.required) fieldDef += `,\n      required: true`;
        if (f.defaultValue) fieldDef += `,\n      default: '${f.defaultValue}'`;
        if (f.ref) fieldDef += `,\n      ref: '${f.ref}'`;
        fieldDef += `\n    }`;
        return fieldDef;
    }).join(",\n");

    const opts: string[] = [];
    if (config.timestamps) opts.push("  timestamps: true");

    return MODEL_TEMPLATE(config.tableName, fields);
}

// ─── Generate route handler for an endpoint ───
function generateEndpointHandler(block: BackendBlock, models: string[]): string {
    const config = block.config as EndpointConfig;
    const method = config.method.toLowerCase();
    const modelName = models.length > 0 ? models[0] : null;

    // Build handler body based on method
    let handlerBody: string;
    if (modelName) {
        switch (config.method) {
            case "GET":
                if (config.route.includes(":id")) {
                    handlerBody = `  try {
    const item = await ${modelName}.findById(req.params.id);
    if (!item) return res.status(404).json({ error: '${modelName} not found' });
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }`;
                } else {
                    handlerBody = `  try {
    const items = await ${modelName}.find(req.query);
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }`;
                }
                break;
            case "POST":
                handlerBody = `  try {
    const item = new ${modelName}(req.body);
    await item.save();
    res.status(201).json(item);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }`;
                break;
            case "PUT":
                handlerBody = `  try {
    const item = await ${modelName}.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!item) return res.status(404).json({ error: '${modelName} not found' });
    res.json(item);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }`;
                break;
            case "DELETE":
                handlerBody = `  try {
    const item = await ${modelName}.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ error: '${modelName} not found' });
    res.json({ message: '${modelName} deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }`;
                break;
            default:
                handlerBody = `  try {
    const item = await ${modelName}.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!item) return res.status(404).json({ error: '${modelName} not found' });
    res.json(item);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }`;
        }
    } else {
        handlerBody = `  try {
    res.json({ message: '${config.description || block.label}' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }`;
    }

    const authMiddleware = config.authRequired ? "auth, " : "";
    return `router.${method}('${config.route}', ${authMiddleware}async (req, res) => {\n${handlerBody}\n});`;
}

// ─── Generate middleware setup ───
function generateMiddlewareSetup(block: BackendBlock): string {
    const config = block.config as MiddlewareConfig;
    switch (config.middlewareType) {
        case "cors":
            return `app.use(cors({ origin: '${config.corsOrigins || "*"}' }));`;
        case "rateLimit":
            return `const rateLimit = require('express-rate-limit');\napp.use(rateLimit({ windowMs: ${(config.rateLimitWindow || 15) * 60 * 1000}, max: ${config.rateLimit || 100} }));`;
        case "helmet":
            return `app.use(helmet());`;
        case "logger":
            return `// Logger already set up with morgan`;
        case "bodyParser":
            return `// Body parser already configured`;
        case "custom":
            return config.customCode || "// Custom middleware";
        default:
            return "";
    }
}

// ─── Main generator for a single service ───
export function generateServiceCode(service: ServiceContainer): Record<string, string> {
    const files: Record<string, string> = {};
    const servicePath = service.name.toLowerCase().replace(/\s+/g, "-");

    // Separate blocks by type
    const endpoints = service.blocks.filter((b) => b.type === "rest_endpoint");
    const models = service.blocks.filter((b) => b.type === "db_model");
    const middlewares = service.blocks.filter((b) => b.type === "middleware");
    const authBlocks = service.blocks.filter((b) => b.type === "auth_block");
    const envVars = service.blocks.filter((b) => b.type === "env_var");

    const modelNames = models.map((m) => (m.config as DbModelConfig).tableName);

    // 1. Generate models
    models.forEach((model) => {
        const config = model.config as DbModelConfig;
        files[`${servicePath}/models/${config.tableName}.js`] = generateModel(model);
    });

    // 2. Generate auth middleware if needed
    const hasAuth = authBlocks.length > 0 || endpoints.some((e) => (e.config as EndpointConfig).authRequired);
    if (hasAuth) {
        files[`${servicePath}/middleware/auth.js`] = AUTH_MIDDLEWARE_TEMPLATE();
    }

    // 3. Generate routes
    if (endpoints.length > 0) {
        const modelImports = modelNames
            .map((n) => `const ${n} = require('../models/${n}');`)
            .join("\n");
        const authImport = hasAuth ? "const auth = require('../middleware/auth');\n" : "";
        const endpointCode = endpoints
            .map((e) => generateEndpointHandler(e, modelNames))
            .join("\n\n");

        files[`${servicePath}/routes/index.js`] = `const express = require('express');\nconst router = express.Router();\n${authImport}${modelImports}\n\n${endpointCode}\n\nmodule.exports = router;`;
    }

    // 4. Generate server.js
    const middlewareSetup = middlewares.map((m) => generateMiddlewareSetup(m)).join("\n");
    const routeImport = endpoints.length > 0 ? "const routes = require('./routes');" : "";
    const routeSetup = endpoints.length > 0 ? "app.use('/', routes);" : "// No routes configured";

    files[`${servicePath}/server.js`] = SERVER_TEMPLATE(
        service.port,
        routeImport,
        middlewareSetup,
        routeSetup
    );

    // 5. package.json
    files[`${servicePath}/package.json`] = PACKAGE_JSON_TEMPLATE(service.name, service.port);

    // 6. .env
    const envMap: Record<string, string> = {
        PORT: String(service.port),
        MONGO_URI: `mongodb://localhost:27017/${servicePath.replace(/-/g, "_")}_db`,
        NODE_ENV: "development",
    };
    if (hasAuth) {
        const authConfig = authBlocks[0]?.config as AuthConfig | undefined;
        envMap.JWT_SECRET = authConfig?.secretKey || "your-secret-key";
        envMap.JWT_EXPIRY = authConfig?.tokenExpiry || "7d";
    }
    envVars.forEach((e) => {
        const cfg = e.config as { key: string; value: string };
        envMap[cfg.key] = cfg.value;
    });
    files[`${servicePath}/.env`] = ENV_TEMPLATE(envMap);

    // 7. .gitignore
    files[`${servicePath}/.gitignore`] = `node_modules/\n.env\n.DS_Store`;

    // 8. Dockerfile
    files[`${servicePath}/Dockerfile`] = DOCKERFILE_TEMPLATE(service.port);

    return files;
}
