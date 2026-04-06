'use client'

import React from 'react'
import * as Tabs from '@radix-ui/react-tabs'
import { FileText, Factory, Truck, History } from 'lucide-react'

interface Props {
  detalleTab: React.ReactNode
  produccionTab: React.ReactNode
  despachosTab: React.ReactNode
  historialTab: React.ReactNode
}

export function OVTabs({ detalleTab, produccionTab, despachosTab, historialTab }: Props) {
  return (
    <Tabs.Root defaultValue="detalle" className="flex flex-col gap-6">
      <Tabs.List className="flex items-center gap-2 p-1.5 rounded-2xl bg-neu-base shadow-neu self-start">
        <TabTrigger value="detalle" icon={<FileText className="w-4 h-4" />} label="Detalles" />
        <TabTrigger value="produccion" icon={<Factory className="w-4 h-4" />} label="Producción" />
        <TabTrigger value="despachos" icon={<Truck className="w-4 h-4" />} label="Despachos" />
        <TabTrigger value="historial" icon={<History className="w-4 h-4" />} label="Historial" />
      </Tabs.List>

      <Tabs.Content value="detalle" className="focus:outline-none">
        {detalleTab}
      </Tabs.Content>
      
      <Tabs.Content value="produccion" className="focus:outline-none">
        {produccionTab}
      </Tabs.Content>
      
      <Tabs.Content value="despachos" className="focus:outline-none">
        {despachosTab}
      </Tabs.Content>
      
      <Tabs.Content value="historial" className="focus:outline-none">
        {historialTab}
      </Tabs.Content>
    </Tabs.Root>
  )
}

function TabTrigger({ value, icon, label }: { value: string; icon: React.ReactNode; label: string }) {
  return (
    <Tabs.Trigger
      value={value}
      className="
        flex items-center gap-2 px-4 py-2.5 rounded-xl text-body-sm font-semibold transition-all
        text-muted-foreground 
        data-[state=active]:bg-white data-[state=active]:text-primary-600 data-[state=active]:shadow-sm
        hover:text-foreground
        focus:outline-none
      "
    >
      {icon}
      <span>{label}</span>
    </Tabs.Trigger>
  )
}
