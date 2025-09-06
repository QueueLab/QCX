'use client'

import { AIMessage } from '@/lib/types'
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from '@/components/ai-elements/reasoning';
import { Response } from '@/components/ai-elements/response';
import { BotMessage } from './message';
import { UserMessage } from './user-message';

interface ChatMessagesProps {
  messages: AIMessage[]
}

export function ChatMessages({ messages }: ChatMessagesProps) {
  if (!messages.length) {
    return null
  }

  return (
    <>
      {messages.map((message, index) => (
        <div key={index}>
          {message.role === 'user' && <UserMessage message={message.content} />}
          {message.role === 'assistant' && (
            // @ts-ignore
            <BotMessage content={message.content}>
              {message.parts?.map((part, i) => {
                switch (part.type) {
                  case 'text':
                    return (
                      <Response key={`${message.id}-${i}`}>
                        {part.text}
                      </Response>
                    );
                  case 'reasoning':
                    return (
                      <Reasoning
                        key={`${message.id}-${i}`}
                        className="w-full"
                        isStreaming={false}
                      >
                        <ReasoningTrigger />
                        <ReasoningContent>{part.text}</ReasoningContent>
                      </Reasoning>
                    );
                }
              })}
            </BotMessage>
          )}
        </div>
      ))}
    </>
  )
}
