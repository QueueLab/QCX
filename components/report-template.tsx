import React from 'react'
import { AIMessage } from '@/lib/types'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export interface ReportTemplateProps {
  messages: AIMessage[]
  drawnFeatures?: Array<{
    id: string
    type: 'Polygon' | 'LineString' | 'Point'
    measurement: string
    geometry: any
  }>
  mapSnapshot?: string
  chatTitle: string
}

const safeJsonParse = (str: string, fallback: any = {}) => {
  try {
    return JSON.parse(str)
  } catch (e) {
    return fallback
  }
}

const parseMessageContent = (content: any) => {
  if (typeof content === 'string') {
    return { text: content, images: [] }
  }

  if (Array.isArray(content)) {
    const text = content
      .filter(part => part.type === 'text')
      .map(part => part.text)
      .join('\n')

    const images = content
      .filter(part => part.type === 'image' || part.type === 'image_url')
      .map(part => part.image || part.image_url?.url || part.data)
      .filter(Boolean)

    return { text, images }
  }

  return { text: '', images: [] }
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
    m.type === 'followup' ||
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
            if (message.type === 'input' || message.type === 'input_related' || message.type === 'followup') {
              const { text: rawText, images } = parseMessageContent(message.content)
              let displayContent = rawText

              if (message.type === 'input' || message.type === 'input_related') {
                const json = safeJsonParse(rawText, null)
                if (json) {
                  displayContent = message.type === 'input' ? json.input : json.related_query
                }
              }

              const isFollowup = message.type === 'followup'

              return (
                <div key={index} className={`p-4 rounded-lg border-l-4 ${isFollowup ? 'bg-amber-50 border-amber-500' : 'bg-gray-50 border-blue-500'}`}>
                  <p className={`text-sm font-bold mb-1 ${isFollowup ? 'text-amber-600' : 'text-blue-600'}`}>
                    {isFollowup ? 'Follow-up Question' : 'User Question'}
                  </p>
                  <p className="text-gray-800 italic">{displayContent}</p>
                  {images.length > 0 && (
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      {images.map((img, i) => (
                        <img key={i} src={img} alt="Attachment" className="rounded border max-h-64 object-contain bg-white" />
                      ))}
                    </div>
                  )}
                </div>
              )
            } else if (message.type === 'response') {
              return (
                <div key={index} className="prose prose-sm max-w-none">
                  <p className="text-sm font-bold text-green-600 mb-1">AI Response</p>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {typeof message.content === 'string' ? message.content : parseMessageContent(message.content).text}
                  </ReactMarkdown>
                </div>
              )
            } else if (message.type === 'resolution_search_result') {
              const result = safeJsonParse(message.content as string, {})
              return (
                <div key={index} className="space-y-4 border-t pt-4">
                  <p className="text-sm font-bold text-purple-600 mb-1">Resolution Search Analysis</p>

                  {result.summary && (
                    <div className="bg-purple-50 p-4 rounded-lg text-gray-800 border border-purple-100">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{result.summary}</ReactMarkdown>
                    </div>
                  )}

                  {result.primaryImage && (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Primary Map View</p>
                      <img src={result.primaryImage} alt="Primary Map" className="rounded border w-full shadow-sm" />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    {result.mapboxImage && (
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Mapbox Satellite</p>
                        <img src={result.mapboxImage} alt="Mapbox View" className="rounded border w-full shadow-sm" />
                      </div>
                    )}
                    {result.googleImage && (
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Google Satellite</p>
                        <img src={result.googleImage} alt="Google Satellite" className="rounded border w-full shadow-sm" />
                      </div>
                    )}
                  </div>

                  {result.coordinates && (
                    <div className="bg-gray-50 p-3 rounded border text-xs font-mono">
                      <p className="font-bold text-gray-600 mb-1 uppercase tracking-tight">Extracted Coordinates</p>
                      <p className="text-blue-700">{typeof result.coordinates === 'string' ? result.coordinates : JSON.stringify(result.coordinates)}</p>
                    </div>
                  )}

                  {result.cogInfo && (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Cloud Optimized GeoTIFF (COG) Info</p>
                      <div className="text-xs bg-blue-50 p-3 rounded border border-blue-100 text-blue-900 italic">
                        {result.cogInfo}
                      </div>
                    </div>
                  )}

                  {result.newsContext && result.newsContext.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Recent News Context</p>
                      <ul className="space-y-1">
                        {result.newsContext.map((news: any, i: number) => (
                          <li key={i} className="text-xs border-l-2 border-gray-300 pl-2 py-1">
                            <span className="font-semibold">{news.title}</span>
                            {news.date && <span className="text-gray-400 ml-2">- {news.date}</span>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {result.geojsonFeatures && result.geojsonFeatures.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Detected GeoJSON Features</p>
                      <div className="flex flex-wrap gap-2">
                        {result.geojsonFeatures.map((feat: any, i: number) => (
                          <span key={i} className="px-2 py-1 bg-green-50 text-green-700 border border-green-200 rounded text-[10px] font-medium">
                            {feat.type || feat.geometry?.type || 'Feature'}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
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
                {drawnFeatures.map((feature, i) => (
                  <tr key={feature.id}>
                    <td className="px-4 py-2 whitespace-nowrap text-gray-900">{feature.type}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-gray-900">{feature.measurement}</td>
                    <td className="px-4 py-2 text-gray-500 break-all font-mono text-[10px]">
                      {JSON.stringify(feature.geometry?.coordinates || feature.geometry).substring(0, 100)}...
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
