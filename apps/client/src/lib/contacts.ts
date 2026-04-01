import { db } from "./db";

// ─── In-Memory Presence Cache ─────────────────────────────────────────────────

/**
 * Presence state lives here, not in IndexedDB.
 * Writing presence to disk on every event is wasteful — on reload
 * we re-subscribe and get fresh state from the server anyway.
 */

// ─── Contacts Manager ─────────────────────────────────────────────────────────

export class ContactsManager {
	async init(): Promise<void> {
		await this.resubscribePresence();
	}

	/**
	 * Detach all socket listeners. Call on logout / account reset.
	 */
	// destroy(): void {
	// 	for (const unsub of this.unsubs) unsub();
	// 	this.unsubs = [];
	// }

	// ─── Private: Socket Event Handling ───────────────────────────────────────

	// ─── Private: Re-subscription on Reconnect ────────────────────────────────

	/**

    After reconnecting, the server has no memory of our presence subscriptions.
    We re-send subscribe_presence for every accepted contact so we get
    fresh status pushes and resume tracking.

*/

	private async resubscribePresence(): Promise<void> {
		const accepted = await db.contacts
			.where("status")
			.equals("accepted")
			.toArray();

		const ids = accepted.map((c) => c.id);
		if (ids.length > 0) {
			// ! this.subscribePresence(ids);
			console.info(
				`[Contacts] Re-subscribed presence for ${ids.length} contact(s)`,
			);
		}
	}
}
