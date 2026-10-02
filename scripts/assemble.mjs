import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
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

for (const app of ['concept-1', 'concept-2', 'concept-3']) {
  await run('npm', ['run', 'build', '-w', app]);
  await mkdir(path.join(published, app), { recursive: true });
  await cp(path.join(root, 'apps', app, 'dist'), path.join(published, app), { recursive: true });
}

await writeFile(
  path.join(published, 'index.html'),
  `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>STING BOOST</title>
  <script>
    location.replace('/concept-1/' + location.search + location.hash);
  </script>
</head>
<body></body>
</html>
`,
);

console.log('Published dist/concept-1, dist/concept-2, dist/concept-3, and a root redirect to /concept-1/');
