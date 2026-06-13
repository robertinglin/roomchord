#!/usr/bin/env node
const path = require('node:path');
const { spawn } = require('node:child_process');
const { startLiveExampleServer } = require('./liveBackend.cjs');

function readPackage(appRoot) {
  return require(path.join(appRoot, 'package.json'));
}

function frontendPort(pkg) {
  const script = pkg.scripts?.['dev:frontend'] || '';
  const match = script.match(/--port\s+([0-9]+)/) || script.match(/port:\s*([0-9]+)/);
  return match ? Number(match[1]) : undefined;
}

function quoteCommandArg(value) {
  const text = String(value);
  if (/^[A-Za-z0-9_./:@=${}\\-]+$/.test(text)) return text;
  return `"${text.replaceAll('"', '\\"')}"`;
}

function pnpmCommand(args) {
  if (process.platform !== 'win32') return { command: 'pnpm', args };
  return {
    command: process.env.ComSpec || 'cmd.exe',
    args: ['/d', '/s', '/c', ['pnpm.cmd', ...args].map(quoteCommandArg).join(' ')]
  };
}

async function main() {
  const appRoot = path.resolve(process.argv[2] || process.cwd());
  const pkg = readPackage(appRoot);
  const port = Number(process.env.MATTERHORN_EXAMPLE_BACKEND_PORT || (frontendPort(pkg) ? frontendPort(pkg) + 1000 : 0));
  const backend = await startLiveExampleServer({ appRoot, port });
  const env = { ...process.env, VITE_MATTERHORN_EXAMPLE_BACKEND_URL: backend.url, MATTERHORN_EXAMPLE_BACKEND_URL: backend.url };
  const command = pnpmCommand(['run', 'dev:frontend']);
  const child = spawn(command.command, command.args, { cwd: appRoot, env, stdio: 'inherit' });
  const shutdown = async () => {
    child.kill('SIGTERM');
    await backend.close().catch(() => undefined);
  };
  process.on('SIGINT', () => void shutdown().then(() => process.exit(0)));
  process.on('SIGTERM', () => void shutdown().then(() => process.exit(0)));
  child.on('exit', (code) => void shutdown().then(() => process.exit(code || 0)));
}
main().catch((error) => { console.error(error); process.exit(1); });
