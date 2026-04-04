import type { FallbackProps } from "react-error-boundary"

// ! not an ideal ui, just for now

export default function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
	return (
		<div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-background p-6 text-center">
			<div className="flex flex-col items-center gap-2">
				<span className="text-5xl">⚠️</span>
				<h1 className="font-semibold text-foreground text-xl">Something went wrong</h1>
				<p className="max-w-sm text-muted-foreground text-sm">An unexpected error occurred.</p>
			</div>

			<div className="flex gap-3">
				<button
					type="button"
					onClick={resetErrorBoundary}
					className="rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground text-sm transition-opacity hover:opacity-90"
				>
					Try again
				</button>
				<button
					type="button"
					onClick={() => window.location.reload()}
					className="rounded-md border border-border px-4 py-2 font-medium text-foreground text-sm transition-colors hover:bg-muted"
				>
					Reload page
				</button>
			</div>
		</div>
	)
}
