import type { ChatRequestInFrame, ChatResponseFrame, PresenceFrame, UserID } from "@repo/types"
import { toast } from "sonner"
import { create } from "zustand"
import * as db from "@/lib/db"
import {
	createIdentity,
	hydrateRuntimeIdentity,
	type RuntimeIdentity,
	RuntimeIdentity2Identity,
} from "@/lib/identity"
import { AnonSocket } from "@/lib/socket"
import type { Contact, Message, SearchedContact } from "@/types"

interface AppState {
	// Cached data from IndexedDB - which needs to be synced
	identity: RuntimeIdentity | null
	contacts: Contact[] | null
	presenceMap: Map<UserID, boolean>

	socket: AnonSocket
	rebuildSocket: () => AnonSocket
	attachSocketListeners: () => void

	_hydrated: boolean

	// Actions
	syncStore: () => Promise<void>
	login: (username: string, displayName: string) => Promise<void>
	logout: () => Promise<void>
	// sendMessage: (contactId: string, content: string) => void;
	markAsRead: (contactId: UserID) => void
	updateUserOnlineStatus: (isOnline: boolean) => void
	getContactMessages: (contactId: UserID) => Promise<Message[]>
	getContact: (contactId: UserID) => Contact | undefined

	blockContact: (userId: UserID) => Promise<void>
	unblockContact: (userId: UserID) => Promise<void>
	deleteContact: (userId: UserID) => Promise<void>

	sendChatRequest: ({ username, displayName, userID, publicKey }: SearchedContact) => Promise<void>
	acceptChatRequest: (userId: UserID) => Promise<void>
	declineChatRequest: (userId: UserID, block?: boolean) => Promise<void>

	handlePresenceFrame: (frame: PresenceFrame) => void
	handleChatRequestInFrame: (frame: ChatRequestInFrame) => Promise<void>
	handleChatResponseFrame: (frame: ChatResponseFrame) => Promise<void>
}

export const useAppStore = create<AppState>((set, get) => ({
	identity: null,
	contacts: null,
	presenceMap: new Map(),

	socket: new AnonSocket(),
	// ! for now we keep this function - later should implement it inside the AnonSocket
	rebuildSocket: () => {
		get().socket.close()

		set({ socket: new AnonSocket() })

		get().attachSocketListeners()

		return get().socket
	},
	attachSocketListeners: () => {
		// ! no unsubs added hopefully nothings gonna happen
		get().socket.on("presence", get().handlePresenceFrame)

		get().socket.on("chat_request_in", get().handleChatRequestInFrame)

		get().socket.on("chat_response", get().handleChatResponseFrame)
	},

	_hydrated: false,
	syncStore: async () => {
		const [identity, contacts] = await Promise.all([hydrateRuntimeIdentity(), db.getAllContacts()])

		if (!get()._hydrated) get().attachSocketListeners()

		const socket = get().socket
		if (identity && get().socket.currentState === "idle") {
			get().attachSocketListeners()
			// ! in real life scenario the username might be taken when not connected
			// ! so this would trigger error and should be handled properly

			// to simulate production latency
			// ! should be removed on production
			setTimeout(() => socket.connect(identity), 300)
		}

		set({ identity, contacts, _hydrated: true })
	},

	login: async (username, displayName) => {
		const identity = await createIdentity(username, displayName)

		const socket = get().socket

		const unsubAuthSUccess = socket.on("auth_success", async () => {
			const id = await RuntimeIdentity2Identity(identity)
			await db.saveIdentity(id)
			get().syncStore()
			toast.success("logged in successfully")

			unsubAuthSUccess()
			unsubAuthError()
		})
		const unsubAuthError = socket.on("auth_error", () => {
			get().rebuildSocket()

			unsubAuthSUccess()
			unsubAuthError()
		})

		set({ socket })

		socket.connect(identity)
	},

	logout: async () => {
		await db.clearIdentity()
		get().rebuildSocket()
		get().syncStore()
		toast.success("logged out successfully")
	},

	// --------------------------------------------------------------------------

	markAsRead: contactId => {
		db.clearUnread(contactId)
		get().syncStore()
	},

	updateUserOnlineStatus: isOnline => {
		// ! should become synced with db or restructed
		set(state => ({
			identity: state.identity ? { ...state.identity, isOnline } : null,
		}))
	},

	getContactMessages: async contactId => {
		return await db.getMessages(contactId)
	},

	getContact: contactId => {
		return get().contacts?.find(c => c.id === contactId)
	},

	blockContact: async userId => {
		await db.updateContactStatus(userId, "blocked")
		await get().syncStore()
	},
	unblockContact: async userId => {
		await db.updateContactStatus(userId, "accepted")
		await get().syncStore()
	},
	deleteContact: async userId => {
		await db.updateContactStatus(userId, "deleted")
		await get().syncStore()
	},

	sendChatRequest: async ({ username, displayName, userID, publicKey }) => {
		if (userID === useAppStore.getState().identity?.userID) {
			throw new Error("Cannot send a contact request to yourself")
		}

		// Idempotency: if a record already exists, return
		const existing = get().getContact(userID)
		if (existing) {
			throw new Error("Cannot send a contact request to an existing contact")
		}

		await db.upsertContact({
			id: userID,
			username,
			displayName,
			publicKey,
			status: "pending_out",

			lastMessage: null,
			lastMessageAt: null,
			unreadCount: 0,
		})

		useAppStore.getState().socket.send({
			type: "chat_request",
			toUserID: userID,
		})

		console.info(`[Contacts] Sent chat request to ${username} (${userID})`)

		await get().syncStore()
	},

	acceptChatRequest: async userId => {
		const contact = get().getContact(userId)

		if (!contact) {
			console.warn(`[Contacts] Accepting an unknown contanct is not possible: ${userId}`)
			return
		}

		try {
			await db.updateContactStatus(contact.id, "accepted")

			useAppStore.getState().socket.send({
				type: "chat_accept",
				toUserID: contact.id,
			})

			await get().syncStore()

			// Subscribe to their online/offline events
			// ! this.subscribePresence([frame.fromUserID]);

			console.info(`[Contacts] Accepted request from ${contact.username} (${contact.id})`)
		} catch (err) {
			const reason = err instanceof Error ? err.message : String(err)
			console.error("Accepting request failed", reason)
		}
	},

	declineChatRequest: async (userId, block = false) => {
		const contact = get().getContact(userId)

		if (!contact) {
			console.warn(`[Contacts] Rejecting an unknown contanct is not possible: ${userId}`)
			return
		}

		useAppStore.getState().socket.send({
			type: "chat_decline",
			toUserID: contact.id,
		})

		if (block) {
			await db.updateContactStatus(contact.id, "blocked")
			console.info(`[Contacts] Blocked ${contact.id}`)
		} else {
			// ! the status `declined` has the feeling that the user got declined
			// ! by the other party which is wise-versa
			await db.updateContactStatus(contact.id, "declined")
			console.info(`[Contacts] Declined request from ${contact.id}`)
		}

		await get().syncStore()
	},

	handlePresenceFrame: (frame: PresenceFrame) => {
		get().presenceMap.set(frame.userID, frame.online)
	},

	handleChatRequestInFrame: async frame => {
		// Drop request if we've already blocked this user
		const existing = get().getContact(frame.fromUserID)
		if (existing?.status === "blocked") {
			console.info(`[Contacts] Silently dropped request from blocked user ${frame.fromUserID}`)
			return
		}

		// If we already accepted this user, auto-accept (duplicate handshake after reconnect)
		if (existing?.status === "accepted") {
			console.info(`[Contacts] Auto-accepting duplicate request from ${frame.fromUserID}`)
			useAppStore.getState().socket.send({
				type: "chat_accept",
				toUserID: frame.fromUserID,
			})
			return
		}

		// put the contact in the list for user to decide what to do
		await db.upsertContact({
			id: frame.fromUserID,
			username: frame.fromUsername,
			displayName: frame.fromDisplayName,
			publicKey: JSON.parse(frame.fromPublicKey),
			status: "pending_in",

			lastMessage: null,
			lastMessageAt: null,
			unreadCount: 0,
		})

		toast.info("New chat request came in!", {
			description: `From: ${frame.fromDisplayName} #${frame.fromUsername}`,
		})

		await get().syncStore()
	},

	handleChatResponseFrame: async frame => {
		const contact = get().getContact(frame.fromUserID)

		if (!contact) {
			console.warn(`[Contacts] Received response for unknown contact ${frame.fromUserID}`)
			return
		}

		if (contact.status !== "pending_out") {
			// Already resolved (e.g. duplicate ACK after reconnect) — ignore
			return
		}

		const newStatus = frame.accepted ? "accepted" : "declined"

		await db.updateContactStatus(frame.fromUserID, newStatus)
		await get().syncStore()

		if (frame.accepted) {
			toast.success("Your chat requests got accepted!", {
				description: `By: ${contact.displayName} #${contact.username}`,
			})
			// Start watching their presence now that we're connected
			// ! this.subscribePresence([frame.fromUserID]);
			console.info(`[Contacts] ${frame.fromUserID} accepted our request`)
		} else {
			toast.error("Your chat requests got rejected!", {
				description: `By: ${contact.displayName} #${contact.username}`,
			})
			console.info(`[Contacts] ${frame.fromUserID} declined our request`)
		}
	},
}))
