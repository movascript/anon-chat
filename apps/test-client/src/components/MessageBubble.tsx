import { AlertCircle, Check, CheckCheck, Clock } from "lucide-react";

import type { Message } from "../types";

interface MessageBubbleProps {
	message: Message;
}

function formatTime(date: Date): string {
	return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

const StatusIcon: React.FC<{ status: Message["status"] }> = ({ status }) => {
	const cls = "w-3.5 h-3.5 shrink-0";
	switch (status) {
		case "sending":
			return <Clock className={`${cls} opacity-60`} />;
		case "sent":
			return <Check className={cls} />;
		case "delivered":
			return <CheckCheck className={cls} />;
		case "read":
			return <CheckCheck className={`${cls} text-sky-300`} />;
		default:
			return <AlertCircle className={cls} />;
	}
};

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
	const { isSent, content, timestamp, status } = message;

	return (
		<div
			className={`flex w-full mb-1 animate-fade-in ${isSent ? "justify-end" : "justify-start"}`}
		>
			<div
				className={`
          relative max-w-[72%] sm:max-w-[60%] px-3.5 py-2 rounded-2xl
          ${
						isSent
							? "rounded-br-sm bg-[var(--bubble-sent)] text-[var(--bubble-sent-text)]"
							: "rounded-bl-sm bg-[var(--bubble-received)] text-[var(--bubble-received-text)]"
					}
          shadow-[var(--shadow)]
        `}
			>
				<p className="text-sm leading-relaxed break-words whitespace-pre-wrap">
					{content}
				</p>
				<div
					className={`flex items-center gap-1 mt-0.5 ${isSent ? "justify-end" : "justify-start"}`}
				>
					<span
						className="text-[10px] opacity-70"
						style={{
							color: isSent ? "rgba(255,255,255,0.8)" : "var(--text-muted)",
						}}
					>
						{formatTime(timestamp)}
					</span>
					{isSent && (
						<span style={{ color: "rgba(255,255,255,0.8)" }}>
							<StatusIcon status={status} />
						</span>
					)}
				</div>
			</div>
		</div>
	);
};
