interface TypingIndicatorProps {
  isTyping: boolean;
}

export function TypingIndicator({ isTyping }: TypingIndicatorProps) {
  if (!isTyping) return null;

  return (
    <div className="px-4 py-2 bg-gray-50 border-t">
      <div className="flex items-center gap-2 text-gray-600">
        <div className="flex gap-1">
          <span className="animate-bounce" style={{ animationDelay: '0ms' }}>●</span>
          <span className="animate-bounce" style={{ animationDelay: '150ms' }}>●</span>
          <span className="animate-bounce" style={{ animationDelay: '300ms' }}>●</span>
        </div>
        <span className="text-sm">در حال نوشتن</span>
      </div>
    </div>
  );
}
