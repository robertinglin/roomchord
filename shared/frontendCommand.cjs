#!/usr/bin/env node
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

function repoRoot() {
  return path.resolve(__dirname, '..', '..');
}

const WATCH_DEBOUNCE_MS = 150;
const GENERATED_FRONTEND_FILES = new Set([
  'matterhorn-frontend-bundle.zip',
  'matterhorn-frontend-manifest.json'
]);
const IGNORED_WATCH_DIRS = new Set(['dist', 'node_modules']);

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

function relativeLabel(root, file) {
  const relative = path.relative(root, file);
  return relative && !relative.startsWith('..') && !path.isAbsolute(relative)
    ? relative
    : file;
}

function shouldWatchFrontendPath(sourceDir, changedPath) {
  if (!changedPath) return true;
  const relative = path.relative(sourceDir, changedPath);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) return false;
  const parts = relative.split(path.sep).filter(Boolean);
  if (parts.some((part) => IGNORED_WATCH_DIRS.has(part))) return false;
  return !GENERATED_FRONTEND_FILES.has(parts[parts.length - 1]);
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
    await runNode(vite, ['build', '--config', path.join(frontendRoot, 'vite.config.ts'), ...split.extra], { cwd: appRoot });
  }

  if (command === 'build') {
    await buildFrontend();
    return;
  }

  if (command === 'watch') {
    const sourceDir = path.join(frontendRoot, 'src');
    if (!fs.existsSync(sourceDir)) throw new Error(`Frontend source directory not found: ${sourceDir}`);
    console.error(`[frontend:watch] watching ${relativeLabel(appRoot, sourceDir)}`);
    let timer;
    let running = false;
    let requested = false;

    async function runBuild(reason) {
      if (running) {
        requested = true;
        return;
      }
      running = true;
      console.error(`[frontend:watch] build started (${reason})`);
      try {
        await buildFrontend();
        console.error('[frontend:watch] build completed');
      } catch (error) {
        console.error(`[frontend:watch] build failed: ${error?.message || error}`);
      } finally {
        running = false;
        if (requested) {
          requested = false;
          scheduleBuild('queued source changes');
        }
      }
    }

    function scheduleBuild(reason) {
      if (running) {
        requested = true;
        return;
      }
      clearTimeout(timer);
      timer = setTimeout(() => void runBuild(reason), WATCH_DEBOUNCE_MS);
    }

    const watcher = fs.watch(sourceDir, { recursive: true }, (_event, fileName) => {
      const changedPath = fileName ? path.join(sourceDir, fileName.toString()) : undefined;
      if (!shouldWatchFrontendPath(sourceDir, changedPath)) return;
      scheduleBuild(changedPath ? relativeLabel(appRoot, changedPath) : 'source change');
    });

    await runBuild('initial');
    await new Promise((resolve, reject) => {
      watcher.on('error', reject);
      const stop = () => {
        clearTimeout(timer);
        watcher.close();
        resolve();
      };
      process.once('SIGINT', stop);
      process.once('SIGTERM', stop);
    });
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

module.exports = { main, resolveFromRoots, resolvePackageBin, shouldWatchFrontendPath, splitExtraArgs };
