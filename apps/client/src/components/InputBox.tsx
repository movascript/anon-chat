import { useHotkey } from "@tanstack/react-hotkeys"
import { Send } from "lucide-react"
import { useRef, useState } from "react"
import { useAppStore } from "@/store/appStore"
import { cn } from "@/utils/className"

interface InputBoxProps {
	contactId: string
	disabled?: boolean
}

const InputBox = ({ contactId, disabled }: InputBoxProps) => {
	const { sendMessage } = useAppStore()

	const textareaRef = useRef<HTMLTextAreaElement>(null)

	const [inputText, setInputText] = useState("")

	const text = inputText.trim()

	const readyToSend = Boolean(!disabled && text && contactId)

	const handleSend = () => {
		if (!readyToSend) return
		sendMessage(contactId, text)
		setInputText("")

		textareaRef.current?.focus()
	}

	useHotkey("Control+Enter", handleSend, { target: textareaRef })

	return (
		<div className="shrink-0 border-border border-t bg-header-bg px-4 py-3">
			<div className="flex items-end gap-2">
				<div className="flex flex-1 items-center rounded-3xl bg-input-bg px-4 py-2.5 transition-all duration-200 focus-within:ring-1 focus-within:ring-accent">
					<textarea
						ref={textareaRef}
						value={inputText}
						onChange={e => {
							setInputText(e.target.value)
							e.currentTarget.style.height = "auto"
							e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`
						}}
						placeholder="Message…"
						rows={1}
						disabled={disabled}
						className="max-h-32 flex-1 resize-none overflow-y-auto bg-transparent text-primary-foreground text-sm placeholder:text-muted focus:outline-none"
					/>
				</div>

				<button
					type="button"
					onClick={handleSend}
					disabled={readyToSend}
					aria-label="Send"
					className={cn(
						"shrink-0 rounded-full p-2.5 font-semibold text-sm transition-all duration-200",
						readyToSend
							? "bg-accent text-white shadow-sm hover:bg-accent-hover active:scale-95"
							: "cursor-not-allowed bg-tertiary text-muted"
					)}
				>
					<Send className="h-4.5 w-4.5" strokeWidth={2.5} />
				</button>
			</div>
		</div>
	)
}

export default InputBox
