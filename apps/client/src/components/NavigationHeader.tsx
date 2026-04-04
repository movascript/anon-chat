import { useNavigate } from "@tanstack/react-router"
import { ArrowLeft } from "lucide-react"

interface NavigationHeaderProps {
	title: string
	subtitle?: string
	showBack?: boolean
	backTo?: string // ! backTo should be typesage not a string
	rightSlot?: React.ReactNode
	leftSlot?: React.ReactNode
}

export function NavigationHeader({
	title,
	subtitle,
	showBack = false,
	backTo,
	rightSlot,
	leftSlot,
}: NavigationHeaderProps) {
	const navigate = useNavigate()

	const handleBack = () => {
		if (backTo) navigate({ to: backTo })
		else navigate({ to: ".." })
	}

	return (
		<header className="z-10 flex h-16 shrink-0 items-center gap-3 border-border border-b bg-header-bg px-4">
			{showBack && (
				<button
					type="button"
					onClick={handleBack}
					className="-ml-1 rounded-full p-1.5 transition-all duration-200 hover:bg-secondary active:bg-tertiary"
					aria-label="Go back"
				>
					<ArrowLeft className="h-5 w-5 text-primary-foreground" />
				</button>
			)}
			{leftSlot}
			<div className="min-w-0 flex-1">
				<h1 className="truncate py-1 font-semibold text-base text-primary-foreground leading-tight">
					{title}
				</h1>
				{subtitle && (
					<p className="mt-0.5 truncate text-secondary-foreground text-xs leading-tight">
						{subtitle}
					</p>
				)}
			</div>
			{rightSlot && <div className="flex items-center gap-1">{rightSlot}</div>}
		</header>
	)
}
