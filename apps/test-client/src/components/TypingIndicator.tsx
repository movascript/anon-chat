import type React from "react";

export const TypingIndicator: React.FC = () => (
	<div className="flex justify-start mb-2 animate-fade-in animate-duration-200">
		<div className="bg-bubble-received rounded-2xl rounded-bl-sm px-4 py-3 shadow-(--shadow)">
			<div className="flex items-center gap-1">
				<span className="typing-dot" />
				<span className="typing-dot" />
				<span className="typing-dot" />
			</div>
		</div>
	</div>
);
