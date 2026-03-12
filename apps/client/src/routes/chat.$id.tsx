import { createFileRoute } from "@tanstack/react-router";
import { ChatWindow } from "../components/ChatWindow";

export const Route = createFileRoute("/chat/$id")({
	component: ChatPage,
});

function ChatPage() {
	const { id } = Route.useParams();

	return (
		<div className="fixed inset-0 bg-white">
			<ChatWindow chatId={id} />
		</div>
	);
}
