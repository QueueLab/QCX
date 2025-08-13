import { Button } from '@/components/ui/button';
import { LucideIcon } from 'lucide-react'; // Import LucideIcon for typing

// Define the props interface for EmptyScreen
export interface EmptyScreenProps {
  submitMessage: (message: string) => void;
  className?: string;
  exampleMessages: Array<{
    heading: string;
    message: string;
    icon?: LucideIcon; // Icon is optional and of type LucideIcon
  }>;
}

export function EmptyScreen({
  submitMessage,
  className,
  exampleMessages, // Destructure exampleMessages from props
}: EmptyScreenProps) {
  return (
    <div className={`mx-auto w-full transition-all ${className}`}>
      <div className="bg-background p-2">
        <div className="mt-4 flex flex-col items-start space-y-2 mb-4">
          {exampleMessages.map((item) => {
            const Icon = item.icon; // Icon can be undefined
            return (
              <Button
                key={item.message}
                variant="link"
                className="h-auto p-0 text-base flex items-center"
                name={item.message}
                onClick={async () => {
                  submitMessage(item.message);
                }}
              >
                {Icon && <Icon size={16} className="mr-2 text-muted-foreground" />}
                {item.heading}
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
