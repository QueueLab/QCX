import { ChatMessages } from './chat-messages';
import { EmptyScreen } from './empty-screen';

export function ConditionalChatMessages({
  messages,
  showEmptyScreen,
  setInput,
}: {
  messages: any[];
  showEmptyScreen: boolean;
  setInput: (value: string) => void;
}) {
  if (showEmptyScreen) {
    return (
      <EmptyScreen
        submitMessage={(message) => {
          setInput(message);
        }}
      />
    );
  }

  return <ChatMessages messages={messages} />;
}