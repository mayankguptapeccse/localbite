import {readFile} from 'node:fs/promises';
import {database} from '../server/db.mjs';
export async function migrate(){const db=await database();if(db.kind==='blob')return db;const sql=await readFile(new URL('../migrations/001_initial.sql',import.meta.url),'utf8');if(typeof db.exec==='function')await db.exec(sql);else await db.query(sql);return db}
if(process.argv[1]&&new URL(import.meta.url).pathname===process.argv[1]){
 if(process.env.BLOB_READ_WRITE_TOKEN&&!process.env.DATABASE_URL&&!process.env.POSTGRES_URL){console.log('Using private Vercel Blob storage; SQL migration is not required.');process.exit(0)}
 if(process.argv.includes('--if-configured')&&!process.env.DATABASE_URL&&!process.env.POSTGRES_URL){console.log('Database migration skipped: no DATABASE_URL. Runtime data remains unavailable until configured.');process.exit(0)}
 const db=await migrate();console.log('LocalBite database schema is ready.');await (db.end?db.end():db.close());
}
