const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const WATCH_DIR = path.join(ROOT, 'src');
const BUILD_SCRIPT = path.join(ROOT, 'scripts', 'build.js');
const POLL_INTERVAL_MS = 500;

let buildInFlight = false;
let previousSnapshot = snapshotFiles();

function walk(directory) {
    const entries = fs.readdirSync(directory, { withFileTypes: true });
    const files = [];

    for (const entry of entries) {
        const fullPath = path.join(directory, entry.name);

        if (entry.isDirectory()) {
            files.push(...walk(fullPath));
            continue;
        }

        files.push(fullPath);
    }

    return files;
}

function snapshotFiles() {
    const files = [...walk(WATCH_DIR), BUILD_SCRIPT];
    const snapshot = new Map();

    for (const file of files) {
        const stats = fs.statSync(file);
        snapshot.set(file, `${stats.mtimeMs}:${stats.size}`);
    }

    return snapshot;
}

function diffSnapshot(nextSnapshot) {
    const changes = [];

    for (const [file, signature] of nextSnapshot.entries()) {
        if (previousSnapshot.get(file) !== signature) {
            changes.push(file);
        }
    }

    for (const file of previousSnapshot.keys()) {
        if (!nextSnapshot.has(file)) {
            changes.push(file);
        }
    }

    return changes;
}

function runBuild() {
    if (buildInFlight) {
        return;
    }

    buildInFlight = true;

    try {
        delete require.cache[require.resolve(BUILD_SCRIPT)];
        const { buildSite } = require(BUILD_SCRIPT);
        const result = buildSite();
        process.stdout.write(`[watch] Build complete. ${result.articleCount} articles generated.\n`);
    } catch (error) {
        process.stderr.write(`[watch] Build failed: ${error.stack}\n`);
    } finally {
        buildInFlight = false;
    }
}

runBuild();
process.stdout.write(`[watch] Polling ${WATCH_DIR} every ${POLL_INTERVAL_MS}ms.\n`);

setInterval(() => {
    try {
        const nextSnapshot = snapshotFiles();
        const changes = diffSnapshot(nextSnapshot);

        if (changes.length) {
            const changedPaths = changes
                .map((file) => path.relative(ROOT, file))
                .sort()
                .join(', ');

            previousSnapshot = nextSnapshot;
            process.stdout.write(`[watch] Change detected: ${changedPaths}\n`);
            runBuild();
        }
    } catch (error) {
        process.stderr.write(`[watch] Polling failed: ${error.stack}\n`);
    }
}, POLL_INTERVAL_MS);
