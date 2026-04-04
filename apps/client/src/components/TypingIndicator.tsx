export function TypingIndicator() {
	return (
		<div className="mb-2 flex animate-duration-200 animate-fade-in justify-start">
			<div className="rounded-2xl rounded-bl-sm bg-bubble-received px-4 py-3 shadow-(--shadow)">
				<div className="flex items-center gap-1">
					<span className="typing-dot" />
					<span className="typing-dot" />
					<span className="typing-dot" />
				</div>
			</div>
		</div>
	)
}
