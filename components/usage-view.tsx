'use client'

import React, { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Zap, RefreshCw, LayoutPanelLeft, Minus } from 'lucide-react'
import { useUsageToggle } from './usage-toggle-context'

export function UsageView() {
  const [usage] = useState([
    { details: 'Efficiently Fix Pull Request ...', date: '2026-01-17 08:05', change: -418 },
    { details: 'Fix Build and Add Parallel S...', date: '2026-01-16 06:10', change: -482 },
    { details: 'How to Add a Feature to a ...', date: '2026-01-14 10:42', change: -300 },
  ])
  const [credits] = useState(0)
  const { toggleUsage } = useUsageToggle()

  return (
    <div className="container py-8 h-full overflow-y-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Usage</h1>
          <p className="text-muted-foreground">Track your credits and usage history</p>
        </div>
        <Button variant="ghost" size="icon" onClick={toggleUsage}>
          <Minus className="h-6 w-6" />
          <span className="sr-only">Close usage</span>
        </Button>
      </div>

      <div className="space-y-6">
        <div className="p-4 border rounded-xl space-y-4">
          <div className="flex justify-between items-center">
            <span className="italic font-medium text-lg">Free</span>
            <Button size="sm" className="rounded-full px-4" onClick={() => window.open('https://buy.stripe.com/14A3cv7K72TR3go14Nasg02', '_blank')}>
              Upgrade
            </Button>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Zap size={16} className="text-muted-foreground" />
                <span>Credits</span>
              </div>
              <span className="font-bold">{credits}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground pl-6">
              <span>Free credits</span>
              <span>0</span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <RefreshCw size={16} className="text-muted-foreground" />
                <span>Daily refresh credits</span>
              </div>
              <span className="font-bold">300</span>
            </div>
            <p className="text-[10px] text-muted-foreground pl-6">Refresh to 300 at 00:00 every day</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <LayoutPanelLeft size={18} />
              <span className="font-medium">Computer Usage</span>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Details</TableHead>
                <TableHead className="text-xs">Date</TableHead>
                <TableHead className="text-xs text-right">Credits change</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usage.map((item, i) => (
                <TableRow key={i}>
                  <TableCell className="text-xs font-medium">{item.details}</TableCell>
                  <TableCell className="text-[10px] text-muted-foreground">{item.date}</TableCell>
                  <TableCell className="text-xs text-right font-medium">{item.change}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
