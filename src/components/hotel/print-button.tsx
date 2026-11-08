"use client";

import { Button } from "@/components/ui/button";

export function PrintButton({ label }: { label: string }) {
  return (
    <Button type="button" size="lg" className="print:hidden" onClick={() => window.print()}>
      {label}
    </Button>
  );
}
