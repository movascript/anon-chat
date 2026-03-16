export interface Contact {
	id: string;
	name: string;
	username: string;
	avatar?: string;
	avatarColor: string;
	isOnline: boolean;
	lastSeen?: Date;
	lastMessage?: string;
	lastMessageTime?: Date;
	unreadCount: number;
	isTyping?: boolean;
	sharedMedia?: string[];
}

export interface Message {
	id: string;
	contactId: string;
	content: string;
	timestamp: Date;
	isSent: boolean;
	status: "sending" | "sent" | "delivered" | "read";
	type?: "text" | "image" | "system";
}

export interface User {
	id: string;
	name: string;
	username: string;
	avatar?: string;
	avatarColor: string;
	isOnline: boolean;
}

export type Theme = "light" | "dark";
