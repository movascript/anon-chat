import { useEffect, useState } from "react"

export function useTypingIndicator(contactId: string) {
	const [isTyping, setIsTyping] = useState(false)

	useEffect(() => {
		// Simulate random typing events for demo
		const startDelay = Math.random() * 8000 + 3000
		const startTimer = setTimeout(() => {
			setIsTyping(true)
			const stopTimer = setTimeout(
				() => {
					setIsTyping(false)
				},
				Math.random() * 3000 + 1500
			)
			return () => clearTimeout(stopTimer)
		}, startDelay)

		return () => clearTimeout(startTimer)
	}, [contactId])

	return isTyping
}
