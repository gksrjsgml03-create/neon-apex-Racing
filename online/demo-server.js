import {startServer} from './server.js';
const server=await startServer({port:18787,host:'127.0.0.1'});
console.log(`Temporary game server: ${server.port}`);
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close().then(()=>process.exit(0)));
