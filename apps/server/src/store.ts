import type { ConnectedClient, OutgoingFrame } from "@repo/types";
import type { WebSocket } from "ws";

// ─── In-Memory Registry ───────────────────────────────────────────────────────
//
// Two maps for O(1) lookup in both directions:
//   socketMap  : socketID  → ConnectedClient  (used on message receive / disconnect)
//   usernameMap: username  → socketID         (used for search + routing)
//   userIDMap  : userID    → socketID         (used for message relay)
//
// Nothing here is persisted. All state is gone on server restart.
// That is intentional per the AnonChat design.

const socketMap = new Map<string, ConnectedClient>(); // socketID → client
const usernameMap = new Map<string, string>(); // username → socketID
const userIDMap = new Map<string, string>(); // userID   → socketID

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateSocketID(): string {
	return crypto.randomUUID();
}

// ─── Registration ─────────────────────────────────────────────────────────────

/**
 * Called as soon as a raw WebSocket connection is established,
 * before authentication. Creates an unauthenticated client record
 * and assigns it a socketID.
 */
function registerSocket(socket: WebSocket, nonce: string): string {
	const socketID = generateSocketID();

	const client: ConnectedClient = {
		userID: "",
		username: "",
		publicKey: "",
		socket: socket as unknown,
		connectedAt: Date.now(),
		pendingNonce: nonce,
		authenticated: false,
	};

	socketMap.set(socketID, client);
	return socketID;
}

/**
 * Called after successful signature verification.
 * Promotes the client record to authenticated and indexes it
 * by userID and username.
 *
 * Returns false if the username is already taken by another
 * authenticated session, true on success.
 */
function authenticateClient(
	socketID: string,
	userID: string,
	username: string,
	publicKey: string,
): boolean {
	const client = socketMap.get(socketID);
	if (!client) return false;

	// reject if username already active on another socket
	const existingSocketID = usernameMap.get(username);
	if (existingSocketID && existingSocketID !== socketID) {
		const existing = socketMap.get(existingSocketID);
		if (existing?.authenticated) return false;
	}

	client.userID = userID;
	client.username = username;
	client.publicKey = publicKey;
	client.pendingNonce = null;
	client.authenticated = true;

	usernameMap.set(username, socketID);
	userIDMap.set(userID, socketID);

	return true;
}

// ─── Lookup ───────────────────────────────────────────────────────────────────

function getClientBySocketID(socketID: string): ConnectedClient | undefined {
	return socketMap.get(socketID);
}

function getClientByUsername(username: string): ConnectedClient | undefined {
	const socketID = usernameMap.get(username);
	if (!socketID) return undefined;
	return socketMap.get(socketID);
}

function getClientByUserID(userID: string): ConnectedClient | undefined {
	const socketID = userIDMap.get(userID);
	if (!socketID) return undefined;
	return socketMap.get(socketID);
}

function getSocketIDByUserID(userID: string): string | undefined {
	return userIDMap.get(userID);
}

function getSocketIDBySocketID(socketID: string): string | undefined {
	return socketMap.has(socketID) ? socketID : undefined;
}

// ─── Removal ──────────────────────────────────────────────────────────────────

/**
 * Called on WebSocket close or error.
 * Cleans up all three maps.
 * Returns the removed client record so the caller (relay)
 * can broadcast a presence:offline event.
 */
function removeClient(socketID: string): ConnectedClient | undefined {
	const client = socketMap.get(socketID);
	if (!client) return undefined;

	socketMap.delete(socketID);

	if (client.authenticated) {
		usernameMap.delete(client.username);
		userIDMap.delete(client.userID);
	}

	return client;
}

// ─── Sending ──────────────────────────────────────────────────────────────────

/**
 * Type-safe send helper.
 * Silently drops the message if the socket is not in OPEN state.
 */
function sendToSocket(socketID: string, frame: OutgoingFrame): boolean {
	const client = socketMap.get(socketID);
	if (!client) return false;

	const ws = client.socket as WebSocket;
	if (ws.readyState !== 1) return false; // 1 = WebSocket.OPEN

	ws.send(JSON.stringify(frame));
	return true;
}

/**
 * Send directly to a userID.
 * Returns false if user is not online.
 */
function sendToUserID(userID: string, frame: OutgoingFrame): boolean {
	const socketID = userIDMap.get(userID);
	if (!socketID) return false;
	return sendToSocket(socketID, frame);
}

// ─── Presence Subscribers ────────────────────────────────────────────────────
//
// Each client can subscribe to presence updates of specific userIDs.
// When a user connects or disconnects, all their subscribers are notified.
//
// Structure: subscriberMap[targetUserID] = Set<socketID of watchers>

const subscriberMap = new Map<string, Set<string>>();

function subscribeToPresence(
	watcherSocketID: string,
	targetUserID: string,
): void {
	if (!subscriberMap.has(targetUserID)) {
		subscriberMap.set(targetUserID, new Set());
	}
	subscriberMap.get(targetUserID)!.add(watcherSocketID);
}

function unsubscribeFromPresence(
	watcherSocketID: string,
	targetUserID: string,
): void {
	subscriberMap.get(targetUserID)?.delete(watcherSocketID);
}

/**
 * Remove all presence subscriptions where this socketID is the watcher.
 * Called on disconnect to clean up.
 */
function removeAllSubscriptions(watcherSocketID: string): void {
	for (const [targetUserID, watchers] of subscriberMap.entries()) {
		watchers.delete(watcherSocketID);
		if (watchers.size === 0) subscriberMap.delete(targetUserID);
	}
}

function getPresenceSubscribers(targetUserID: string): string[] {
	return Array.from(subscriberMap.get(targetUserID) ?? []);
}

// ─── Stats (optional, useful for health endpoint) ─────────────────────────────

function getStats() {
	return {
		totalConnections: socketMap.size,
		authenticatedUsers: userIDMap.size,
	};
}

// ─── Exports ──────────────────────────────────────────────────────────────────

export const store = {
	registerSocket,
	authenticateClient,
	getClientBySocketID,
	getClientByUsername,
	getClientByUserID,
	getSocketIDByUserID,
	removeClient,
	sendToSocket,
	sendToUserID,
	subscribeToPresence,
	unsubscribeFromPresence,
	removeAllSubscriptions,
	getPresenceSubscribers,
	getStats,
};
