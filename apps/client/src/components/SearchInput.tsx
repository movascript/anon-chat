import { Search, X } from "lucide-react";

interface SearchInputProps {
	value: string;
	onChange: (v: string) => void;
	placeholder?: string;
}

export function SearchInput({
	value,
	onChange,
	placeholder = "Search…",
}: SearchInputProps) {
	return (
		<div className="relative flex items-center">
			<Search className="absolute left-3 w-4 h-4 text-muted pointer-events-none" />
			<input
				type="text"
				value={value}
				onChange={(e) => onChange(e.target.value)}
				placeholder={placeholder}
				className="w-full pl-9 pr-8 py-2 rounded-xl text-sm bg-input-bg text-primary-foreground placeholder:text-muted border border-transparent focus:outline-none focus:border-accent transition-all duration-200"
			/>
			{value && (
				<button
					type="button"
					onClick={() => onChange("")}
					className="absolute right-2 p-1 rounded-full hover:bg-tertiary transition-all duration-200"
				>
					<X className="w-3 h-3 text-muted" />
				</button>
			)}
		</div>
	);
}
