const fs = require('fs');

const path = 'components/chat-panel.tsx';
let content = fs.readFileSync(path, 'utf8');

// We will add activeSuggestionRef to the component
content = content.replace(
  'const fileInputRef = useRef<HTMLInputElement>(null)',
  'const fileInputRef = useRef<HTMLInputElement>(null)\n  const activeSuggestionRef = useRef<string>(\'\')'
);

// We will update debouncedGetSuggestions
const oldDebounce = `  const debouncedGetSuggestions = useCallback(
    (value: string) => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }

      const wordCount = value.trim().split(/\\s+/).filter(Boolean).length
      if (wordCount < 2) {
        setSuggestions(null)
        return
      }

      debounceTimeoutRef.current = setTimeout(async () => {
        const suggestionsStream = await getSuggestions(value, mapData)
        for await (const partialSuggestions of readStreamableValue(
          suggestionsStream
        )) {
          if (partialSuggestions) {
            setSuggestions(partialSuggestions as PartialRelated)
          }
        }
      }, 500) // 500ms debounce delay
    },
    [mapData, setSuggestions]
  )`;

const newDebounce = `  const debouncedGetSuggestions = useCallback(
    (value: string) => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }

      const wordCount = value.trim().split(/\\s+/).filter(Boolean).length
      if (wordCount < 2) {
        setSuggestions(null)
        activeSuggestionRef.current = ''
        return
      }

      const currentQuery = value
      activeSuggestionRef.current = currentQuery

      debounceTimeoutRef.current = setTimeout(async () => {
        if (activeSuggestionRef.current !== currentQuery) return
        try {
          const suggestionsStream = await getSuggestions(value, mapData)
          for await (const partialSuggestions of readStreamableValue(
            suggestionsStream
          )) {
            if (activeSuggestionRef.current !== currentQuery) break
            if (partialSuggestions) {
              setSuggestions(partialSuggestions as PartialRelated)
            }
          }
        } catch (error) {
          console.error(error)
        }
      }, 500) // 500ms debounce delay
    },
    [mapData, setSuggestions]
  )`;

content = content.replace(oldDebounce, newDebounce);

const oldHandleSubmit = `  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!input.trim() && !selectedFile) {
      return
    }`;

const newHandleSubmit = `  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!input.trim() && !selectedFile) {
      return
    }

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }
    activeSuggestionRef.current = ''
    setSuggestions(null)`;

content = content.replace(oldHandleSubmit, newHandleSubmit);

const oldHandleClear = `  const handleClear = async () => {
    setMessages([])
    setSuggestions(null)`;

const newHandleClear = `  const handleClear = async () => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }
    activeSuggestionRef.current = ''
    setMessages([])
    setSuggestions(null)`;

content = content.replace(oldHandleClear, newHandleClear);

fs.writeFileSync(path, content);
console.log("Patched suggestions with active tracking");
