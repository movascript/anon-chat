export function formatLastSeen(date?: Date): string {
	if (!date) return "a long time ago";
	const diff = Date.now() - date.getTime();
	const mins = Math.floor(diff / 60000);
	if (mins < 1) return "just now";
	if (mins < 60) return `${mins} minutes ago`;
	const hrs = Math.floor(mins / 60);
	if (hrs < 24) return `${hrs} hours ago`;
	return date.toLocaleDateString([], {
		weekday: "long",
		month: "long",
		day: "numeric",
	});
}

export function isSameDay(a: Date, b: Date): boolean {
	return a.toDateString() === b.toDateString();
}

export function formatDateSeparator(date: Date): string {
	const now = new Date();
	if (isSameDay(date, now)) return "Today";
	const yesterday = new Date(now);
	yesterday.setDate(yesterday.getDate() - 1);
	if (isSameDay(date, yesterday)) return "Yesterday";
	return date.toLocaleDateString([], {
		weekday: "long",
		month: "long",
		day: "numeric",
	});
}
