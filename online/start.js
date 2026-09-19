import {startServer} from './server.js';
const server=await startServer({port:Number(process.env.PORT||8787),host:process.env.HOST||'0.0.0.0'});
console.log(`NEON APEX online server listening on ${server.port}`);
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close().then(()=>process.exit(0)));
