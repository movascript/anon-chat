import { useEffect, useState } from "react";

const useDebounce = <T>(value: T, delay: number): T => {
	const [debouncedValue, setDebouncedValue] = useState(value);

	useEffect(() => {
		// not the default behaviour for debounce but need in my scenario
		if (!value) return setDebouncedValue(value);

		const handler = setTimeout(() => setDebouncedValue(value), delay);

		return () => clearTimeout(handler);
	}, [value, delay]);

	return debouncedValue;
};

export default useDebounce;
