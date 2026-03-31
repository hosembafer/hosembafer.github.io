const { spawn } = require('child_process');

const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';

const children = [
    spawn(npmCmd, ['run', 'watch'], { stdio: 'inherit' }),
    spawn(npxCmd, ['serve', '.'], { stdio: 'inherit' })
];

let shuttingDown = false;

function terminate(exitCode = 0) {
    if (shuttingDown) {
        return;
    }

    shuttingDown = true;

    for (const child of children) {
        if (!child.killed) {
            child.kill('SIGINT');
        }
    }

    setTimeout(() => {
        for (const child of children) {
            if (child.exitCode === null && child.signalCode === null) {
                child.kill('SIGTERM');
            }
        }
    }, 500);

    setTimeout(() => {
        process.exit(exitCode);
    }, 800);
}

process.on('SIGINT', () => terminate(0));
process.on('SIGTERM', () => terminate(0));

for (const child of children) {
    child.on('exit', (code, signal) => {
        if (shuttingDown) {
            return;
        }

        terminate(code ?? (signal ? 1 : 0));
    });
}
