#!/usr/bin/env node
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

function repoRoot() {
  return path.resolve(__dirname, '..', '..');
}

function usage() {
  console.error('Usage: node shared/frontendCommand.cjs <dev|build|watch|check|test> <app-root> [-- extra args]');
}

function resolveFromRoots(request, roots) {
  for (const root of roots) {
    try {
      return require.resolve(request, { paths: [root] });
    } catch {}
  }
  throw new Error(`Unable to resolve ${request}. Run pnpm install once in the Chord project root.`);
}

function resolvePackageBin(packageName, binName, roots) {
  const packageFile = resolveFromRoots(`${packageName}/package.json`, roots);
  const manifest = JSON.parse(fs.readFileSync(packageFile, 'utf8'));
  const bin = manifest.bin;
  const relative = typeof bin === 'string' ? bin : bin?.[binName];
  if (!relative) throw new Error(`${packageName} does not expose a ${binName} bin.`);
  return path.resolve(path.dirname(packageFile), relative);
}

function splitExtraArgs(args) {
  const separator = args.indexOf('--');
  if (separator === -1) return args.length > 2
    ? { args: args.slice(0, 2), extra: args.slice(2) }
    : { args, extra: [] };
  return { args: args.slice(0, separator), extra: args.slice(separator + 1) };
}

function viteBuildArgs(frontendRoot, extra = [], options = {}) {
  return [
    'build',
    ...(options.watch ? ['--watch'] : []),
    '--config',
    path.join(frontendRoot, 'vite.config.ts'),
    ...extra
  ];
}

function runNode(script, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script, ...args], {
      cwd: options.cwd,
      env: { ...process.env, ...(options.env || {}) },
      stdio: 'inherit',
      windowsHide: true
    });
    child.on('exit', (code, signal) => {
      if (signal) {
        process.kill(process.pid, signal);
        return;
      }
      if (code === 0) resolve();
      else reject(new Error(`${path.basename(script)} exited ${code}`));
    });
    child.on('error', reject);
  });
}

async function main(argv = process.argv.slice(2)) {
  const split = splitExtraArgs(argv);
  const [command, rootArg] = split.args;
  if (!command || !rootArg) {
    usage();
    process.exit(1);
  }
  const appRoot = path.resolve(rootArg);
  const frontendRoot = path.join(appRoot);
  if (!fs.existsSync(frontendRoot)) throw new Error(`Frontend directory not found: ${frontendRoot}`);

  const roots = [frontendRoot, appRoot, repoRoot()];
  const tsc = resolvePackageBin('typescript', 'tsc', roots);
  const vite = resolvePackageBin('vite', 'vite', roots);
  const vitest = command === 'test' ? resolvePackageBin('vitest', 'vitest', roots) : undefined;

  async function buildFrontend() {
    await runNode(tsc, ['--project', path.join(frontendRoot, 'tsconfig.json')], { cwd: appRoot });
    await runNode(vite, viteBuildArgs(frontendRoot, split.extra), { cwd: appRoot });
  }

  if (command === 'build') {
    await buildFrontend();
    return;
  }

  if (command === 'watch') {
    await runNode(vite, viteBuildArgs(frontendRoot, split.extra, { watch: true }), { cwd: appRoot });
    return;
  }

  if (command === 'dev') {
    await runNode(vite, ['--config', path.join(frontendRoot, 'vite.config.ts'), ...split.extra], { cwd: appRoot });
    return;
  }

  if (command === 'check') {
    await runNode(tsc, ['--project', path.join(frontendRoot, 'tsconfig.json')], { cwd: appRoot });
    return;
  }

  if (command === 'test') {
    await runNode(vitest, ['run', '--config', path.join(frontendRoot, 'vitest.config.ts'), ...split.extra], { cwd: appRoot });
    return;
  }

  throw new Error(`Unknown frontend command ${command}`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error?.message || error);
    process.exit(1);
  });
}

module.exports = { main, resolveFromRoots, resolvePackageBin, splitExtraArgs, viteBuildArgs };
