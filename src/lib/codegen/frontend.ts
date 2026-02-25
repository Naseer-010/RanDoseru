import { ElementNode, Page } from "@/types";

type FrontendCodeResult = {
    files: Record<string, string>;
    previewHtml: string;
};

const SAFE_UNIT = (value: string | number | undefined, fallback?: string): string | undefined => {
    if (value === undefined || value === null) return fallback;
    if (typeof value === "number") return `${(value / 16).toFixed(3)}rem`;
    const raw = String(value).trim();
    if (!raw) return fallback;
    if (/^\d+(\.\d+)?px$/.test(raw)) {
        const num = Number(raw.replace("px", ""));
        return `${(num / 16).toFixed(3)}rem`;
    }
    return raw;
};

const cssFromStyles = (styles: Record<string, string | number>): string => {
    const entries = Object.entries(styles)
        .filter(([_, v]) => v !== undefined && v !== null && String(v).trim() !== "")
        .map(([k, v]) => {
            const prop = k.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
            const val = SAFE_UNIT(v, String(v));
            return `${prop}: ${val};`;
        });
    return entries.join(" ");
};

const textContent = (el: ElementNode, fallback: string): string => {
    const raw = el.props?.content ?? el.props?.label;
    if (raw === undefined || raw === null || String(raw).trim() === "") return fallback;
    return String(raw);
};

const classNameFor = (el: ElementNode) => `el-${el.id.replace(/[^a-zA-Z0-9_-]/g, "")}`;

const renderElement = (
    el: ElementNode,
    isRoot: boolean,
    cssOut: Set<string>,
    mode: "html" | "jsx"
): string => {
    const className = classNameFor(el);
    const tag = (() => {
        if (el.type === "section") return "section";
        if (el.type === "container" || el.type === "stack" || el.type === "columns" || el.type === "form") return "div";
        if (el.type === "title") {
            const lvl = Math.min(Math.max(Number(el.props?.level) || 2, 1), 6);
            return `h${lvl}`;
        }
        if (el.type === "text" || el.type === "paragraph") return "p";
        if (el.type === "button") return "button";
        if (el.type === "image") return "img";
        if (el.type === "video") return "video";
        if (el.type === "menu") return "nav";
        if (el.type === "divider") return "hr";
        if (el.type === "frame") return "iframe";
        return "div";
    })();

    const baseStyles: Record<string, string | number> = {
        boxSizing: "border-box",
    };

    if (isRoot) {
        baseStyles.position = "absolute";
        baseStyles.left = `${el.x}px`;
        baseStyles.top = `${el.y}px`;
        baseStyles.width = `min(100%, ${el.w}px)`;
        baseStyles.minHeight = `${el.h}px`;
    } else if (el.styles?.position === "absolute") {
        baseStyles.position = "absolute";
        baseStyles.left = `${el.x}px`;
        baseStyles.top = `${el.y}px`;
        baseStyles.width = `min(100%, ${el.w}px)`;
        baseStyles.minHeight = `${el.h}px`;
    }

    if (el.type === "stack") {
        baseStyles.display = "flex";
        baseStyles.flexDirection = "column";
        baseStyles.gap = SAFE_UNIT(el.styles?.gap ?? "16px", "1rem");
    }
    if (el.type === "columns") {
        const count = Number(el.props?.columnCount) || 2;
        baseStyles.display = "grid";
        baseStyles.gridTemplateColumns = `repeat(${count}, minmax(0, 1fr))`;
        baseStyles.gap = SAFE_UNIT(el.styles?.gap ?? "16px", "1rem");
    }
    if (el.type === "container" || el.type === "section") {
        baseStyles.display = baseStyles.display || "flex";
        baseStyles.flexDirection = baseStyles.flexDirection || "column";
        baseStyles.gap = baseStyles.gap || SAFE_UNIT(el.styles?.gap ?? "12px", "0.75rem");
    }

    const mergedStyles = { ...baseStyles, ...(el.styles || {}) };
    const css = cssFromStyles(mergedStyles);
    cssOut.add(`.${className} { ${css} }`);

    const children = (el.children || []).map((c) => renderElement(c, false, cssOut, mode)).join("");
    const clsAttr = mode === "jsx" ? "className" : "class";

    switch (el.type) {
        case "title":
        case "text":
        case "paragraph":
            return `<${tag} ${clsAttr}="${className}">${textContent(el, el.type === "title" ? "Heading" : "Text")}</${tag}>`;
        case "button":
            return `<button ${clsAttr}="${className}">${textContent(el, "Button")}</button>`;
        case "image":
            return `<img ${clsAttr}="${className}" src="${String(el.props?.src || "")}" alt="${String(el.props?.alt || "")}" />`;
        case "video":
            return `<video ${clsAttr}="${className}" ${el.props?.autoplay ? "autoplay" : ""} ${el.props?.loop ? "loop" : ""} ${el.props?.muted ? "muted" : ""} controls></video>`;
        case "menu": {
            const items = String(el.props?.items || "Home,About,Contact").split(",");
            const isVertical = el.props?.menuStyle === "vertical";
            const menuItems = items.map((i) => `<span ${clsAttr}="${className}__item">${i.trim()}</span>`).join("");
            cssOut.add(`.${className} { display: flex; gap: ${isVertical ? "0.5rem" : "1.5rem"}; flex-direction: ${isVertical ? "column" : "row"}; align-items: center; }`);
            cssOut.add(`.${className}__item { font-size: 0.9rem; cursor: pointer; }`);
            return `<nav ${clsAttr}="${className}">${menuItems}</nav>`;
        }
        case "divider":
            return `<hr ${clsAttr}="${className}" />`;
        case "frame":
            return `<iframe ${clsAttr}="${className}" src="${String(el.props?.src || "")}" title="Embed Frame"></iframe>`;
        case "socialbar": {
            const platforms = ["facebook", "twitter", "instagram", "linkedin", "youtube"].filter((p) => Boolean(el.props?.[p]));
            const icons = platforms.length > 0
                ? platforms.map((p) => `<span ${clsAttr}="${className}__icon">${p[0].toUpperCase()}</span>`).join("")
                : `<span ${clsAttr}="${className}__empty">Add social links</span>`;
            cssOut.add(`.${className} { display: flex; gap: 0.75rem; align-items: center; }`);
            cssOut.add(`.${className}__icon { width: 32px; height: 32px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; background: #1f2937; color: #fff; font-size: 0.8rem; }`);
            return `<div ${clsAttr}="${className}">${icons}</div>`;
        }
        case "accordion":
            return `<div ${clsAttr}="${className}"><div ${clsAttr}="${className}__header">${String(el.props?.headerText || "Accordion")}</div><div ${clsAttr}="${className}__body">${children || "Accordion content"}</div></div>`;
        case "tabs":
            return `<div ${clsAttr}="${className}"><div ${clsAttr}="${className}__tabs">${String(el.props?.tabTitles || "Tab 1,Tab 2").split(",").map((t) => `<button>${t.trim()}</button>`).join("")}</div><div ${clsAttr}="${className}__body">${children || "Tab content"}</div></div>`;
        case "form":
            return `<form ${clsAttr}="${className}">${children}</form>`;
        case "input":
            return `<input ${clsAttr}="${className}" type="${String(el.props?.inputType || "text")}" placeholder="${String(el.props?.placeholder || "")}" />`;
        case "shape":
            return `<div ${clsAttr}="${className}"></div>`;
        case "spacer":
            return `<div ${clsAttr}="${className}"></div>`;
        default:
            return `<${tag} ${clsAttr}="${className}">${children}</${tag}>`;
    }
};

export function generateFrontendProject(
    elements: ElementNode[],
    globalElements: ElementNode[],
    canvasSettings: { backgroundColor: string; width: number; height: number },
    page?: Page
): FrontendCodeResult {
    const cssParts = new Set<string>();

    const safeElements = Array.isArray(elements) ? elements : [];
    const safeGlobal = Array.isArray(globalElements) ? globalElements : [];

    const htmlParts: string[] = [];
    const jsxParts: string[] = [];

    safeGlobal.forEach((el) => {
        htmlParts.push(renderElement(el, false, cssParts, "html"));
        jsxParts.push(renderElement(el, false, cssParts, "jsx"));
    });
    safeElements.forEach((el) => {
        htmlParts.push(renderElement(el, true, cssParts, "html"));
        jsxParts.push(renderElement(el, true, cssParts, "jsx"));
    });

    const canvasWidth = Math.max(320, Number(canvasSettings.width) || 1280);
    const canvasHeight = Math.max(200, Number(canvasSettings.height) || 900);
    const bg = String(canvasSettings.backgroundColor || "#ffffff");

    const baseCss = `
* { box-sizing: border-box; }
body { margin: 0; font-family: Inter, system-ui, sans-serif; background: #0f1115; color: #0f172a; }
.page { position: relative; width: min(100%, ${canvasWidth}px); min-height: ${canvasHeight}px; margin: 2rem auto; padding: 2rem; background: ${bg}; }
img { max-width: 100%; height: auto; display: block; }
button { cursor: pointer; }
`;

    const css = `${baseCss}\n${Array.from(cssParts).join("\n")}`;

    const body = `<div class="page">${htmlParts.join("")}</div>`;
    const previewHtml = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${page?.title || "Preview"}</title>
    <style>${css}</style>
  </head>
  <body>${body}</body>
</html>`;

    const appJsx = `
import "./styles.css";

export default function App() {
  return (
    <div className="page">
      ${jsxParts.join("\n      ")}
    </div>
  );
}
`.trim();

    const files: Record<string, string> = {
        "package.json": `{
  "name": "frontend-project",
  "private": true,
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "vite": "^5.0.0",
    "@vitejs/plugin-react": "^4.2.0"
  }
}`,
        "index.html": `<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${page?.title || "Frontend Project"}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>`,
        "src/main.jsx": `import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`,
        "src/App.jsx": appJsx,
        "src/styles.css": css,
        "README.md": `# Frontend Project

Generated from the visual editor.
`,
    };

    return { files, previewHtml };
}
