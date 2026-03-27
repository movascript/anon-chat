import type { UserID } from "@repo/types";
import { create } from "zustand";
import * as db from "@/lib/db";
import { type RuntimeIdentity, RuntimeIdentity2Identity } from "@/lib/identity";
import type { Contact, Identity, Message, Theme } from "@/types";

interface AppState {
	// Cached data from IndexedDB - which needs to be synced
	identity: Identity | null;
	contacts: Contact[] | null;

	// UI
	theme: Theme;

	_hydrated: boolean;

	// Actions
	syncWithDB: () => Promise<void>;
	login: (identity: RuntimeIdentity) => Promise<void>;
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
	contacts: null,
	messages: null,

	theme: savedTheme,

	_hydrated: false,
	syncWithDB: async () => {
		const [identity, contacts] = await Promise.all([
			db.getIdentity(),
			db.getAllContacts(),
		]);

		set({ identity, contacts, _hydrated: true });
	},

	login: async (identity) => {
		const id = await RuntimeIdentity2Identity(identity);
		await db.saveIdentity(id);
		get().syncWithDB();
	},

	logout: async () => {
		await db.clearIdentity();
		get().syncWithDB();
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
		get().syncWithDB();
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
