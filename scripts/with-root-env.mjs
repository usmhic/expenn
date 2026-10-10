import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';

const envPath = fileURLToPath(new URL('../.env', import.meta.url));
const local = existsSync(envPath) ? parseEnv(readFileSync(envPath, 'utf8')) : {};
delete local.NODE_ENV;
const env = { ...local, ...process.env };
const args = process.argv.slice(2);
const app = args[0]?.startsWith('--') ? args.shift() : undefined;
if (app === '--web') env.PORT = process.env.PORT ?? env.WEB_PORT ?? '3000';
if (app === '--api') env.PORT = process.env.PORT ?? env.API_PORT ?? '8080';
if (app === '--mobile' && args[1] === 'start' && !args.includes('--port')) {
  args.push('--port', env.EXPO_PORT ?? '8081');
}
if (!args.length) throw new Error('Usage: with-root-env.mjs [--web|--api|--mobile] <command> [args...]');
const child = spawn(args[0], args.slice(1), {
  env,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });
