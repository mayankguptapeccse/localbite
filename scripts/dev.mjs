import {spawn} from 'node:child_process';
import {migrate} from './migrate.mjs';
const db=await migrate();await(db.end?db.end():db.close());
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','dev',...process.argv.slice(2)],{stdio:'inherit',env:process.env});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));child.on('exit',code=>process.exit(code||0));
