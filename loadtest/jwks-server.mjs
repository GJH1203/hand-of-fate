// Serves the load-test signing key so the backend can verify tokens minted by token.mjs.
//
// Point a load-test backend at it and leave the issuer empty:
//
//   SUPABASE_JWKS_URI=http://host.docker.internal:9999/.well-known/jwks.json
//   SUPABASE_JWT_ISSUER=
//
// host.docker.internal rather than localhost because the backend runs in a container
// and localhost there is the container.

import { createServer } from 'node:http';
import { jwks } from './token.mjs';

const PORT = Number(process.env.JWKS_PORT ?? 9999);
const PATH = '/.well-known/jwks.json';

const body = JSON.stringify(jwks());

createServer((request, response) => {
    if (request.url !== PATH) {
        response.writeHead(404).end();
        return;
    }
    response.writeHead(200, {
        'content-type': 'application/json',
        // Spring's NimbusJwtDecoder caches the key set, but a restarted backend refetches
        // it and there is no reason to serve a stale copy through a proxy in between.
        'cache-control': 'no-store',
    });
    response.end(body);
}).listen(PORT, () => {
    console.log(`JWKS on http://localhost:${PORT}${PATH}`);
    console.log('Leave this running for as long as the backend is up.');
});
