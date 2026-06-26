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
  strategicOutput?: string
}

export const ReportTemplate: React.FC<ReportTemplateProps> = ({
  messages,
  drawnFeatures,
  mapSnapshot,
  chatTitle,
  aiSummary,
  strategicOutput
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

  // Group messages by type
  const inquiries = messages.filter(m => m.type === 'input' || m.type === 'input_related')
  const sensorFusionResults = messages.filter(m => m.type === 'resolution_search_result')

  return (
    <div id="report-template" className="bg-white text-[#1a1a1a] font-sans max-w-[800px] mx-auto">
      {/* Cover Page */}
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
              SENSITIVE COMPARTMENTED INFORMATION
            </div>
            <h1 className="text-7xl font-black text-[#003366] leading-[0.95] tracking-tight uppercase break-words">
              {chatTitle}
            </h1>
            <div className="w-32 h-2 bg-emerald-500"></div>
          </div>
        </div>

        <div className="space-y-12 pb-10 border-l-4 border-slate-200 pl-12">
          <div className="grid grid-cols-2 gap-16">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Analysis Date</p>
              <p className="text-xl font-bold text-[#003366]">
                {new Date().toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Clearance Level</p>
              <p className="text-xl font-bold text-[#003366]">TOP SECRET / PLANET COMPUTER</p>
            </div>
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Subject Area</p>
            <p className="text-xl font-bold text-[#003366]">Autonomous Geospatial Intelligence Synthesis</p>
          </div>
        </div>
      </section>

      {/* Content Pages */}
      <div className="p-16 space-y-24">
        {aiSummary && (
          <section className="break-inside-avoid">
            <div className="flex items-baseline gap-4 mb-8 border-b border-slate-100 pb-4">
              <span className="text-4xl font-black text-slate-200">00</span>
              <h2 className="text-2xl font-black text-[#003366] uppercase tracking-tight">Executive Summary</h2>
            </div>
            <div className="bg-slate-50 p-10 rounded-2xl border-l-8 border-indigo-600 shadow-sm">
              <p className="text-slate-700 leading-relaxed font-medium italic text-lg">
                "{aiSummary}"
              </p>
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
            {/* 1. Primary Inquiries */}
            {inquiries.map((message, index) => {
              const contentString = renderMessageContent(message.content)
              let content = ''
              try {
                const json = JSON.parse(contentString)
                content = message.type === 'input' ? (json.input || contentString) : (json.related_query || contentString)
              } catch (e) {
                content = contentString
              }
              return (
                <div key={`inquiry-${index}`} className="bg-[#003366] p-10 rounded-2xl shadow-xl break-inside-avoid relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4">
                    <svg className="w-8 h-8 text-white opacity-10" fill="currentColor" viewBox="0 0 24 24"><path d="M14.017 21L14.017 18C14.017 16.8954 14.9124 16 16.017 16H19.017C19.5693 16 20.017 15.5523 20.017 15V9C20.017 8.44772 19.5693 8 19.017 8H16.017C14.9124 8 14.017 7.10457 14.017 6V3L14.017 3C14.017 2.44772 14.4647 2 15.017 2H21.017C21.5693 2 22.017 2.44772 22.017 3V15C22.017 18.3137 19.3307 21 16.017 21H14.017ZM3.017 21L3.017 18C3.017 16.8954 3.91243 16 5.017 16H8.017C8.56928 16 9.017 15.5523 9.017 15V9C9.017 8.44772 8.56928 8 8.017 8H5.017C3.91243 8 3.017 7.10457 3.017 6V3L3.017 3C3.017 2.44772 3.46472 2 4.017 2H10.017C10.5693 2 11.017 2.44772 11.017 3V15C11.017 18.3137 8.33072 21 5.017 21H3.017Z" /></svg>
                  </div>
                  <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-4">Primary Inquiry</p>
                  <p className="text-2xl text-white font-bold leading-tight tracking-tight italic">
                    {content}
                  </p>
                </div>
              )
            })}

            {/* 2. Sensor Fusion (Always before Strategic Output) */}
            {sensorFusionResults.map((message, index) => {
              const contentString = renderMessageContent(message.content)
              try {
                const result = JSON.parse(contentString)
                return (
                  <div key={`sensor-${index}`} className="space-y-8 bg-slate-50 p-12 rounded-3xl border border-slate-100 break-inside-avoid">
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
            })}

            {/* 3. Strategic Output (Synthesized narrative) */}
            {strategicOutput && (
              <div className="prose prose-slate prose-lg prose-p:my-1 max-w-none break-inside-avoid">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-1.5 h-6 bg-emerald-500"></div>
                  <p className="text-xs font-black text-emerald-700 uppercase tracking-[0.2em] m-0">Strategic Output</p>
                </div>
                <div className="text-slate-700 leading-relaxed font-medium">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>
                    {normalizeMarkdown(strategicOutput)}
                  </ReactMarkdown>
                </div>
              </div>
            )}
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
