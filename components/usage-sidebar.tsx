'use client';

import React, { useEffect, useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Zap, RefreshCw, LayoutPanelLeft, X } from 'lucide-react';

interface UsageSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UsageSidebar({ isOpen, onClose }: UsageSidebarProps) {
  const [usage, setUsage] = useState<any[]>([]);
  const [credits, setCredits] = useState(0);

  useEffect(() => {
    if (isOpen) {
      // Mock data for now as per the screenshot
      setUsage([
        { details: 'Efficiently Fix Pull Request ...', date: '2026-01-17 08:05', change: -418 },
        { details: 'Fix Build and Add Parallel S...', date: '2026-01-16 06:10', change: -482 },
        { details: 'How to Add a Feature to a ...', date: '2026-01-14 10:42', change: -300 },
      ]);
      setCredits(0);
    }
  }, [isOpen]);

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-[400px] p-0 overflow-y-auto rounded-tl-xl rounded-bl-xl">
        <div className="p-6 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Usage</h2>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X size={20} />
            </Button>
          </div>

          <div className="p-4 border rounded-xl space-y-4">
            <div className="flex justify-between items-center">
              <span className="italic font-medium text-lg">Free</span>
              <Button size="sm" className="rounded-full px-4" onClick={() => window.open('https://buy.stripe.com/3cIaEX3tRcur9EM7tbasg00', '_blank')}>Upgrade</Button>
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
                <span className="font-medium">Website usage & billing</span>
              </div>
              <Button variant="ghost" size="icon" className="h-4 w-4">
                <span className="sr-only">View more</span>
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4"><path d="M6.1584 3.1356C6.35366 2.94034 6.67024 2.94034 6.8655 3.1356L10.8655 7.13561C11.0608 7.33087 11.0608 7.64745 10.8655 7.84271L6.8655 11.8427C6.67024 12.038 6.35366 12.038 6.1584 11.8427C5.96314 11.6474 5.96314 11.3309 6.1584 11.1356L9.80485 7.48916L6.1584 3.84271C5.96314 3.64745 5.96314 3.33087 6.1584 3.1356Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>
              </Button>
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
      </SheetContent>
    </Sheet>
  );
}
