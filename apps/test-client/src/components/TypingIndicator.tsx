import React from "react";

export const TypingIndicator: React.FC = () => (
	<div className="flex justify-start mb-2 animate-fade-in">
		<div className="bg-[var(--bubble-received)] rounded-2xl rounded-bl-sm px-4 py-3 shadow-[var(--shadow)]">
			<div className="flex items-center gap-1">
				<span className="typing-dot" />
				<span className="typing-dot" />
				<span className="typing-dot" />
			</div>
		</div>
	</div>
);
