'use client'

import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { PartialInquiry } from '@/lib/schema/inquiry'
import { Input } from './ui/input'
import { Checkbox } from './ui/checkbox'
import { Button } from './ui/button'
import { Card } from './ui/card'
import { ArrowRight, Check, FastForward, Sparkles } from 'lucide-react'
import { useActions, useStreamableValue, useUIState } from 'ai/rsc'
import type { AI } from '@/app/actions'
import { cn } from '@/lib/utils'

export type CopilotProps = {
  inquiry: { value: PartialInquiry };
}

/**
 * OPTIMIZATION: Memoized Copilot component with reduced re-renders
 * Uses useMemo and useCallback to prevent unnecessary recalculations
 */
export const Copilot: React.FC<CopilotProps> = React.memo(({ inquiry }: CopilotProps) => {
  const { value } = inquiry;
  const [completed, setCompleted] = useState(false)
  const [query, setQuery] = useState('')
  const [skipped, setSkipped] = useState(false)
  const [data, error, pending] = useStreamableValue<PartialInquiry>()
  const [checkedOptions, setCheckedOptions] = useState<{
    [key: string]: boolean
  }>({})
  const [isButtonDisabled, setIsButtonDisabled] = useState(true)
  const [, setMessages] = useUIState<typeof AI>()
  const { submit } = useActions()

  // OPTIMIZATION: Memoize input change handler
  const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    setQuery(newValue)
    // Check button state based on new value
    const anyCheckboxChecked = Object.values(checkedOptions).some(checked => checked)
    setIsButtonDisabled(!(anyCheckboxChecked || newValue))
  }, [checkedOptions])

  // OPTIMIZATION: Memoize option change handler
  const handleOptionChange = useCallback((selectedOption: string) => {
    setCheckedOptions(prev => {
      const updated = {
        ...prev,
        [selectedOption]: !prev[selectedOption]
      }
      // Update button state
      const anyCheckboxChecked = Object.values(updated).some(checked => checked)
      setIsButtonDisabled(!(anyCheckboxChecked || query))
      return updated
    })
  }, [query])

  // OPTIMIZATION: Memoize updated query computation
  const updatedQuery = useMemo(() => {
    const selectedOptions = Object.entries(checkedOptions)
      .filter(([, checked]) => checked)
      .map(([option]) => option)
    return [...selectedOptions, query].filter(Boolean).join(', ')
  }, [checkedOptions, query])

  // OPTIMIZATION: Single effect to check button state on mount
  useEffect(() => {
    const anyCheckboxChecked = Object.values(checkedOptions).some(checked => checked)
    setIsButtonDisabled(!(anyCheckboxChecked || query))
  }, [checkedOptions, query])

  // OPTIMIZATION: Memoize form submission handler
  const onFormSubmit = useCallback(async (
    e: React.FormEvent<HTMLFormElement>,
    skip?: boolean
  ) => {
    e.preventDefault()
    setCompleted(true)
    setSkipped(skip || false)

    const formData = skip
      ? undefined
      : new FormData(e.target as HTMLFormElement)

    if (formData) {
      formData.set('input', updatedQuery)
      formData.delete('additional_query')
    }

    const response = await submit(formData, skip)
    setMessages(currentMessages => [...currentMessages, response])
  }, [updatedQuery, submit, setMessages])

  // OPTIMIZATION: Memoize skip handler
  const handleSkip = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    onFormSubmit(e as unknown as React.FormEvent<HTMLFormElement>, true)
  }, [onFormSubmit])

  // OPTIMIZATION: Memoize error card
  const errorCard = useMemo(() => {
    if (!error) return null;
    return (
      <Card className="p-4 w-full flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-4 h-4" />
          <h5 className="text-muted-foreground text-xs truncate">
            {`error: ${error}`}
          </h5>
        </div>
      </Card>
    )
  }, [error])

  // OPTIMIZATION: Memoize completed card
  const completedCard = useMemo(() => {
    if (!completed) return null;
    return (
      <Card className="p-3 md:p-4 w-full flex justify-between items-center">
        <div className="flex items-center space-x-2 flex-1 min-w-0">
          <h5 className="text-muted-foreground text-xs truncate">
            {updatedQuery}
          </h5>
        </div>
        <Check size={16} className="text-green-500 w-4 h-4" />
      </Card>
    )
  }, [completed, updatedQuery])

  // OPTIMIZATION: Memoize options list
  const optionsList = useMemo(() => {
    return value.options?.map((option, index) => (
      <div
        key={`option-${index}`}
        className="flex items-center space-x-1.5 mb-2"
      >
        <Checkbox
          id={option?.value}
          name={option?.value}
          onCheckedChange={() =>
            handleOptionChange(option?.label as string)
          }
        />
        <label
          className="text-sm whitespace-nowrap pr-4"
          htmlFor={option?.value}
        >
          {option?.label}
        </label>
      </div>
    ))
  }, [value.options, handleOptionChange])

  // Early returns for error, skipped, and completed states
  if (error) return errorCard;
  if (skipped) return null;
  if (completed) return completedCard;

  // Main form render
  return (
    <Card className="p-4 rounded-lg w-full mx-auto">
      <div className="mb-4">
        <p className="text-lg text-foreground text-semibold ml-2">
          {data?.question || value.question}
        </p>
      </div>
      <form onSubmit={onFormSubmit}>
        <div className="flex flex-wrap justify-start mb-4">
          {optionsList}
        </div>
        {(data?.allowsInput || value.allowsInput) && (
          <div className="mb-6 flex flex-col space-y-2 text-sm">
            <label className="text-muted-foreground" htmlFor="query">
              {data?.inputLabel || value.inputLabel}
            </label>
            <Input
              type="text"
              name="additional_query"
              className="w-full"
              id="query"
              placeholder={data?.inputPlaceholder || value.inputPlaceholder}
              value={query}
              onChange={handleInputChange}
            />
          </div>
        )}
        <div className="flex justify-end space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleSkip}
            disabled={pending}
          >
            <FastForward size={16} className="mr-1" />
            Skip
          </Button>
          <Button type="submit" disabled={isButtonDisabled || pending}>
            <ArrowRight size={16} className="mr-1" />
            Send
          </Button>
        </div>
      </form>
    </Card>
  )
}, (prevProps, nextProps) => {
  // Custom comparison: only re-render if inquiry value actually changed
  return JSON.stringify(prevProps.inquiry.value) === JSON.stringify(nextProps.inquiry.value)
})

Copilot.displayName = 'Copilot'
