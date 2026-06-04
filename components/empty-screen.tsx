import { Button } from '@/components/ui/button';
import { Globe, Thermometer, Laptop, HelpCircle } from 'lucide-react';

const exampleMessages = [];

export function EmptyScreen({
  submitMessage,
  className,
}: {
  submitMessage: (message: string) => void;
  className?: string;
}) {
  return (
    <div className={`mx-auto w-full transition-all ${className}`}>
      <div className="bg-background p-2">
        <div className="mt-4 flex flex-col items-start space-y-2 mb-4">
          {exampleMessages.map((item) => {
            const Icon = item.icon;
            return (
              <Button
                key={item.message} // Use a unique property as the key.
                variant="link"
                className="h-auto p-0 text-base flex items-center"
                name={item.message}
                onClick={async () => {
                  submitMessage(item.message);
                }}
              >
                <Icon size={16} className="mr-2 text-muted-foreground" />
                {item.heading}
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
