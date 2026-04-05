import { Search, X } from "lucide-react"

interface SearchInputProps {
	value: string
	onChange: (v: string) => void
	placeholder?: string
}

export function SearchInput({ value, onChange, placeholder = "Search…" }: SearchInputProps) {
	return (
		<div className="relative flex items-center">
			<Search className="pointer-events-none absolute left-3 h-4 w-4 text-muted" />
			<input
				type="text"
				value={value}
				onChange={e => onChange(e.target.value)}
				placeholder={placeholder}
				className="w-full rounded-xl border border-transparent bg-input-bg py-2 pr-8 pl-9 text-primary-foreground text-sm transition-[border-color] duration-200 placeholder:text-muted focus:border-accent focus:outline-none"
			/>
			{value && (
				<button
					type="button"
					onClick={() => onChange("")}
					className="absolute right-2 rounded-full p-1"
				>
					<X className="h-3 w-3 text-muted" />
				</button>
			)}
		</div>
	)
}
