import type { PresenceFrame, UserID } from "@repo/types"
import { toast } from "sonner"
import { create } from "zustand"
import * as Contacts from "@/lib/contacts"
import * as DB from "@/lib/db"
import { createIdentity, hydrateRuntimeIdentity, RuntimeIdentity2Identity } from "@/lib/identity"
import { AnonSocket } from "@/lib/socket"
import type { RuntimeContact, RuntimeIdentity } from "@/types"

interface AppState {
	identity: RuntimeIdentity | null
	contacts: RuntimeContact[] | null
	presenceMap: Map<UserID, boolean>
	typingMap: Map<UserID, boolean>

	socket: AnonSocket
	rebuildSocket: () => AnonSocket
	attachSocketListeners: () => void

	_hydrated: boolean

	// Actions
	syncStore: () => Promise<void>
	login: (username: string, displayName: string) => Promise<void>
	logout: () => Promise<void>
	updateUserOnlineStatus: (isOnline: boolean) => void
	handlePresenceFrame: (frame: PresenceFrame) => void
}

export const useAppStore = create<AppState>((set, get) => ({
	identity: null,
	contacts: null,
	presenceMap: new Map(),
	typingMap: new Map(),

	socket: new AnonSocket(),

	rebuildSocket: () => {
		get().socket.close()
		set({ socket: new AnonSocket() })
		get().attachSocketListeners()
		return get().socket
	},

	attachSocketListeners: () => {
		get().socket.on("presence", get().handlePresenceFrame)
		get().socket.on("chat_request_in", Contacts.handleChatRequestInFrame)
		get().socket.on("chat_response", Contacts.handleChatResponseFrame)
	},

	_hydrated: false,

	syncStore: async () => {
		const [identity, rawContacts] = await Promise.all([
			hydrateRuntimeIdentity(),
			DB.getAllContacts(),
		])

		const contacts = rawContacts.map(contact => ({
			...contact,
			online: get().presenceMap.get(contact.id) ?? false,
			isTyping: get().typingMap.get(contact.id) ?? false,
		}))

		if (!get()._hydrated) get().attachSocketListeners()

		const socket = get().socket
		if (identity && get().socket.currentState === "idle") {
			get().attachSocketListeners()
			setTimeout(() => socket.connect(identity), 300)
		}

		set({ identity, contacts, _hydrated: true })
	},

	login: async (username, displayName) => {
		const identity = await createIdentity(username, displayName)
		const socket = get().socket

		const unsubAuthSUccess = socket.on("auth_success", async () => {
			const id = await RuntimeIdentity2Identity(identity)
			await DB.saveIdentity(id)
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
		await DB.clearIdentity()
		get().rebuildSocket()
		get().syncStore()
		toast.success("logged out successfully")
	},

	updateUserOnlineStatus: isOnline => {
		set(state => ({
			identity: state.identity ? { ...state.identity, isOnline } : null,
		}))
	},

	handlePresenceFrame: (frame: PresenceFrame) => {
		get().presenceMap.set(frame.userID, frame.online)
	},
}))
