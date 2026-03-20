import { Send } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/appStore";

const InputBox = ({ contactId }: { contactId: string }) => {
	const { sendMessage } = useAppStore();

	const textareaRef = useRef<HTMLTextAreaElement>(null);

	const [inputText, setInputText] = useState("");

	const handleSend = useCallback(() => {
		const text = inputText.trim();
		if (!text || !contactId) return;
		sendMessage(contactId, text);
		setInputText("");

		textareaRef.current?.focus();
	}, [inputText, contactId, sendMessage]);

	const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
			e.preventDefault();
			handleSend();
		}
	};

	useEffect(() => {
		if (textareaRef.current) {
			textareaRef.current.style.height = "auto";
			textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
		}
	}, [inputText]);

	return (
		<div className="shrink-0 px-4 py-3 bg-header-bg border-t border-border">
			<div className="flex items-end gap-2">
				<div className="flex-1 flex items-center bg-input-bg rounded-3xl px-4 py-2.5 transition-all duration-200 focus-within:ring-1 focus-within:ring-accent">
					<textarea
						ref={textareaRef}
						value={inputText}
						onChange={(e) => setInputText(e.target.value)}
						onKeyDown={handleKey}
						placeholder="Message…"
						rows={1}
						className="flex-1 bg-transparent text-sm text-primary-foreground placeholder:text-muted focus:outline-none resize-none max-h-32 overflow-y-auto"
					/>
				</div>

				<button
					type="button"
					onClick={handleSend}
					disabled={!inputText.trim()}
					aria-label="Send"
					className={cn(
						"p-2.5 rounded-full transition-all duration-200 shrink-0 text-sm font-semibold",
						inputText.trim()
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
