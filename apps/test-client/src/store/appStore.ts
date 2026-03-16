import { create } from "zustand";
import { mockContacts, mockMessages, mockUser } from "../data/mockData";
import type { Contact, Message, Theme, User } from "../types";

interface AppState {
	// Auth
	currentUser: User | null;
	isLoggedIn: boolean;

	// Data
	contacts: Contact[];
	messages: Message[];

	// UI
	theme: Theme;
	searchQuery: string;

	// Actions
	login: (username: string) => void;
	logout: () => void;
	toggleTheme: () => void;
	setSearchQuery: (q: string) => void;
	sendMessage: (contactId: string, content: string) => void;
	markAsRead: (contactId: string) => void;
	updateUserOnlineStatus: (isOnline: boolean) => void;
	getContactMessages: (contactId: string) => Message[];
	getContact: (contactId: string) => Contact | undefined;
}

// Persist theme across sessions
const savedTheme = (localStorage.getItem("theme") as Theme) || "light";
if (savedTheme === "dark") document.documentElement.classList.add("dark");

export const useAppStore = create<AppState>((set, get) => ({
	currentUser: null,
	isLoggedIn: !!sessionStorage.getItem("anonchat_user"),
	contacts: mockContacts,
	messages: mockMessages,
	theme: savedTheme,
	searchQuery: "",

	login: (username: string) => {
		const user: User = {
			...mockUser,
			username,
			name: username,
		};
		sessionStorage.setItem("anonchat_user", JSON.stringify(user));
		set({ currentUser: user, isLoggedIn: true });
	},

	logout: () => {
		sessionStorage.removeItem("anonchat_user");
		set({ currentUser: null, isLoggedIn: false });
	},

	toggleTheme: () => {
		const next = get().theme === "light" ? "dark" : "light";
		localStorage.setItem("theme", next);
		document.documentElement.classList.toggle("dark", next === "dark");
		set({ theme: next });
	},

	setSearchQuery: (q) => set({ searchQuery: q }),

	sendMessage: (contactId, content) => {
		const newMsg: Message = {
			id: `msg_${Date.now()}`,
			contactId,
			content,
			timestamp: new Date(),
			isSent: true,
			status: "sending",
			type: "text",
		};

		set((state) => ({
			messages: [...state.messages, newMsg],
			contacts: state.contacts.map((c) =>
				c.id === contactId
					? {
							...c,
							lastMessage: content,
							lastMessageTime: new Date(),
							unreadCount: 0,
						}
					: c,
			),
		}));

		// Simulate status progression
		setTimeout(() => {
			set((state) => ({
				messages: state.messages.map((m) =>
					m.id === newMsg.id ? { ...m, status: "sent" } : m,
				),
			}));
		}, 600);

		setTimeout(() => {
			set((state) => ({
				messages: state.messages.map((m) =>
					m.id === newMsg.id ? { ...m, status: "delivered" } : m,
				),
			}));
		}, 1400);

		setTimeout(() => {
			set((state) => ({
				messages: state.messages.map((m) =>
					m.id === newMsg.id ? { ...m, status: "read" } : m,
				),
			}));
		}, 2800);
	},

	markAsRead: (contactId) => {
		set((state) => ({
			contacts: state.contacts.map((c) =>
				c.id === contactId ? { ...c, unreadCount: 0 } : c,
			),
			messages: state.messages.map((m) =>
				m.contactId === contactId && !m.isSent ? { ...m, status: "read" } : m,
			),
		}));
	},

	updateUserOnlineStatus: (isOnline) => {
		set((state) => ({
			currentUser: state.currentUser
				? { ...state.currentUser, isOnline }
				: null,
		}));
	},

	getContactMessages: (contactId) => {
		return get().messages.filter((m) => m.contactId === contactId);
	},

	getContact: (contactId) => {
		return get().contacts.find((c) => c.id === contactId);
	},
}));
