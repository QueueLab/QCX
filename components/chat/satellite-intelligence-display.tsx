'use client'

import type { SatelliteIntelligence } from '@/lib/services/mock-satellite-services'

interface SatelliteIntelligenceDisplayProps {
  data: SatelliteIntelligence
}

/**
 * A React component to display the structured satellite intelligence data.
 */
export function SatelliteIntelligenceDisplay({
  data
}: SatelliteIntelligenceDisplayProps) {
  return (
    <div className="bg-zinc-800 text-white p-4 rounded-lg my-4 border border-zinc-700">
      <h3 className="font-bold text-lg mb-3 text-zinc-200">Satellite Intelligence Analysis</h3>
      <div className="mb-2">
        <strong className="text-zinc-400">Analysis:</strong>
        <p className="text-zinc-300 pl-2">{data.analysis}</p>
      </div>
      <div className="mb-2">
        <strong className="text-zinc-400">Confidence Score:</strong>
        <p className="text-zinc-300 pl-2">{data.confidenceScore.toFixed(2)}</p>
      </div>
      <div>
        <strong className="text-zinc-400">Detected Objects:</strong>
        <ul className="list-disc list-inside pl-2">
          {data.detectedObjects.map((obj, index) => (
            <li key={index} className="text-zinc-300">
              {obj}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
