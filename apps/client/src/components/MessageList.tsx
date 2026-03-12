import { useEffect, useRef } from "react";
import type { Message } from "../types";

interface MessageListProps {
	messages: Message[];
}

export function MessageList({ messages }: MessageListProps) {
	const bottomRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		bottomRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages]);

	const formatTime = (timestamp: number) => {
		const date = new Date(timestamp);
		return date.toLocaleTimeString("fa-IR", {
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	return (
		<div className="flex-1 overflow-y-auto p-4 space-y-4">
			{messages.length === 0 ? (
				<div className="flex items-center justify-center h-full text-gray-400">
					<div className="text-center">
						<div className="text-6xl mb-4">💬</div>
						<p className="text-lg">هنوز پیامی ارسال نشده</p>
						<p className="text-sm mt-2">اولین پیام را بفرست!</p>
					</div>
				</div>
			) : (
				<>
					{messages.map((message) => (
						<div
							key={message.id}
							className={`flex ${message.isSent ? "justify-end" : "justify-start"}`}
						>
							<div
								className={message.isSent ? "message-sent" : "message-received"}
							>
								<p className="whitespace-pre-wrap break-words">
									{message.content}
								</p>
								<div
									className={`text-xs mt-1 ${
										message.isSent ? "text-indigo-200" : "text-gray-500"
									}`}
								>
									{formatTime(message.timestamp)}
								</div>
							</div>
						</div>
					))}
					<div ref={bottomRef} />
				</>
			)}
		</div>
	);
}
