// Mints the Supabase-shaped tokens the backend expects, signed with a keypair that
// exists only for load testing.
//
// The alternative is to sign a hundred players in through the real Supabase project,
// which rate-limits its own auth endpoints and would leave a hundred junk accounts in
// the production user table. The backend does not care who issued the token as long as
// it verifies against the JWKS it was pointed at: security.jwt.jwk-set-uri is a plain
// environment variable (SUPABASE_JWKS_URI), so pointing a load-test backend at the
// server in jwks-server.mjs is enough.
//
// The keypair is written to keys/ on first use and reused after that, so tokens minted
// by seed.mjs stay valid for drive.mjs. It protects nothing — do not reuse it anywhere.

import { generateKeyPairSync, createPrivateKey, createPublicKey, createSign, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const KEY_DIR = join(dirname(fileURLToPath(import.meta.url)), 'keys');
const PRIVATE_KEY_PATH = join(KEY_DIR, 'private.pem');
const KID = 'loadtest-key';

/** Claims SupabaseClaimsValidator insists on, whatever signed the token. */
const AUDIENCE = 'authenticated';
const ROLE = 'authenticated';

function base64url(input) {
    return Buffer.from(input).toString('base64url');
}

function loadOrCreatePrivateKey() {
    if (existsSync(PRIVATE_KEY_PATH)) {
        return createPrivateKey(readFileSync(PRIVATE_KEY_PATH));
    }

    // RS256 rather than ES256 only because it is the duller of the two paths through
    // node:crypto. SecurityConfig accepts either.
    const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    mkdirSync(KEY_DIR, { recursive: true });
    writeFileSync(PRIVATE_KEY_PATH, privateKey.export({ type: 'pkcs8', format: 'pem' }));
    return privateKey;
}

const privateKey = loadOrCreatePrivateKey();

/** The document to serve at the address SUPABASE_JWKS_URI names. */
export function jwks() {
    const jwk = createPublicKey(privateKey).export({ format: 'jwk' });
    return { keys: [{ ...jwk, kid: KID, alg: 'RS256', use: 'sig' }] };
}

/**
 * A token that will pass verification for the given Supabase user id.
 *
 * No issuer claim: security.jwt.issuer is only enforced when it is set, and a load-test
 * backend leaves SUPABASE_JWT_ISSUER empty.
 */
export function mintToken(supabaseUserId, ttlSeconds = 6 * 60 * 60) {
    const now = Math.floor(Date.now() / 1000);
    const header = { alg: 'RS256', typ: 'JWT', kid: KID };
    const payload = {
        sub: supabaseUserId,
        aud: AUDIENCE,
        role: ROLE,
        iat: now,
        exp: now + ttlSeconds,
        session_id: randomUUID(),
    };

    const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
    const signature = createSign('RSA-SHA256').update(signingInput).sign(privateKey).toString('base64url');
    return `${signingInput}.${signature}`;
}
