import type { ChatRequestInFrame, ChatResponseFrame, UserID } from "@repo/types"
import { toast } from "sonner"
import * as DB from "@/lib/db"
import { useAppStore } from "@/store/appStore"
import type { Message, RuntimeContact, SearchedContact } from "@/types"

export function getContact(contactId: UserID): RuntimeContact | undefined {
	return useAppStore.getState().contacts?.find(c => c.id === contactId)
}

export async function getContactMessages(contactId: UserID): Promise<Message[]> {
	return await DB.getMessages(contactId)
}

export async function markAsRead(contactId: UserID): Promise<void> {
	await DB.clearUnread(contactId)
	await useAppStore.getState().syncStore()
}

export async function blockContact(userId: UserID): Promise<void> {
	await DB.updateContactStatus(userId, "blocked")
	await useAppStore.getState().syncStore()
}

export async function unblockContact(userId: UserID): Promise<void> {
	await DB.updateContactStatus(userId, "accepted")
	await useAppStore.getState().syncStore()
}

export async function deleteContact(userId: UserID): Promise<void> {
	await DB.updateContactStatus(userId, "deleted")
	await useAppStore.getState().syncStore()
}

export async function sendChatRequest({
	username,
	displayName,
	userID,
	publicKey,
}: SearchedContact): Promise<void> {
	const store = useAppStore.getState()

	if (userID === store.identity?.userID) {
		throw new Error("Cannot send a contact request to yourself")
	}

	const existing = getContact(userID)
	if (existing) {
		throw new Error("Cannot send a contact request to an existing contact")
	}

	await DB.upsertContact({
		id: userID,
		username,
		displayName,
		publicKey,
		status: "pending_out",
		lastMessage: null,
		lastMessageAt: null,
		unreadCount: 0,
	})

	store.socket.send({
		type: "chat_request",
		toUserID: userID,
	})

	console.info(`[Contacts] Sent chat request to ${username} (${userID})`)
	await store.syncStore()
}

export async function acceptChatRequest(userId: UserID): Promise<void> {
	const contact = getContact(userId)

	if (!contact) {
		console.warn(`[Contacts] Accepting an unknown contact is not possible: ${userId}`)
		return
	}

	try {
		await DB.updateContactStatus(contact.id, "accepted")

		useAppStore.getState().socket.send({
			type: "chat_accept",
			toUserID: contact.id,
		})

		await useAppStore.getState().syncStore()
		console.info(`[Contacts] Accepted request from ${contact.username} (${contact.id})`)
	} catch (err) {
		const reason = err instanceof Error ? err.message : String(err)
		console.error("Accepting request failed", reason)
	}
}

export async function declineChatRequest(userId: UserID, block = false): Promise<void> {
	const contact = getContact(userId)

	if (!contact) {
		console.warn(`[Contacts] Rejecting an unknown contact is not possible: ${userId}`)
		return
	}

	useAppStore.getState().socket.send({
		type: "chat_decline",
		toUserID: contact.id,
	})

	if (block) {
		await DB.updateContactStatus(contact.id, "blocked")
		console.info(`[Contacts] Blocked ${contact.id}`)
	} else {
		await DB.updateContactStatus(contact.id, "declined")
		console.info(`[Contacts] Declined request from ${contact.id}`)
	}

	await useAppStore.getState().syncStore()
}

export async function handleChatRequestInFrame(frame: ChatRequestInFrame): Promise<void> {
	const existing = getContact(frame.fromUserID)

	if (existing?.status === "blocked") {
		console.info(`[Contacts] Silently dropped request from blocked user ${frame.fromUserID}`)
		return
	}

	if (existing?.status === "accepted") {
		console.info(`[Contacts] Auto-accepting duplicate request from ${frame.fromUserID}`)
		useAppStore.getState().socket.send({
			type: "chat_accept",
			toUserID: frame.fromUserID,
		})
		return
	}

	await DB.upsertContact({
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

	await useAppStore.getState().syncStore()
}

export async function handleChatResponseFrame(frame: ChatResponseFrame): Promise<void> {
	const contact = getContact(frame.fromUserID)

	if (!contact) {
		console.warn(`[Contacts] Received response for unknown contact ${frame.fromUserID}`)
		return
	}

	if (contact.status !== "pending_out") {
		return
	}

	const newStatus = frame.accepted ? "accepted" : "declined"
	await DB.updateContactStatus(frame.fromUserID, newStatus)
	await useAppStore.getState().syncStore()

	if (frame.accepted) {
		toast.success("Your chat requests got accepted!", {
			description: `By: ${contact.displayName} #${contact.username}`,
		})
		console.info(`[Contacts] ${frame.fromUserID} accepted our request`)
	} else {
		toast.error("Your chat requests got rejected!", {
			description: `By: ${contact.displayName} #${contact.username}`,
		})
		console.info(`[Contacts] ${frame.fromUserID} declined our request`)
	}
}
