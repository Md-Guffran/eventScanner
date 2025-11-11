import { Card } from '@/components/ui/card';
import { Check, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CheckInCardProps {
  icon: string;
  title: string;
  status: 'pending' | 'completed' | 'locked';
  count?: number;
  isActive?: boolean;
}

export const CheckInCard = ({ icon, title, status, count, isActive }: CheckInCardProps) => {
  return (
    <Card
      className={cn(
        'p-6 transition-all duration-300',
        isActive && 'border-primary border-2 glow-primary scale-105',
        status === 'completed' && 'border-success border-2 glow-success',
        status === 'locked' && 'opacity-50'
      )}
    >
      <div className="flex items-center gap-4">
        <div
          className={cn(
            'text-4xl flex items-center justify-center w-16 h-16 rounded-full',
            status === 'completed' && 'bg-success/20',
            isActive && 'bg-primary/20',
            status === 'locked' && 'bg-muted'
          )}
        >
          {status === 'completed' ? (
            <Check className="w-8 h-8 text-success" />
          ) : status === 'locked' ? (
            <Lock className="w-8 h-8 text-muted-foreground" />
          ) : (
            <span>{icon}</span>
          )}
        </div>

        <div className="flex-1">
          <h3 className="text-xl font-semibold mb-1">{title}</h3>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'text-sm font-medium',
                status === 'completed' && 'text-success',
                isActive && 'text-primary',
                status === 'locked' && 'text-muted-foreground'
              )}
            >
              {status === 'completed' ? '✓ Checked In' : status === 'locked' ? 'Locked' : 'Pending'}
            </span>
            {count !== undefined && (
              <span className="text-xs text-muted-foreground">
                • Total: {count}
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};