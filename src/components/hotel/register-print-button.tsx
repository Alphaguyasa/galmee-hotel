"use client";

import { useState, useTransition } from "react";
import { logRegisterPrintAction } from "@/actions/register";
import { Button } from "@/components/ui/button";

/** Logs the print (who printed which night), then opens the browser's print dialog. */
export function RegisterPrintButton({ day, label, errorLabel }: { day: string; label: string; errorLabel: string }) {
  const [pending, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);
  return (
    <div className="grid gap-1 print:hidden">
      <Button
        type="button"
        size="lg"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await logRegisterPrintAction(day);
            setFailed(Boolean(result.error));
            if (!result.error) window.print();
          })
        }
      >
        {label}
      </Button>
      {failed ? (
        <p role="alert" className="text-sm text-destructive">
          {errorLabel}
        </p>
      ) : null}
    </div>
  );
}
