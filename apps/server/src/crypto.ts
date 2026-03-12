//
// All cryptographic operations the server needs:
//   1. Nonce generation          — for the auth challenge
//   2. Public key import         — parse client-sent JWK
//   3. Signature verification    — verify the signed nonce
//
// The server NEVER generates or holds private keys.
// It only verifies proofs presented by clients.
//
// Algorithm: ECDSA with P-256 curve and SHA-256 digest.
// This matches what the client will use via crypto.subtle.

// ─── Constants ────────────────────────────────────────────────────────────────

const ALGORITHM = {
	name: "ECDSA",
	namedCurve: "P-256",
} as const;

const VERIFY_PARAMS = {
	name: "ECDSA",
	hash: { name: "SHA-256" },
} as const;

const NONCE_BYTE_LENGTH = 32; // 256 bits of entropy → 64 hex chars

// ─── Nonce ────────────────────────────────────────────────────────────────────

/**
 * Generate a cryptographically random nonce.
 * Returned as a lowercase hex string — safe to embed in a JSON frame
 * and trivial to encode on the client side before signing.
 */
function generateNonce(): string {
	const bytes = new Uint8Array(NONCE_BYTE_LENGTH);
	crypto.getRandomValues(bytes);
	return Array.from(bytes)
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

import type { webcrypto } from "node:crypto";
import type { UserID } from "@repo/types";

// ─── Key Import ───────────────────────────────────────────────────────────────

/**
 * Parse a JWK string sent by the client into a CryptoKey.
 * Throws if the JWK is malformed or uses the wrong algorithm.
 *
 * We import as `verify`-only — the server has no need for `sign`.
 */
async function importPublicKey(jwkString: string): Promise<CryptoKey> {
	let jwk: webcrypto.JsonWebKey;

	try {
		jwk = JSON.parse(jwkString) as webcrypto.JsonWebKey;
	} catch {
		throw new Error("Invalid JWK: failed to parse JSON");
	}

	// Basic structural guard before handing to subtle
	if (jwk.kty !== "EC" || jwk.crv !== "P-256") {
		throw new Error("Invalid JWK: expected EC P-256 key");
	}

	if (!jwk.x || !jwk.y) {
		throw new Error("Invalid JWK: missing x or y coordinates");
	}

	// d must NOT be present — we only accept public keys
	if ("d" in jwk) {
		throw new Error("Invalid JWK: private key material must not be sent");
	}

	try {
		const key = await crypto.subtle.importKey(
			"jwk",
			jwk,
			ALGORITHM,
			true, // extractable — doesn't matter for verify-only key
			["verify"],
		);
		return key;
	} catch (err) {
		throw new Error(`Invalid JWK: subtle.importKey failed — ${String(err)}`);
	}
}

// ─── Signature Verification ───────────────────────────────────────────────────

/**
 * Verify that `signature` (base64) is a valid ECDSA/SHA-256 signature
 * over `nonce` (hex string) using `publicKey`.
 *
 * The client signs the raw UTF-8 bytes of the nonce hex string.
 * We replicate that exact encoding here.
 *
 * Returns true  → signature is valid, client owns the private key
 * Returns false → signature invalid, auth must be rejected
 */
async function verifySignature(
	publicKey: CryptoKey,
	nonce: string,
	signatureBase64: string,
): Promise<boolean> {
	let signatureBytes: ArrayBuffer;

	try {
		signatureBytes = base64ToArrayBuffer(signatureBase64);
	} catch {
		return false; // malformed base64 → treat as verification failure
	}

	const nonceBytes = new TextEncoder().encode(nonce);

	try {
		const valid = await crypto.subtle.verify(
			VERIFY_PARAMS,
			publicKey,
			signatureBytes,
			nonceBytes,
		);
		return valid;
	} catch {
		return false; // subtle can throw on malformed signature bytes
	}
}

// ─── Derive a stable UserID from a public key ─────────────────────────────────

/**
 * Hash the JWK string with SHA-256 and return the first 16 bytes
 * encoded as a hex string (32 chars).
 *
 * This gives us a stable, deterministic userID tied to the keypair.
 * Even if the client reconnects from a new device with the same
 * exported keypair, they get the same userID.
 *
 * Not a UUID — intentionally shorter and visually distinct.
 */
async function deriveUserID(jwkString: string): Promise<UserID> {
	const encoded = new TextEncoder().encode(jwkString);
	const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
	const hashBytes = new Uint8Array(hashBuffer);

	return Array.from(hashBytes.slice(0, 16))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("") as UserID;
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function base64ToArrayBuffer(base64: string): ArrayBuffer {
	// Handle both standard base64 and URL-safe base64
	const normalized = base64.replace(/-/g, "+").replace(/_/g, "/");

	const binary = atob(normalized);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return bytes.buffer;
}

// ─── Exports ──────────────────────────────────────────────────────────────────

export const serverCrypto = {
	generateNonce,
	importPublicKey,
	verifySignature,
	deriveUserID,
};
