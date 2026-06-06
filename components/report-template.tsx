import React from 'react'
import { AIMessage } from '@/lib/types'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export interface ReportTemplateProps {
  messages: AIMessage[]
  drawnFeatures?: Array<{
    id: string
    type: 'Polygon' | 'LineString'
    measurement: string
    geometry: any
  }>
  mapSnapshot?: string
  chatTitle: string
}

/**
 * Normalises a message's content field to a plain string.
 * The AI SDK can return content as a string or as an array of content-part
 * objects like { type: 'text', text: '...' } | { type: 'image', ... }.
 * Passing an object directly to React causes the "Objects are not valid as a
 * React child" error, so we always extract the text before rendering.
 */
function getContentString(content: unknown): string {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .map((part: any) => {
        if (typeof part === 'string') return part
        if (part && typeof part === 'object' && part.type === 'text') return part.text ?? ''
        return ''
      })
      .join(' ')
  }
  return ''
}

export const ReportTemplate: React.FC<ReportTemplateProps> = ({
  messages,
  drawnFeatures,
  mapSnapshot,
  chatTitle
}) => {
  const filteredMessages = messages.filter(m =>
    m.type === 'input' ||
    m.type === 'input_related' ||
    m.type === 'response' ||
    m.type === 'resolution_search_result'
  )

  return (
    <div id="report-template" className="p-8 bg-white text-black font-sans max-w-4xl mx-auto border border-gray-200">
      <header className="mb-8 border-b-2 border-primary pb-4">
        <h1 className="text-3xl font-bold text-primary mb-2">{chatTitle}</h1>
        <p className="text-gray-600">Generated on: {new Date().toLocaleString()}</p>
      </header>

      {mapSnapshot && (
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4 border-l-4 border-primary pl-2">Live Map View</h2>
          <div className="border rounded-lg overflow-hidden shadow-sm">
            <img src={mapSnapshot} alt="Map Snapshot" className="w-full h-auto" />
          </div>
        </section>
      )}

      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-6 border-l-4 border-primary pl-2">Conversation History</h2>
        <div className="space-y-8">
          {filteredMessages.map((message, index) => {
            if (message.type === 'input' || message.type === 'input_related') {
              const rawContent = getContentString(message.content)
              let content = rawContent
              try {
                const json = JSON.parse(rawContent)
                content = message.type === 'input'
                  ? (json.input ?? rawContent)
                  : (json.related_query ?? rawContent)
              } catch (e) {
                // rawContent is already a plain string
              }
              return (
                <div key={index} className="bg-gray-50 p-4 rounded-lg border-l-4 border-blue-500">
                  <p className="text-sm font-bold text-blue-600 mb-1">User Question</p>
                  <p className="text-gray-800 italic">{content}</p>
                </div>
              )
            } else if (message.type === 'response') {
              const rawContent = getContentString(message.content)
              return (
                <div key={index} className="prose prose-sm max-w-none">
                  <p className="text-sm font-bold text-green-600 mb-1">AI Response</p>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {rawContent}
                  </ReactMarkdown>
                </div>
              )
            } else if (message.type === 'resolution_search_result') {
              const rawContent = getContentString(message.content)
              try {
                const result = JSON.parse(rawContent)
                return (
                  <div key={index} className="space-y-4">
                    <p className="text-sm font-bold text-purple-600 mb-1">Analysis Result</p>
                    {result.summary && (
                      <div className="bg-purple-50 p-4 rounded-lg text-gray-800">
                        {result.summary}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      {result.mapboxImage && (
                        <div className="space-y-1">
                          <p className="text-xs text-gray-500">Mapbox View</p>
                          <img src={result.mapboxImage} alt="Mapbox View" className="rounded border w-full" />
                        </div>
                      )}
                      {result.googleImage && (
                        <div className="space-y-1">
                          <p className="text-xs text-gray-500">Google Satellite</p>
                          <img src={result.googleImage} alt="Google Satellite" className="rounded border w-full" />
                        </div>
                      )}
                    </div>
                  </div>
                )
              } catch (e) {
                // If content is not JSON, show it as plain text
                if (rawContent) {
                  return (
                    <div key={index} className="bg-purple-50 p-4 rounded-lg text-gray-800">
                      <p className="text-sm font-bold text-purple-600 mb-1">Analysis Result</p>
                      <p>{rawContent}</p>
                    </div>
                  )
                }
                return null
              }
            }
            return null
          })}
        </div>
      </section>

      {drawnFeatures && drawnFeatures.length > 0 && (
        <section className="mt-10 border-t-2 border-gray-100 pt-6">
          <h2 className="text-xl font-semibold mb-4 border-l-4 border-orange-500 pl-2">Appendix: Drawn Features & Measurements</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Measurement</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Geometry</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {drawnFeatures.map((feature) => (
                  <tr key={feature.id}>
                    <td className="px-4 py-2 whitespace-nowrap text-gray-900">{feature.type}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-gray-900">{feature.measurement}</td>

                      {JSON.stringify(feature.geometry.coordinates).substring(0, 100)}...
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <footer className="mt-12 text-center text-gray-400 text-xs border-t pt-4">
        <p>© {new Date().getFullYear()} QCX - Planet Computer Analysis Report</p>
      </footer>
    </div>
  )
}
