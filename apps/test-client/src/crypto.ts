// Client-side crypto — mirrors what the server expects.
// ECDSA P-256 / SHA-256, keys persisted as JWK in localStorage.

const ALGORITHM = { name: "ECDSA", namedCurve: "P-256" } as const;
const SIGN_PARAMS = { name: "ECDSA", hash: { name: "SHA-256" } } as const;

const LS_PRIVATE_KEY = "anon:privateKey";
const LS_PUBLIC_KEY = "anon:publicKey";

export interface KeyPair {
	publicKeyJwk: string; // JSON stringified JWK — sent to server
	privateKey: CryptoKey; // kept in memory only
}

/** Load existing keypair from localStorage or generate a fresh one. */
export async function getOrCreateKeyPair(): Promise<KeyPair> {
	const storedPrivate = localStorage.getItem(LS_PRIVATE_KEY);
	const storedPublic = localStorage.getItem(LS_PUBLIC_KEY);

	if (storedPrivate && storedPublic) {
		try {
			const privateKey = await crypto.subtle.importKey(
				"jwk",
				JSON.parse(storedPrivate),
				ALGORITHM,
				false,
				["sign"],
			);
			return { publicKeyJwk: storedPublic, privateKey };
		} catch {
			// corrupted — fall through to regenerate
		}
	}

	return generateAndPersist();
}

async function generateAndPersist(): Promise<KeyPair> {
	const keyPair = await crypto.subtle.generateKey(ALGORITHM, true, [
		"sign",
		"verify",
	]);

	const privateJwk = await crypto.subtle.exportKey("jwk", keyPair.privateKey);
	const publicJwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);

	// Strip private component from public JWK just to be safe
	const { d: _d, ...publicOnly } = publicJwk;

	const publicKeyJwk = JSON.stringify(publicOnly);

	localStorage.setItem(LS_PRIVATE_KEY, JSON.stringify(privateJwk));
	localStorage.setItem(LS_PUBLIC_KEY, publicKeyJwk);

	return { publicKeyJwk, privateKey: keyPair.privateKey };
}

/**
 * Sign the nonce (hex string) with the private key.
 * Server encodes nonce as UTF-8 bytes before verifying — we do the same.
 */
export async function signNonce(
	privateKey: CryptoKey,
	nonce: string,
): Promise<string> {
	const nonceBytes = new TextEncoder().encode(nonce);
	const signatureBuffer = await crypto.subtle.sign(
		SIGN_PARAMS,
		privateKey,
		nonceBytes,
	);
	return arrayBufferToBase64(signatureBuffer);
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
	const bytes = new Uint8Array(buffer);
	let binary = "";
	for (const b of bytes) binary += String.fromCharCode(b);
	return btoa(binary);
}
