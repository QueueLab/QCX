'use client'

import { Mapbox } from '@/components/map/mapbox-map'
import SettingsPage from '@/components/settings/page' // Assuming SettingsPage is the default export

export default function DynamicSettingsPage({ params }: { params: { section: string } }) {
  // console.log('Rendering settings for section:', params.section); // For debugging
  return (
    <div className="flex flex-row h-screen"> {/* Or appropriate height */}
      <div className="w-1/2 p-4 overflow-y-auto"> {/* Settings content area */}
        {/* You can pass params.section to SettingsPage if it can use it */}
        {/* <h1>Settings Section: {params.section}</h1> */}
        <SettingsPage section={params.section} />
      </div>
      <div className="w-1/2 p-0"> {/* Map area, p-0 if Mapbox handles its own padding/margins */}
        <Mapbox />
      </div>
    </div>
  )
}
