import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { Map, Search } from 'lucide-react'; // Search icon is used as the magnifying glass

const iconMap = {
  map: Map,
  search: Search, // "search" corresponds to the magnifying glass icon
};

export function EmptyScreen({
  submitMessage,
  className,
}: {
  submitMessage: (message: string) => void;
  className?: string;
}) {
  const [prompts, setPrompts] = useState([]);

  useEffect(() => {
    const fetchPrompts = async () => {
      try {
        const response = await fetch('/api/prompts');
        const data = await response.json();
        const randomPrompts = data.sort(() => 0.5 - Math.random()).slice(0, 4);
        setPrompts(randomPrompts);
      } catch (error) {
        console.error('Failed to fetch prompts:', error);
      }
    };

    fetchPrompts();
  }, []);

  return (
    <div className={`mx-auto w-full transition-all ${className}`}>
      <div className="bg-background p-2">
        <div className="mt-4 flex flex-col items-start space-y-2 mb-4">
          {prompts.map((item) => {
            const Icon = iconMap[item.icon];
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
