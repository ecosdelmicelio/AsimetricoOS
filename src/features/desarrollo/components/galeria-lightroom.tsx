'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react'

interface Props {
  fotos:          string[]
  initialIndex:   number
  onClose:        () => void
}

export function GaleriaLightroom({ fotos, initialIndex, onClose }: Props) {
  const [current, setCurrent] = useState(initialIndex)
  const [zoom, setZoom]       = useState(false)

  const prev = useCallback(() => setCurrent(i => (i - 1 + fotos.length) % fotos.length), [fotos.length])
  const next = useCallback(() => setCurrent(i => (i + 1) % fotos.length), [fotos.length])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape')      onClose()
      if (e.key === 'ArrowLeft')   prev()
      if (e.key === 'ArrowRight')  next()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, prev, next])

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 shrink-0">
        <span className="text-white/60 text-sm font-medium">
          {current + 1} / {fotos.length}
        </span>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setZoom(!zoom)}
            className="text-white/60 hover:text-white transition-colors"
            title="Toggle zoom"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Main image */}
      <div className="flex-1 flex items-center justify-center relative px-16 min-h-0">
        <button
          onClick={prev}
          className="absolute left-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={fotos[current]}
          alt={`Foto ${current + 1}`}
          className={`max-h-full max-w-full object-contain transition-transform duration-200 ${zoom ? 'scale-150 cursor-zoom-out' : 'cursor-zoom-in'}`}
          onClick={() => setZoom(!zoom)}
        />

        <button
          onClick={next}
          className="absolute right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      {/* Thumbnails */}
      {fotos.length > 1 && (
        <div className="flex items-center gap-2 px-6 py-4 overflow-x-auto no-scrollbar shrink-0">
          {fotos.map((url, idx) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={idx}
              src={url}
              alt={`thumb ${idx + 1}`}
              onClick={() => setCurrent(idx)}
              className={`h-12 w-12 object-cover rounded-lg cursor-pointer transition-all shrink-0 ${
                idx === current ? 'ring-2 ring-white opacity-100' : 'opacity-50 hover:opacity-80'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
