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
  aiSummary?: string
}

export const ReportTemplate: React.FC<ReportTemplateProps> = ({
  messages,
  drawnFeatures,
  mapSnapshot,
  chatTitle,
  aiSummary
}) => {
  const normalizeMarkdown = (content: string): string => {
    return content
      .replace(/\n{3,}/g, '\n\n') // Collapse 3+ newlines to 2
      .trim()
  }

  const MarkdownComponents = {
    p: ({ children }: { children?: React.ReactNode }) => {
      if (!children || (typeof children === 'string' && !children.trim())) {
        return null
      }
      if (Array.isArray(children) && children.every(child => typeof child === 'string' && !child.trim())) {
        return null
      }
      return <p>{children}</p>
    }
  }

  const renderMessageContent = (content: any): string => {
    if (typeof content === 'string') {
      return content
    }
    if (Array.isArray(content)) {
      return content
        .map(part => {
          if (typeof part === 'string') return part
          if (part && typeof part === 'object' && part.type === 'text') return part.text
          return ''
        })
        .join('\n')
    }
    return ''
  }

  // Filter messages to reduce redundancy
  const rawFiltered = messages.filter(m =>
    m.type === 'input' ||
    m.type === 'input_related' ||
    m.type === 'response' ||
    m.type === 'resolution_search_result'
  )

  const filteredMessages = rawFiltered.filter((message, index) => {
    // If this is a response followed by a resolution search result,
    // and the response is relatively short (likely a transition/redundant summary), filter it out.
    if (message.type === "response" && index + 1 < rawFiltered.length) {
      const nextMessage = rawFiltered[index + 1]
      if (nextMessage.role === "assistant") {
        const content = renderMessageContent(message.content)

        // If next is resolution_search_result, check if its summary is redundant with this response
        if (nextMessage.type === "resolution_search_result") {
          try {
            const nextContentString = renderMessageContent(nextMessage.content)
            const nextResult = JSON.parse(nextContentString)
            if (nextResult.summary && (nextResult.summary.trim() === content.trim())) {
              return false
            }
          } catch (e) {
            // If parse fails, fall back to length check
          }
        }

        // Filter out short transition messages or duplicated high-level summaries
        if (content.length < 500) {
          return false
        }
      }
    }
    return true
  })

  return (
    <div id="report-template" className="bg-white text-[#1a1a1a] font-sans max-w-[800px] mx-auto">
      <section className="h-[1120px] flex flex-col justify-between p-20 border-b-[16px] border-[#003366] bg-slate-50 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#003366] opacity-[0.03] -mr-48 -mt-48 rounded-full"></div>
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-[#003366] opacity-[0.02] rounded-full"></div>

        <div>
          <div className="flex items-center gap-4 mb-16">
            <div className="bg-[#003366] p-2 rounded-lg">
              <img src="/images/logo.svg" alt="QCX Logo" className="w-10 h-10 brightness-0 invert" crossOrigin="anonymous" />
            </div>
            <span className="text-3xl font-black tracking-tighter text-[#003366]">QCX TERRA</span>
          </div>

          <div className="space-y-6 mt-32">
            <div className="inline-block px-3 py-1 bg-[#003366] text-white text-[10px] font-bold tracking-[0.2em] uppercase rounded-sm">
              Confidential Analysis
            </div>
            <h1 className="text-6xl font-black text-[#1a1a1a] leading-[1.1] tracking-tight">
              {chatTitle}
            </h1>
            <div className="w-24 h-2 bg-[#003366]"></div>
          </div>
        </div>

        <div className="mt-auto pt-12 flex justify-between items-end border-t border-slate-200">
          <div className="space-y-3">
            <p className="text-[10px] text-slate-400 uppercase font-black tracking-[0.15em]">Prepared By</p>
            <div>
              <p className="text-xl font-bold text-[#003366]">Planet Computer Intelligence</p>
              <p className="text-sm text-slate-500 font-medium italic">Geospatial Intelligence Division</p>
            </div>
          </div>
          <div className="text-right space-y-3">
            <p className="text-[10px] text-slate-400 uppercase font-black tracking-[0.15em]">Issue Date</p>
            <p className="text-xl font-bold text-[#1a1a1a]">{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
        </div>
      </section>

      {/* Main Content Container */}
      <div className="p-16 space-y-20">
        {aiSummary && (
          <section className="break-inside-avoid">
            <div className="flex items-baseline gap-4 mb-8 border-b border-slate-100 pb-4">
              <span className="text-4xl font-black text-slate-200">00</span>
              <h2 className="text-2xl font-black text-[#003366] uppercase tracking-tight">Intelligence Executive Summary</h2>
            </div>
            <div className="bg-slate-50 p-10 rounded-2xl border-l-8 border-[#003366] shadow-inner">
              <div className="prose prose-slate prose-lg prose-p:my-1 max-w-none text-slate-800 font-medium leading-relaxed">
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>
                  {normalizeMarkdown(aiSummary)}
                </ReactMarkdown>
              </div>
            </div>
          </section>
        )}

        {mapSnapshot && (
          <section className="break-inside-avoid">
            <div className="flex items-baseline gap-4 mb-8 border-b border-slate-100 pb-4">
              <span className="text-4xl font-black text-slate-200">01</span>
              <h2 className="text-2xl font-black text-[#003366] uppercase tracking-tight">Executive Visualization</h2>
            </div>
            <div data-pdf-nosplit className="border-[12px] border-slate-50 rounded-2xl overflow-hidden shadow-2xl">
              <img src={mapSnapshot} alt="Map Snapshot" className="w-full h-auto block" crossOrigin="anonymous" />
              <div className="bg-slate-50 px-6 py-4 text-xs text-slate-500 text-center font-bold tracking-wide border-t border-slate-100">
                ORBITAL PERSPECTIVE REF: {Math.random().toString(16).substring(2, 10).toUpperCase()}
              </div>
            </div>
          </section>
        )}

        <section>
          <div className="flex items-baseline gap-4 mb-12 border-b border-slate-100 pb-4">
            <span className="text-4xl font-black text-slate-200">02</span>
            <h2 className="text-2xl font-black text-[#003366] uppercase tracking-tight">Intelligence Assessment</h2>
          </div>
          <div className="space-y-16">
            {filteredMessages.map((message, index) => {
              const contentString = renderMessageContent(message.content)

              if (message.type === 'input' || message.type === 'input_related') {
                let content = ''
                try {
                  const json = JSON.parse(contentString)
                  content = message.type === 'input' ? (json.input || contentString) : (json.related_query || contentString)
                } catch (e) {
                  content = contentString
                }
                return (
                  <div key={index} className="bg-[#003366] p-10 rounded-2xl shadow-xl break-inside-avoid relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4">
                      <svg className="w-8 h-8 text-white opacity-10" fill="currentColor" viewBox="0 0 24 24"><path d="M14.017 21L14.017 18C14.017 16.8954 14.9124 16 16.017 16H19.017C19.5693 16 20.017 15.5523 20.017 15V9C20.017 8.44772 19.5693 8 19.017 8H16.017C14.9124 8 14.017 7.10457 14.017 6V3L14.017 3C14.017 2.44772 14.4647 2 15.017 2H21.017C21.5693 2 22.017 2.44772 22.017 3V15C22.017 18.3137 19.3307 21 16.017 21H14.017ZM3.017 21L3.017 18C3.017 16.8954 3.91243 16 5.017 16H8.017C8.56928 16 9.017 15.5523 9.017 15V9C9.017 8.44772 8.56928 8 8.017 8H5.017C3.91243 8 3.017 7.10457 3.017 6V3L3.017 3C3.017 2.44772 3.46472 2 4.017 2H10.017C10.5693 2 11.017 2.44772 11.017 3V15C11.017 18.3137 8.33072 21 5.017 21H3.017Z" /></svg>
                    </div>
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-4">Primary Inquiry</p>
                    <p className="text-2xl text-white font-bold leading-tight tracking-tight italic">
                      {content}
                    </p>
                  </div>
                )
              } else if (message.type === 'response') {
                return (
                  <div key={index} className="prose prose-slate prose-lg prose-p:my-1 max-w-none break-inside-avoid">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-1.5 h-6 bg-emerald-500"></div>
                      <p className="text-xs font-black text-emerald-700 uppercase tracking-[0.2em] m-0">Strategic Output</p>
                    </div>
                    <div className="text-slate-700 leading-relaxed font-medium">
                      <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>
                        {normalizeMarkdown(contentString)}
                      </ReactMarkdown>
                    </div>
                  </div>
                )
              } else if (message.type === 'resolution_search_result') {
                try {
                  const result = JSON.parse(contentString)
                  return (
                    <div key={index} className="space-y-8 bg-slate-50 p-12 rounded-3xl border border-slate-100 break-inside-avoid">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-black text-indigo-700 uppercase tracking-[0.2em]">Sensor Fusion Analysis</p>
                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[9px] font-bold rounded">LEVEL 4 DATA</span>
                      </div>
                      {result.summary && (
                        <div className="text-slate-800 text-lg font-bold leading-snug bg-white p-8 rounded-2xl border border-slate-100 shadow-sm">
                          <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>
                            {normalizeMarkdown(result.summary)}
                          </ReactMarkdown>
                        </div>
                      )}
                      <div className="flex flex-col items-center gap-12">
                        {result.mapboxImage && (
                          <div data-pdf-nosplit className="space-y-4 w-full max-w-2xl">
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Spectral RGB Analysis View</p>
                            </div>
                            <img src={result.mapboxImage} alt="Mapbox View" className="rounded-xl border-4 border-white shadow-xl w-full block mx-auto" crossOrigin="anonymous" />
                          </div>
                        )}
                        {result.googleImage && (
                          <div data-pdf-nosplit className="space-y-4 w-full max-w-2xl">
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">High-Resolution Panchromatic Satellite</p>
                            </div>
                            <img src={result.googleImage} alt="Google Satellite" className="rounded-xl border-4 border-white shadow-xl w-full block mx-auto" crossOrigin="anonymous" />
                          </div>
                        )}
                      </div>
                    </div>
                  )
                } catch (e) {
                  return null
                }
              }
              return null
            })}
          </div>
        </section>

        {drawnFeatures && drawnFeatures.length > 0 && (
          <section className="break-inside-avoid pt-12">
            <div className="flex items-baseline gap-4 mb-8 border-b border-slate-100 pb-4">
              <span className="text-4xl font-black text-slate-200">03</span>
              <h2 className="text-2xl font-black text-[#003366] uppercase tracking-tight">Quantitative Appendix</h2>
            </div>
            <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-xl">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-[#003366]">
                  <tr>
                    <th className="px-8 py-5 text-left font-black text-white uppercase tracking-[0.1em] text-[10px]">Feature Identity</th>
                    <th className="px-8 py-5 text-left font-black text-white uppercase tracking-[0.1em] text-[10px]">Computed Metric</th>
                    <th className="px-8 py-5 text-left font-black text-white uppercase tracking-[0.1em] text-[10px]">Spatial Hash</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {drawnFeatures.map((feature, fIdx) => (
                    <tr key={feature.id} className={fIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                      <td className="px-8 py-6 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200">
                          {feature.type}
                        </span>
                      </td>
                      <td className="px-8 py-6 whitespace-nowrap text-indigo-700 font-black text-sm">
                        {feature.measurement}
                      </td>
                      <td className="px-8 py-6 text-slate-400 font-mono text-[9px] leading-tight">
                        {JSON.stringify(feature.geometry.coordinates).substring(0, 60)}...
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>

      <footer className="mt-24 px-16 py-12 text-center border-t border-slate-100 bg-slate-50">
        <div className="flex justify-center gap-8 mb-6">
          <div className="text-[10px] font-black text-slate-300 tracking-[0.3em] uppercase">QCX TERRA</div>
          <div className="text-[10px] font-black text-slate-300 tracking-[0.3em] uppercase">PLANET COMPUTER</div>
          <div className="text-[10px] font-black text-slate-300 tracking-[0.3em] uppercase">CLASSIFIED</div>
        </div>
        <p className="text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-2">
          © {new Date().getFullYear()} ALL RIGHTS RESERVED • SUBJECT TO GOVERNMENT DATA POLICIES
        </p>
        <p className="max-w-md mx-auto text-[9px] text-slate-400 font-medium leading-relaxed italic">
          This intelligence report was autonomously generated by the Planet Computer system.
          Information contained herein is derived from orbital sensors and AI synthesis.
        </p>
      </footer>
    </div>
  )
}
