'use client'

import { BodegaLocationsMaster } from '@/features/wms/components/bodega-locations-master'

export function WMSPanel() {
  return (
    <div className="flex flex-col h-full bg-neu-bg">
      <div className="flex-1 min-h-0 bg-white">
        <BodegaLocationsMaster />
      </div>
    </div>
  )
}
