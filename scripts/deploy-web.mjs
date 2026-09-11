// Builds and publishes the web version.
//
//   node scripts/deploy-web.mjs           → production (https://goodlist.expo.app)
//   node scripts/deploy-web.mjs --preview → a one-off preview URL
//
// Production builds take their EXPO_PUBLIC_* values from the EAS "production"
// environment, the same place Android builds get them. EXPO_NO_DOTENV stops
// .env.local (which may hold a RevenueCat Test Store key) from leaking in.
// Preview deploys use .env.local as-is, so the Test Store can be tried on a
// real URL.
import { execSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const EAS = 'npx eas-cli@24.1.2';
const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const preview = process.argv.includes('--preview');

function run(command, env = process.env) {
  execSync(command, { cwd: rootDir, stdio: 'inherit', env });
}

if (preview) {
  run('npx expo export --platform web');
} else {
  run(`${EAS} env:exec production "npx expo export --platform web" --non-interactive`, {
    ...process.env,
    EXPO_NO_DOTENV: '1',
  });

  const jsDir = path.join(rootDir, 'dist', '_expo', 'static', 'js', 'web');
  const bundle = readdirSync(jsDir)
    .map((f) => readFileSync(path.join(jsDir, f), 'utf8'))
    .join('\n');
  if (/["'`]test_[A-Za-z0-9]{20,}["'`]/.test(bundle)) {
    console.error('Refusing to deploy: a RevenueCat Test Store key is in the production bundle.');
    process.exit(1);
  }
}

run(`${EAS} deploy${preview ? '' : ' --prod'} --non-interactive`);
