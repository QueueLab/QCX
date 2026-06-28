'use client'

import React, { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Zap, RefreshCw, LayoutPanelLeft, Minus } from 'lucide-react'
import { useUsageToggle } from './usage-toggle-context'
import { UsageSummary } from '@/lib/types'
import { Spinner } from '@/components/ui/spinner'

export function UsageView() {
  const [summary, setSummary] = useState<UsageSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const { toggleUsage } = useUsageToggle()

  useEffect(() => {
    async function fetchUsage() {
      try {
        const response = await fetch('/api/usage')
        if (response.ok) {
          const data = await response.json()
          setSummary(data)
        }
      } catch (error) {
        console.error('Failed to fetch usage:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchUsage()
  }, [])

  const totalCredits = 500
  const usedCredits = summary ? Math.ceil(summary.totalCost * 100) : 0 // Simplified credit model
  const availableCredits = Math.max(0, totalCredits - usedCredits)

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
              <span className="font-bold">{loading ? '...' : availableCredits}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground pl-6">
              <span>Used credits</span>
              <span>{loading ? '...' : usedCredits}</span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <RefreshCw size={16} className="text-muted-foreground" />
                <span>Yearly refresh credits</span>
              </div>
              <span className="font-bold">{totalCredits}</span>
            </div>
            <p className="text-[10px] text-muted-foreground pl-6">Refresh to {totalCredits} every year.</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src="/images/eva-logo.png" alt="EVA Logo" className="h-[1.2em] w-auto object-contain mix-blend-multiply dark:mix-blend-normal dark:brightness-125" />
              <span className="font-medium">Computer Usage</span>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Source</TableHead>
                  <TableHead className="text-xs">Date</TableHead>
                  <TableHead className="text-xs text-right">Cost (USD)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary?.recentEvents.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-xs font-medium">
                      <div className="flex flex-col">
                        <span>{item.source}</span>
                        <span className="text-[10px] text-muted-foreground uppercase">{item.kind}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-[10px] text-muted-foreground">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-xs text-right font-medium">
                      ${parseFloat(item.cost).toFixed(4)}
                    </TableCell>
                  </TableRow>
                ))}
                {(!summary || summary.recentEvents.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-4 text-muted-foreground italic">
                      No usage events recorded yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  )
}
