import { spawn } from 'node:child_process';

const host = '127.0.0.1';
const port = '4179';
const url = `http://${host}:${port}`;

function spawnNpx(args, options) {
  if (process.platform === 'win32') return spawn('cmd.exe', ['/d', '/s', '/c', `npx ${args.join(' ')}`], options);
  return spawn('npx', args, options);
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawnNpx([command, ...args], { stdio: 'inherit', ...options });
    child.once('error', reject);
    child.once('exit', (code) => code === 0 ? resolve() : reject(new Error(`${command} exited with ${code}`)));
  });
}

async function waitForServer() {
  let lastError;
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return response;
      lastError = new Error(`Server responded with ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw lastError ?? new Error('Server did not start');
}

function stopServer(server) {
  if (server.exitCode !== null) return Promise.resolve();
  if (process.platform !== 'win32') {
    return new Promise((resolve) => {
      const timeout = setTimeout(resolve, 2_000);
      server.once('exit', () => {
        clearTimeout(timeout);
        resolve();
      });
      server.kill();
    });
  }
  return new Promise((resolve) => {
    const taskkill = spawn('taskkill.exe', ['/pid', String(server.pid), '/T', '/F'], { stdio: 'ignore' });
    taskkill.once('exit', resolve);
    taskkill.once('error', resolve);
  });
}

await run('vite', ['build', '--base', '/'], {
  env: { ...process.env, VITE_BASE_PATH: '/' },
});

const server = spawnNpx(['vite', 'preview', '--host', host, '--port', port, '--strictPort'], {
  stdio: 'pipe',
  env: { ...process.env, VITE_BASE_PATH: '/' },
});

try {
  const response = await waitForServer();
  const html = await response.text();
  const asset = html.match(/(?:src|href)="(\/assets\/[^"?]+(?:\?[^"?]+)?)"/)?.[1];

  if (!html.includes('<div id="root"></div>')) throw new Error('Server did not return the application shell');
  if (!asset) throw new Error('Server did not return a compiled asset reference');

  const assetResponse = await fetch(`${url}${asset}`);
  if (!assetResponse.ok) throw new Error(`Compiled asset returned ${assetResponse.status}`);

  console.log(`Server smoke test passed: ${url}`);
} finally {
  await stopServer(server);
}
