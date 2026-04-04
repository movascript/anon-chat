import { AlertCircle, Check, CheckCheck, Clock } from "lucide-react"
import type { Message } from "@/types"
import { cn } from "@/utils/className"
import { toDate } from "@/utils/date"

interface MessageBubbleProps {
	message: Message
}

function formatTime(date: Date | number): string {
	const d = toDate(date)
	return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

function StatusIcon({ status }: { status: Message["status"] }) {
	const cls = "w-3.5 h-3.5 shrink-0"
	switch (status) {
		case "sending":
			return <Clock className={cn(cls, "opacity-60")} />
		case "delivered":
			return <Check className={cls} />
		case "received":
			return <CheckCheck className={cls} />
		case "failed":
			return <AlertCircle className={cls} />
		default:
			return <AlertCircle className={cls} />
	}
}

export function MessageBubble({ message }: MessageBubbleProps) {
	const { sentByMe, content, ts, status } = message

	return (
		<div
			className={cn(
				"mb-1 flex w-full animate-duration-200 animate-fade-in",
				sentByMe ? "justify-end" : "justify-start"
			)}
		>
			<div
				className={cn(
					"relative max-w-[72%] rounded-2xl px-3.5 py-2.5 shadow-(--shadow) sm:max-w-[60%]",
					sentByMe
						? "rounded-br-sm bg-bubble-sent text-bubble-sent-text"
						: "rounded-bl-sm bg-bubble-received text-bubble-received-text"
				)}
			>
				<p className="wrap-break-word whitespace-pre-wrap text-sm leading-relaxed">{content}</p>
				<div
					className={cn("mt-1 flex items-center gap-1", sentByMe ? "justify-end" : "justify-start")}
				>
					<span className={cn("text-[10px]", sentByMe ? "text-white/80" : "text-muted opacity-70")}>
						{formatTime(ts)}
					</span>
					{sentByMe && (
						<span className="text-white/80">
							<StatusIcon status={status} />
						</span>
					)}
				</div>
			</div>
		</div>
	)
}
