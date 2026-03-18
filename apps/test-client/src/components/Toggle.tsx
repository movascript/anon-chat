import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const toggleVariants = cva(
	"relative rounded-full transition-colors duration-200 shrink-0",
	{
		variants: {
			size: {
				sm: "w-9 h-5",
				md: "w-11 h-6",
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
	},
);

const thumbVariants = cva(
	"absolute top-0.5 bg-white rounded-full shadow transition-transform duration-200",
	{
		variants: {
			size: {
				sm: "left-0.5 w-4 h-4",
				md: "left-0.5 w-5 h-5",
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
	},
);

interface ToggleProps extends VariantProps<typeof toggleVariants> {
	checked: boolean;
	onChange: () => void;
	label: string;
}

export function Toggle({ checked, onChange, label, size }: ToggleProps) {
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
	);
}
