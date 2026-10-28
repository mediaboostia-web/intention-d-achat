'use client';

// /app/exporter: what to export, its filters, a preview, then the Excel
// file or the numbers for a follow-up (lot 6b). The address holds the query.
import { Suspense } from 'react';
import { ExportScreen } from '@/components/app/ExportView';

export default function ExportPage() {
  return (
    <Suspense fallback={null}>
      <ExportScreen />
    </Suspense>
  );
}
