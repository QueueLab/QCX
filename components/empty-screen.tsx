import { Button } from '@/components/ui/button';
import { TreePine, Sun ,Rocket, Moon} from 'lucide-react';

// const exampleMessages = [
//   {
//     heading: 'What are the best nature parks here?',
//     message: 'What are the best nature parks here?',
//     icon: TreePine
//   },
//   {
//     heading: 'Plan me a trip in the tropics',
//     message: 'Plan me a trip in the tropics',
//     icon: Sun
//   },
//   {
//     heading: 'When is the next lunar eclipse?',
//     message: 'When is the next lunar eclipse?',
//     icon: Moon,
//   },
//   {
//     heading: 'How far is Mars?',
//     message: 'How far is Mars?',
//     icon: Rocket,
//   },
// ];

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
          {/* {exampleMessages.map((item) => {
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
          })} */}
        </div>
      </div>
    </div>
  );
}
