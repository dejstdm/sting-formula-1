import { cp, mkdir, readdir, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const published = path.join(root, 'dist');

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: root, stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(' ')} exited ${code}`));
    });
  });
}

await rm(published, { recursive: true, force: true });
await mkdir(published, { recursive: true });

for (const app of ['concept-1', 'concept-2', 'concept-3']) {
  await run('npm', ['run', 'build', '-w', app]);
  await cp(path.join(root, 'apps', app, 'dist'), path.join(published, app), { recursive: true });
}

await run('npm', ['run', 'build', '-w', 'home']);
const homeDist = path.join(root, 'apps', 'home', 'dist');
for (const name of await readdir(homeDist)) {
  await cp(path.join(homeDist, name), path.join(published, name), { recursive: true });
}

console.log('Published dist/ (home at /, concepts at /concept-1/, /concept-2/, /concept-3/)');
