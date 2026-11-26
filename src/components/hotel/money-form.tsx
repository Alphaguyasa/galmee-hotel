"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { hotelErrorKey } from "@/lib/hotel-errors";
import { getOffline } from "@/lib/offline";
import { moneyRpcArgs, type QueueableRpc } from "@/lib/offline-money";

type Note = { kind: "error"; key: string } | { kind: "done" } | { kind: "queued" } | null;

/**
 * Payment or extra-charge form on the stay page. Sends straight to the server when the
 * network is there; otherwise the entry waits on this phone (same client_ref, so it is
 * never recorded twice) and the sync chip sends it when the network is back.
 */
export function MoneyForm({
  rpc,
  submitLabel,
  doneLabel,
  children,
}: {
  rpc: QueueableRpc;
  submitLabel: string;
  doneLabel: string;
  children: React.ReactNode;
}) {
  const t = useTranslations("errors");
  const tSync = useTranslations("sync");
  const router = useRouter();
  const [note, setNote] = useState<Note>(null);
  const [clientRef, setClientRef] = useState(() => crypto.randomUUID());
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const args = moneyRpcArgs(rpc, { ...Object.fromEntries(new FormData(form)), clientRef });
    if (!args) return setNote({ kind: "error", key: "form" });
    startTransition(async () => {
      try {
        const res = await getOffline().engine.callOrQueue(rpc, args);
        if (res.status === "rejected") return setNote({ kind: "error", key: hotelErrorKey(res.error.message) });
        setClientRef(crypto.randomUUID());
        form.reset();
        if (res.status === "queued") return setNote({ kind: "queued" });
        setNote({ kind: "done" });
        router.refresh();
      } catch {
        setNote({ kind: "error", key: "generic" });
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3">
      {children}
      {note?.kind === "error" ? (
        <p role="alert" className="text-sm text-destructive">
          {t(note.key)}
        </p>
      ) : null}
      {note?.kind === "done" || note?.kind === "queued" ? (
        <p role="status" className="text-sm text-muted-foreground">
          {note.kind === "done" ? doneLabel : tSync("queued")}
        </p>
      ) : null}
      <Button type="submit" size="lg" variant="outline" disabled={pending} aria-busy={pending}>
        {submitLabel}
      </Button>
    </form>
  );
}
