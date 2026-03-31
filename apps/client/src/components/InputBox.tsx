import { useHotkey } from "@tanstack/react-hotkeys";
import { Send } from "lucide-react";
import { useRef, useState } from "react";
import { useAppStore } from "@/store/appStore";
import { cn } from "@/utils/className";

interface InputBoxProps {
	contactId: string;
	disabled?: boolean;
}

const InputBox = ({ contactId, disabled }: InputBoxProps) => {
	const { sendMessage } = useAppStore();

	const textareaRef = useRef<HTMLTextAreaElement>(null);

	const [inputText, setInputText] = useState("");

	const text = inputText.trim();

	const readyToSend = Boolean(!disabled && text && contactId);

	const handleSend = () => {
		if (!readyToSend) return;
		sendMessage(contactId, text);
		setInputText("");

		textareaRef.current?.focus();
	};

	useHotkey("Control+Enter", handleSend, { target: textareaRef });

	return (
		<div className="shrink-0 px-4 py-3 bg-header-bg border-t border-border">
			<div className="flex items-end gap-2">
				<div className="flex-1 flex items-center bg-input-bg rounded-3xl px-4 py-2.5 transition-all duration-200 focus-within:ring-1 focus-within:ring-accent">
					<textarea
						ref={textareaRef}
						value={inputText}
						onChange={(e) => {
							setInputText(e.target.value);
							e.currentTarget.style.height = "auto";
							e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`;
						}}
						placeholder="Message…"
						rows={1}
						disabled={disabled}
						className="flex-1 bg-transparent text-sm text-primary-foreground placeholder:text-muted focus:outline-none resize-none max-h-32 overflow-y-auto"
					/>
				</div>

				<button
					type="button"
					onClick={handleSend}
					disabled={readyToSend}
					aria-label="Send"
					className={cn(
						"p-2.5 rounded-full transition-all duration-200 shrink-0 text-sm font-semibold",
						readyToSend
							? "bg-accent hover:bg-accent-hover active:scale-95 text-white shadow-sm"
							: "bg-tertiary text-muted cursor-not-allowed",
					)}
				>
					<Send className="w-4.5 h-4.5" strokeWidth={2.5} />
				</button>
			</div>
		</div>
	);
};

export default InputBox;
