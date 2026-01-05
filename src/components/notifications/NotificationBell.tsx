import { useState } from 'react';
import { Bell } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NotificationBellProps {
  className?: string;
  count?: number;
}

export const NotificationBell = ({ className, count = 0 }: NotificationBellProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <button
      onClick={() => setIsOpen(!isOpen)}
      className={cn(
        'relative p-2 hover:bg-muted rounded-lg transition-colors',
        className
      )}
    >
      <Bell className="w-6 h-6" />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs font-bold rounded-full flex items-center justify-center">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </button>
  );
};
