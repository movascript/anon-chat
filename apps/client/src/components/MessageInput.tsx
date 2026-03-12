import { useEffect, useRef, useState } from "react";

interface MessageInputProps {
	onSendMessage: (message: string) => void;
	onTyping: (isTyping: boolean) => void;
	disabled?: boolean;
}

export function MessageInput({
	onSendMessage,
	onTyping,
	disabled,
}: MessageInputProps) {
	const [message, setMessage] = useState("");
	const [isTyping, setIsTyping] = useState(false);
	const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	useEffect(() => {
		return () => {
			if (typingTimeoutRef.current) {
				clearTimeout(typingTimeoutRef.current);
			}
		};
	}, []);

	const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		const value = e.target.value;
		setMessage(value);

		// Auto-resize textarea
		if (textareaRef.current) {
			textareaRef.current.style.height = "auto";
			textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
		}

		// Typing indicator logic
		if (value.length > 0 && !isTyping) {
			setIsTyping(true);
			onTyping(true);
		}

		if (typingTimeoutRef.current) {
			clearTimeout(typingTimeoutRef.current);
		}

		typingTimeoutRef.current = setTimeout(() => {
			setIsTyping(false);
			onTyping(false);
		}, 1000);
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();

		if (message.trim() && !disabled) {
			onSendMessage(message.trim());
			setMessage("");
			setIsTyping(false);
			onTyping(false);

			// Reset textarea height
			if (textareaRef.current) {
				textareaRef.current.style.height = "auto";
			}
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSubmit(e);
		}
	};

	return (
		<form onSubmit={handleSubmit} className="border-t bg-white p-4">
			<div className="flex items-end gap-3">
				<textarea
					ref={textareaRef}
					value={message}
					onChange={handleChange}
					onKeyDown={handleKeyDown}
					placeholder={disabled ? "منتظر اتصال..." : "پیام خود را بنویسید..."}
					disabled={disabled}
					rows={1}
					className="input-field resize-none max-h-32"
					style={{ minHeight: "42px" }}
				/>
				<button
					type="submit"
					disabled={!message.trim() || disabled}
					className="btn-primary shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					<span className="text-xl">📤</span>
				</button>
			</div>
			<div className="text-xs text-gray-500 mt-2">
				Enter برای ارسال • Shift+Enter برای خط جدید
			</div>
		</form>
	);
}
