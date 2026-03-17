import { AlertCircle, Check, CheckCheck, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Message } from "../types";

interface MessageBubbleProps {
	message: Message;
}

function formatTime(date: Date): string {
	return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function StatusIcon({ status }: { status: Message["status"] }) {
	const cls = "w-3.5 h-3.5 shrink-0";
	switch (status) {
		case "sending":
			return <Clock className={cn(cls, "opacity-60")} />;
		case "sent":
			return <Check className={cls} />;
		case "delivered":
			return <CheckCheck className={cls} />;
		case "read":
			return <CheckCheck className={cn(cls, "text-sky-300")} />;
		default:
			return <AlertCircle className={cls} />;
	}
}

export function MessageBubble({ message }: MessageBubbleProps) {
	const { isSent, content, timestamp, status } = message;

	return (
		<div
			className={cn(
				"flex w-full mb-1 animate-fade-in animate-duration-200",
				isSent ? "justify-end" : "justify-start",
			)}
		>
			<div
				className={cn(
					"relative max-w-[72%] sm:max-w-[60%] px-3.5 py-2.5 rounded-2xl shadow-(--shadow)",
					isSent
						? "rounded-br-sm bg-bubble-sent text-bubble-sent-text"
						: "rounded-bl-sm bg-bubble-received text-bubble-received-text",
				)}
			>
				<p className="text-sm leading-relaxed wrap-break-word whitespace-pre-wrap">
					{content}
				</p>
				<div
					className={cn(
						"flex items-center gap-1 mt-1",
						isSent ? "justify-end" : "justify-start",
					)}
				>
					<span
						className={cn(
							"text-[10px]",
							isSent ? "text-white/80" : "text-muted opacity-70",
						)}
					>
						{formatTime(timestamp)}
					</span>
					{isSent && (
						<span className="text-white/80">
							<StatusIcon status={status} />
						</span>
					)}
				</div>
			</div>
		</div>
	);
}
