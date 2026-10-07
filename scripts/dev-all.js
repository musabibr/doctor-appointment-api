// Runs the API (port 5000) and the React dev server (port 5173) together.
// Usage: npm run dev:all
const { spawn, spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const isWindows = process.platform === "win32";

if (!fs.existsSync(path.join(ROOT, "client", "node_modules"))) {
    console.error('The web client dependencies are missing. Run "npm run setup" first.');
    process.exit(1);
}

const tasks = [
    { name: "api", color: 36, command: "npm run dev" },
    { name: "web", color: 35, command: "npm run dev:client" },
];

let shuttingDown = false;
const children = [];

const prefixLines = (name, color, stream, target) => {
    let buffer = "";
    stream.on("data", (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop();
        for (const line of lines) target.write(`\x1b[${color}m[${name}]\x1b[0m ${line}\n`);
    });
};

const stopAll = (exitCode) => {
    if (shuttingDown) return;
    shuttingDown = true;
    for (const child of children) {
        if (child.exitCode !== null) continue;
        if (isWindows) spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"]);
        else {
            try {
                process.kill(-child.pid, "SIGTERM"); // the whole process group
            } catch {
                // already stopped
            }
        }
    }
    setTimeout(() => process.exit(exitCode), 500);
};

for (const task of tasks) {
    const child = spawn(task.command, {
        cwd: ROOT,
        shell: true,
        detached: !isWindows,
        env: { ...process.env, FORCE_COLOR: "1" },
    });
    prefixLines(task.name, task.color, child.stdout, process.stdout);
    prefixLines(task.name, task.color, child.stderr, process.stderr);
    child.on("exit", (code) => {
        if (!shuttingDown) {
            console.log(`\x1b[${task.color}m[${task.name}]\x1b[0m exited with code ${code}, stopping everything`);
            stopAll(code || 0);
        }
    });
    children.push(child);
}

process.on("SIGINT", () => stopAll(0));
process.on("SIGTERM", () => stopAll(0));
