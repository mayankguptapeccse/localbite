import {readFile,writeFile} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import {hashPassword} from '../server/auth.mjs';
function prompt(label,hidden=false){if(!process.stdin.isTTY)throw Error('Run npm run setup in your Terminal. Passwords are entered privately.');process.stdout.write(label);process.stdin.setRawMode(true);process.stdin.resume();return new Promise(resolve=>{let value='';const done=()=>{process.stdin.off('data',onData);process.stdin.setRawMode(false);process.stdin.pause();process.stdout.write('\n');resolve(value)};const onData=bytes=>{for(const c of bytes.toString()){if(c==='\u0003'){process.stdin.setRawMode(false);process.exit(130)}if(c==='\r'||c==='\n'){done();return}if(c==='\u007f'||c==='\b'){if(value){value=value.slice(0,-1);process.stdout.write('\b \b')}continue}if(c<' ')continue;value+=c;process.stdout.write(hidden?'*':c)}};process.stdin.on('data',onData)})}
async function password(label){for(;;){const p=await prompt(label,true);if(p.length>=12)return hashPassword(p);console.log('Use at least 12 characters.')}}
const adminName=(await prompt('Developer username [developer]: '))||'developer';if(!/^[a-zA-Z0-9._-]{3,40}$/.test(adminName))throw Error('Use 3–40 letters, digits, dots, underscores or hyphens.');
const adminHash=await password('Developer password (12+ characters): '),owners=[];
for(const [restaurantId,name] of [[1,'Vojcart Bites'],[2,'Pizza Near Me'],[3,'Nugget Nation'],[4,'The Fries Empire']]){const username='owner-'+restaurantId;console.log(name+' → '+username);owners.push({username,restaurantId,passwordHash:await password('Password for '+username+': ')})}
const fields={SESSION_SECRET:randomBytes(32).toString('hex'),ADMIN_USERNAME:adminName,ADMIN_PASSWORD_HASH:adminHash,OWNER_ACCOUNTS_JSON:JSON.stringify(owners)};
let existing='';try{existing=await readFile('.env.local','utf8')}catch{}existing=existing.split('\n').filter(line=>!Object.keys(fields).some(k=>line.startsWith(k+'='))).join('\n').trim();
await writeFile('.env.local',(existing?existing+'\n':'')+Object.entries(fields).map(([k,v])=>k+"='"+v+"'").join('\n')+'\n',{mode:0o600});
console.log('Staff configuration saved privately in .env.local. Add these variables to Vercel, then connect DATABASE_URL. Do not commit this file.');
