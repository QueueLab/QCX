import { Globe, Thermometer, Laptop, HelpCircle } from 'lucide-react';

const exampleMessages = [
  {
    heading: 'What is a planet computer?',
    message: 'What is a planet computer?',
    icon: Globe
  },
  {
    heading: 'How does climate change affect our experience?',
    message: 'How does climate change affect our experience?',
    icon: Thermometer
  },
  {
    heading: 'What is QCX-Terra?',
    message: 'What is QCX-Terra?',
    icon: Laptop,
  },
  {
    heading: 'How do I use the computer?',
    message: 'How do I use the computer?',
    icon: HelpCircle,
  },
];

export function EmptyScreen({
  submitMessage,
  className,
}: {
  submitMessage: (message: string) => void;
  className?: string;
}) {
  return (
    <div className={`mx-auto w-full transition-all overflow-hidden ${className}`}>
      <div className="p-2">
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          {exampleMessages.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.message}
                onClick={async () => {
                  submitMessage(item.message);
                }}
                className="flex items-center gap-3 p-3 text-sm text-left border border-border bg-card hover:bg-accent/50 rounded-xl transition-all w-full text-foreground/80 hover:text-foreground font-medium shadow-sm"
              >
                <div className="p-2 bg-secondary rounded-lg text-muted-foreground flex-shrink-0">
                  <Icon size={16} />
                </div>
                <span className="line-clamp-2">{item.heading}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
