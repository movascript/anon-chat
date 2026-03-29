import type { UserID } from "@repo/types";
import { toast } from "sonner";
import { create } from "zustand";
import * as db from "@/lib/db";
import {
	createIdentity,
	hydrateRuntimeIdentity,
	type RuntimeIdentity,
	RuntimeIdentity2Identity,
} from "@/lib/identity";
import { AnonSocket } from "@/lib/socket";
import type { Contact, Message, Theme } from "@/types";

interface AppState {
	// Cached data from IndexedDB - which needs to be synced
	identity: RuntimeIdentity | null;
	contacts: Contact[] | null;

	socket: AnonSocket;
	rebuildSocket: () => AnonSocket;

	// UI
	theme: Theme;

	_hydrated: boolean;

	// Actions
	syncStore: () => Promise<void>;
	login: (username: string, displayName: string) => Promise<void>;
	logout: () => Promise<void>;
	toggleTheme: () => void;
	// sendMessage: (contactId: string, content: string) => void;
	markAsRead: (contactId: UserID) => void;
	updateUserOnlineStatus: (isOnline: boolean) => void;
	getContactMessages: (contactId: UserID) => Promise<Message[]>;
	getContact: (contactId: UserID) => Contact | undefined;
}

// Persist theme across sessions
const savedTheme = (localStorage.getItem("theme") as Theme) || "light";
if (savedTheme === "dark") document.documentElement.classList.add("dark");

export const useAppStore = create<AppState>((set, get) => ({
	identity: null,
	runtimeIdentity: null,
	contacts: null,

	socket: new AnonSocket(),
	// ! for now we keep this function - later should implement it inside the AnonSocket
	rebuildSocket: () => {
		get().socket.close();

		set({ socket: new AnonSocket() });

		return get().socket;
	},

	theme: savedTheme,

	_hydrated: false,
	syncStore: async () => {
		const [identity, contacts] = await Promise.all([
			hydrateRuntimeIdentity(),
			db.getAllContacts(),
		]);

		const socket = get().socket;
		if (identity && get().socket.currentState === "idle") {
			// ! in real life scenario the username might be taken when not connected
			// ! so this would trigger error and should be handled properly

			// to simulate production latency
			// ! should be removed on production
			setTimeout(() => socket.connect(identity), 300);
		}

		set({ identity, contacts, _hydrated: true });
	},

	login: async (username, displayName) => {
		const identity = await createIdentity(username, displayName);

		const socket = get().socket;

		const unsubAuthSUccess = socket.on("auth_success", async () => {
			const id = await RuntimeIdentity2Identity(identity);
			await db.saveIdentity(id);
			get().syncStore();
			toast.success("logged in successfully");

			unsubAuthSUccess();
			unsubAuthError();
		});
		const unsubAuthError = socket.on("auth_error", () => {
			get().rebuildSocket();

			unsubAuthSUccess();
			unsubAuthError();
		});

		set({ socket });

		socket.connect(identity);
	},

	logout: async () => {
		await db.clearIdentity();
		get().rebuildSocket();
		get().syncStore();
		toast.success("logged out successfully");
	},

	toggleTheme: () => {
		const next = get().theme === "light" ? "dark" : "light";
		localStorage.setItem("theme", next);
		document.documentElement.classList.toggle("dark", next === "dark");
		set({ theme: next });
	},

	// sendMessage: (contactId, content) => {
	// 	const newMsg: Message = {
	// 		id: `msg_${Date.now()}`,
	// 		contactId,
	// 		content,
	// 		timestamp: new Date(),
	// 		isSent: true,
	// 		status: "sending",
	// 		type: "text",
	// 	};

	// 	set((state) => ({
	// 		messages: [...state.messages, newMsg],
	// 		contacts: state.contacts.map((c) =>
	// 			c.id === contactId
	// 				? {
	// 						...c,
	// 						lastMessage: content,
	// 						lastMessageTime: new Date(),
	// 						unreadCount: 0,
	// 					}
	// 				: c,
	// 		),
	// 	}));

	// 	// Simulate status progression
	// 	setTimeout(() => {
	// 		set((state) => ({
	// 			messages: state.messages.map((m) =>
	// 				m.id === newMsg.id ? { ...m, status: "sent" } : m,
	// 			),
	// 		}));
	// 	}, 600);

	// 	setTimeout(() => {
	// 		set((state) => ({
	// 			messages: state.messages.map((m) =>
	// 				m.id === newMsg.id ? { ...m, status: "delivered" } : m,
	// 			),
	// 		}));
	// 	}, 1400);

	// 	setTimeout(() => {
	// 		set((state) => ({
	// 			messages: state.messages.map((m) =>
	// 				m.id === newMsg.id ? { ...m, status: "read" } : m,
	// 			),
	// 		}));
	// 	}, 2800);
	// },

	markAsRead: (contactId) => {
		db.clearUnread(contactId);
		get().syncStore();
	},

	updateUserOnlineStatus: (isOnline) => {
		// ! should become synced with db or restructed
		set((state) => ({
			identity: state.identity ? { ...state.identity, isOnline } : null,
		}));
	},

	getContactMessages: async (contactId) => {
		return await db.getMessages(contactId);
	},

	getContact: (contactId) => {
		return get().contacts?.find((c) => c.id === contactId);
	},
}));
