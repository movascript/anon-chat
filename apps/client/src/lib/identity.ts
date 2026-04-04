import type { UserID } from "@repo/types"
import type { Identity } from "@/types"
import { getIdentity, saveIdentity } from "./db"

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * ECDSA with P-256 — widely supported, ~128-bit security level.
 * SHA-256 is used as the digest during sign/verify.
 */
const KEY_ALGORITHM: EcKeyGenParams = {
	name: "ECDSA",
	namedCurve: "P-256",
}

const SIGN_ALGORITHM: EcdsaParams = {
	name: "ECDSA",
	hash: { name: "SHA-256" },
}

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * The in-memory identity used at runtime.
 * Holds live CryptoKey objects alongside the plain record from IndexedDB.
 */
export interface RuntimeIdentity {
	userID: UserID
	username: string
	displayName: string
	publicKey: CryptoKey // verify + export only
	privateKey: CryptoKey // sign only — never exported after initial save
	publicKeyJwk: JsonWebKey
}

// ─── Key Generation ───────────────────────────────────────────────────────────

/**
 * Generates a fresh ECDSA P-256 keypair.
 * Both keys are marked extractable so we can export them to JWK for storage.
 * After the initial export + save, the private key is never re-exported.
 */
async function generateKeypair(): Promise<CryptoKeyPair> {
	return crypto.subtle.generateKey(
		KEY_ALGORITHM,
		true, // extractable — needed for JWK export to IndexedDB
		["sign", "verify"]
	)
}

// ─── JWK Serialisation ────────────────────────────────────────────────────────

async function exportPublicKey(key: CryptoKey): Promise<JsonWebKey> {
	return crypto.subtle.exportKey("jwk", key)
}

async function exportPrivateKey(key: CryptoKey): Promise<JsonWebKey> {
	return crypto.subtle.exportKey("jwk", key)
}

async function importPublicKey(jwk: JsonWebKey): Promise<CryptoKey> {
	return crypto.subtle.importKey("jwk", jwk, KEY_ALGORITHM, true, ["verify"])
}

async function importPrivateKey(jwk: JsonWebKey): Promise<CryptoKey> {
	return crypto.subtle.importKey(
		"jwk",
		jwk,
		KEY_ALGORITHM,
		false, // not extractable after import — one-way
		["sign"]
	)
}

// ─── UserID Derivation ────────────────────────────────────────────────────────

/**
 * Derives a stable userID from the public key JWK.
 * Must produce the same result as `serverCrypto.deriveUserID` in backend/crypto.ts.
 *
 * Algorithm: SHA-256( canonicalJSON(publicKeyJwk) ) → first 32 hex chars
 */
export async function deriveUserID(publicKeyJwk: JsonWebKey) {
	// Canonical form: sort keys alphabetically to guarantee stable stringification
	const canonical = canonicalJsonStringify(publicKeyJwk)
	const encoded = new TextEncoder().encode(canonical)
	const hashBuf = await crypto.subtle.digest("SHA-256", encoded)
	const hashArr = Array.from(new Uint8Array(hashBuf))
	const hashHex = hashArr.map(b => b.toString(16).padStart(2, "0")).join("")
	return hashHex.slice(0, 32) as UserID
}

/**
 * Stable JSON stringify — sorts object keys recursively so the output
 * is deterministic regardless of insertion order.
 */
function canonicalJsonStringify(value: unknown): string {
	if (Array.isArray(value)) {
		return `[${value.map(canonicalJsonStringify).join(",")}]`
	}
	if (value !== null && typeof value === "object") {
		const sorted = Object.keys(value as object)
			.sort()
			.map(k => {
				const v = (value as Record<string, unknown>)[k]
				return `${JSON.stringify(k)}:${canonicalJsonStringify(v)}`
			})
		return `{${sorted.join(",")}}`
	}
	return JSON.stringify(value)
}

// ─── Signing ──────────────────────────────────────────────────────────────────

/**
 * Signs a nonce string (hex) using the private key.
 * The server sends the nonce as a hex string; we encode it to bytes,
 * sign those bytes, and return the signature as a base64 string.
 *
 * This must mirror what `serverCrypto.verifySignature` expects.
 */
export async function signNonce(privateKey: CryptoKey, nonce: string): Promise<string> {
	const nonceBytes = hexToBytes(nonce)
	const sigBuf = await crypto.subtle.sign(SIGN_ALGORITHM, privateKey, nonceBytes)
	return bytesToBase64(new Uint8Array(sigBuf))
}

// -----------------

export async function RuntimeIdentity2Identity(identity: RuntimeIdentity) {
	const publicKeyJwk = await exportPublicKey(identity.publicKey)
	const privateKeyJwk = await exportPrivateKey(identity.privateKey)

	const record: Identity = {
		id: 1,
		userID: identity.userID,
		username: identity.username,
		displayName: identity.displayName,
		publicKey: publicKeyJwk,
		privateKey: privateKeyJwk,
		createdAt: Date.now(),
	}

	return record
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────

/**
 * After the user picks a username, generate the keypair, derive the userID,
 * persist to IndexedDB, and return the RuntimeIdentity.
 *
 * Separated from `loadOrCreateIdentity` so the onboarding UI can collect
 * the username first and only then commit.
 */
export async function createAndSaveIdentity(
	username: string,
	displayName: string
): Promise<RuntimeIdentity> {
	const existing = await getIdentity()
	if (existing) throw new Error("Identity already exists")

	const keypair = await generateKeypair()
	const publicKeyJwk = await exportPublicKey(keypair.publicKey)
	const privateKeyJwk = await exportPrivateKey(keypair.privateKey)
	const userID = await deriveUserID(publicKeyJwk)

	const record: Identity = {
		id: 1,
		userID,
		username,
		displayName,
		publicKey: publicKeyJwk,
		privateKey: privateKeyJwk,
		createdAt: Date.now(),
	}

	await saveIdentity(record)

	return {
		userID,
		username,
		displayName,
		publicKey: keypair.publicKey,
		privateKey: keypair.privateKey,
		publicKeyJwk,
	}
}

// ─── Internal Helpers ─────────────────────────────────────────────────────────

export async function hydrateRuntimeIdentity(): Promise<RuntimeIdentity | null> {
	const record = await getIdentity()
	if (!record) return null

	const [publicKey, privateKey] = await Promise.all([
		importPublicKey(record.publicKey),
		importPrivateKey(record.privateKey),
	])

	return {
		userID: record.userID,
		username: record.username,
		displayName: record.displayName,
		publicKey,
		privateKey,
		publicKeyJwk: record.publicKey,
	}
}

export async function createIdentity(
	username: string,
	displayName: string
): Promise<RuntimeIdentity> {
	const keypair = await generateKeypair()
	const publicKeyJwk = await exportPublicKey(keypair.publicKey)
	const userID = await deriveUserID(publicKeyJwk)

	return {
		userID,
		username,
		displayName,
		publicKey: keypair.publicKey,
		privateKey: keypair.privateKey,
		publicKeyJwk,
	}
}

// ─── Encoding Utilities ───────────────────────────────────────────────────────

export function hexToBytes(hex: string): Uint8Array<ArrayBuffer> {
	if (hex.length % 2 !== 0) throw new Error("Invalid hex string")
	const bytes = new Uint8Array(hex.length / 2)
	for (let i = 0; i < bytes.length; i++) {
		bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
	}
	return bytes
}

function bytesToBase64(bytes: Uint8Array): string {
	let binary = ""
	for (const b of bytes) {
		binary += String.fromCharCode(b)
	}
	return btoa(binary)
}
