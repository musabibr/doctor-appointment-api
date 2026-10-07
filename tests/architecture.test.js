// Enforces the modular-monolith boundaries by reading the require() calls:
//  1. src/shared never depends on src/modules.
//  2. A module may use another module only through its public index.js.
//  3. Dependencies between modules never form a cycle.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const SRC = path.join(__dirname, "..", "src");
const MODULES = path.join(SRC, "modules");
const SHARED = path.join(SRC, "shared");

const listJsFiles = (dir) =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) return listJsFiles(full);
        return entry.name.endsWith(".js") ? [full] : [];
    });

const resolveLocal = (fromFile, specifier) => {
    const base = path.resolve(path.dirname(fromFile), specifier);
    for (const candidate of [base, `${base}.js`, path.join(base, "index.js")]) {
        if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
    }
    return base;
};

const localRequires = (file) => {
    const source = fs.readFileSync(file, "utf8");
    return [...source.matchAll(/require\(\s*["'](\.{1,2}\/[^"']+)["']\s*\)/g)].map((m) => resolveLocal(file, m[1]));
};

// Module name for a file inside src/modules/<name>/..., or null.
const moduleOf = (file) => {
    const relative = path.relative(MODULES, file);
    if (relative.startsWith("..")) return null;
    const parts = relative.split(path.sep);
    return parts.length > 1 ? parts[0] : null;
};

test("shared kernel does not depend on modules", () => {
    const offenders = [];
    for (const file of listJsFiles(SHARED)) {
        for (const target of localRequires(file)) {
            if (target.startsWith(MODULES)) offenders.push(`${path.relative(SRC, file)} -> ${path.relative(SRC, target)}`);
        }
    }
    assert.deepEqual(offenders, []);
});

test("modules only use other modules through their public index.js", () => {
    const offenders = [];
    for (const file of listJsFiles(MODULES)) {
        const from = moduleOf(file);
        for (const target of localRequires(file)) {
            const to = moduleOf(target);
            if (!to || to === from) continue;
            if (target !== path.join(MODULES, to, "index.js")) {
                offenders.push(`${path.relative(SRC, file)} -> ${path.relative(SRC, target)}`);
            }
        }
    }
    assert.deepEqual(offenders, []);
});

test("module dependencies form no cycle", () => {
    const graph = new Map();
    for (const file of listJsFiles(MODULES)) {
        const from = moduleOf(file);
        if (!from) continue;
        if (!graph.has(from)) graph.set(from, new Set());
        for (const target of localRequires(file)) {
            const to = moduleOf(target);
            if (to && to !== from) graph.get(from).add(to);
        }
    }

    const visiting = new Set();
    const done = new Set();
    const visit = (node, trail) => {
        if (done.has(node)) return;
        assert.ok(!visiting.has(node), `dependency cycle: ${[...trail, node].join(" -> ")}`);
        visiting.add(node);
        for (const next of graph.get(node) || []) visit(next, [...trail, node]);
        visiting.delete(node);
        done.add(node);
    };
    for (const node of graph.keys()) visit(node, []);
});

test("every module exposes a public index.js", () => {
    const modules = fs.readdirSync(MODULES, { withFileTypes: true }).filter((e) => e.isDirectory());
    for (const mod of modules) {
        assert.ok(fs.existsSync(path.join(MODULES, mod.name, "index.js")), `${mod.name} has no index.js`);
    }
});
