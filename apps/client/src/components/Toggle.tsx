import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/utils/className"

const toggleVariants = cva("relative shrink-0 rounded-full transition-colors duration-200", {
	variants: {
		size: {
			sm: "h-5 w-9",
			md: "h-6 w-11",
		},
		checked: {
			true: "bg-accent",
			false: "bg-tertiary",
		},
	},
	defaultVariants: {
		size: "md",
		checked: false,
	},
})

const thumbVariants = cva(
	"absolute top-0.5 rounded-full bg-white shadow transition-transform duration-200",
	{
		variants: {
			size: {
				sm: "left-0.5 h-4 w-4",
				md: "left-0.5 h-5 w-5",
			},
			checked: {
				true: "",
				false: "translate-x-0",
			},
		},
		compoundVariants: [
			{
				size: "sm",
				checked: true,
				className: "translate-x-4",
			},
			{
				size: "md",
				checked: true,
				className: "translate-x-5",
			},
		],
		defaultVariants: {
			size: "md",
			checked: false,
		},
	}
)

interface ToggleProps extends VariantProps<typeof toggleVariants> {
	checked: boolean
	onChange: () => void
	label: string
	buttonLess?: boolean // prevents hydrartion error when used inside settings row
}

export function Toggle({ checked, onChange, label, size, buttonLess }: ToggleProps) {
	if (buttonLess) {
		return (
			<div className={cn(toggleVariants({ checked, size }))}>
				<span className={cn(thumbVariants({ checked, size }))} />
			</div>
		)
	}
	return (
		<button
			type="button"
			role="switch"
			aria-checked={checked}
			aria-label={label}
			onClick={onChange}
			className={cn(toggleVariants({ checked, size }))}
		>
			<span className={cn(thumbVariants({ checked, size }))} />
		</button>
	)
}
