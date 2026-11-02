import {writeFile} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
try {
  await writeFile('.env', `WEB_PORT=8080\nAPP_ORIGIN=http://127.0.0.1:8080\nDB_PASSWORD=${randomBytes(24).toString('hex')}\nDB_ROOT_PASSWORD=${randomBytes(24).toString('hex')}\n`, {flag:'wx',mode:0o600});
  console.log('Created .env with random local database passwords.');
} catch (error) {
  if(error.code!=='EEXIST') throw error;
  console.log('.env already exists; left unchanged.');
}
