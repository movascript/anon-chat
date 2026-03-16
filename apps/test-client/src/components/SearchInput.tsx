import { Search, X } from "lucide-react";

interface SearchInputProps {
	value: string;
	onChange: (v: string) => void;
	placeholder?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({
	value,
	onChange,
	placeholder = "Search…",
}) => (
	<div className="relative flex items-center">
		<Search className="absolute left-3 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
		<input
			type="text"
			value={value}
			onChange={(e) => onChange(e.target.value)}
			placeholder={placeholder}
			className="
        w-full pl-9 pr-8 py-2 rounded-xl text-sm
        bg-[var(--input-bg)] text-[var(--text-primary)]
        placeholder:text-[var(--text-muted)]
        border border-transparent
        focus:outline-none focus:border-[var(--accent)]
        transition-colors duration-150
      "
		/>
		{value && (
			<button
				type="button"
				onClick={() => onChange("")}
				className="absolute right-2 p-1 rounded-full hover:bg-[var(--bg-tertiary)] transition-colors"
			>
				<X className="w-3 h-3 text-[var(--text-muted)]" />
			</button>
		)}
	</div>
);
