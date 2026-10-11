import {spawn} from 'node:child_process';
const children = [
  spawn(process.execPath,['--import','tsx','apps/api/main.ts'],{stdio:'inherit',windowsHide:true}),
  spawn(process.execPath,['--import','tsx','apps/worker/main.ts'],{stdio:'inherit',windowsHide:true}),
  spawn(process.execPath,['node_modules/vite/bin/vite.js','--config','apps/web/vite.config.ts'],{stdio:'inherit',windowsHide:true}),
];
let closing = false;
function close() {if (closing) return; closing = true; for (const child of children) child.kill();}
for (const child of children) {child.on('error',close); child.on('exit',code => {if (!closing) {process.exitCode = code ?? 1; close();}});}
process.on('SIGINT',close); process.on('SIGTERM',close);
