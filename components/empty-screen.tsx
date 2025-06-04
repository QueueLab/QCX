import { Button } from '@/components/ui/button';
import { TreePine, Sun, Rocket, Moon, Info } from 'lucide-react'; // Added Info

const exampleMessages = [
  {
    heading: 'What are the best nature parks here?',
    message: 'What are the best nature parks here?',
    icon: TreePine
  },
  {
    heading: 'Plan me a trip in the tropics',
    message: 'Plan me a trip in the tropics',
    icon: Sun
  },
  {
    heading: 'When is the next lunar eclipse?',
    message: 'When is the next lunar eclipse?',
    icon: Moon,
  },
  {
    heading: 'How far is Mars?',
    message: 'How far is Mars?',
    icon: Rocket,
  },
];

interface EmptyScreenProps {
  submitMessage: (message: string) => void;
  className?: string;
  isEmptyHistory?: boolean; // New prop
}

export function EmptyScreen({
  submitMessage,
  className,
  isEmptyHistory, // Destructure new prop
}: EmptyScreenProps) {
  return (
    <div className={`mx-auto w-full transition-all ${className}`}>
      <div className="bg-background p-2">
        {isEmptyHistory ? (
          <div className="mt-4 flex flex-col items-center justify-center text-center space-y-2 mb-4 p-4">
            <Info size={24} className="text-muted-foreground" />
            <p className="text-muted-foreground">
              No messages found in this conversation.
            </p>
          </div>
        ) : (
          <div className="mt-4 flex flex-col items-start space-y-2 mb-4">
            {exampleMessages.map((item) => {
              const Icon = item.icon;
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
                  <Icon size={16} className="mr-2 text-muted-foreground" />
                  {item.heading}
                </Button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
