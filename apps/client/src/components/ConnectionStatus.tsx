interface ConnectionStatusProps {
	isConnected: boolean;
	partnerOnline: boolean;
}

export function ConnectionStatus({
	isConnected,
	partnerOnline,
}: ConnectionStatusProps) {
	return (
		<div className="bg-white border-b px-4 py-3">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-3">
					<div className="text-2xl">👤</div>
					<div>
						<div className="font-semibold text-gray-800">کاربر ناشناس</div>
						<div className="flex items-center gap-2 text-sm">
							<div
								className={`w-2 h-2 rounded-full ${
									isConnected && partnerOnline ? "bg-green-500" : "bg-gray-400"
								}`}
							/>
							<span className="text-gray-600">
								{isConnected && partnerOnline ? "آنلاین" : "آفلاین"}
							</span>
						</div>
					</div>
				</div>

				<div className="flex items-center gap-2">
					<div className="text-xs text-gray-500 flex items-center gap-1">
						<span>🔐</span>
						<span>رمزنگاری شده</span>
					</div>
				</div>
			</div>
		</div>
	);
}
