"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, RotateCcw, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { compressIdPhoto, ID_PHOTO_BUCKET, idPhotoPath, randomSuffix } from "@/lib/id-photo";
import { createClient } from "@/lib/supabase/client";

type State = { kind: "empty" } | { kind: "working" } | { kind: "saved"; path: string; preview: string } | { kind: "error"; message: string };

/**
 * Optional ID photo on the check-in sheet. The photo is shrunk on the phone, uploaded to the
 * hotel's private folder, and its path goes into the form as `photoPath`. Reception can take
 * and retake it here; only owners and managers can open stored photos later.
 */
export function IdPhotoField({ tenant, stay }: { tenant: string; stay: string }) {
  const t = useTranslations("stay");
  const input = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<State>({ kind: "empty" });

  const preview = state.kind === "saved" ? state.preview : null;
  useEffect(() => () => (preview ? URL.revokeObjectURL(preview) : undefined), [preview]);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setState({ kind: "working" });
    try {
      const jpeg = await compressIdPhoto(file);
      if (!jpeg) return setState({ kind: "error", message: t("photoTooBig") });
      const path = idPhotoPath(tenant, stay, randomSuffix());
      const { error } = await createClient().storage.from(ID_PHOTO_BUCKET).upload(path, jpeg, {
        contentType: "image/jpeg",
        upsert: false,
      });
      if (error) return setState({ kind: "error", message: t("photoFailed") });
      setState({ kind: "saved", path, preview: URL.createObjectURL(jpeg) });
    } catch {
      setState({ kind: "error", message: t("photoFailed") });
    } finally {
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="grid gap-2">
      <span className="text-sm font-medium" id="idPhotoLabel">
        {t("photo")}
      </span>
      <p className="text-sm text-muted-foreground">{t("photoHint")}</p>
      <input
        ref={input}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => onFile(e.target.files?.[0])}
      />
      <input type="hidden" name="photoPath" value={state.kind === "saved" ? state.path : ""} />
      {state.kind === "saved" ? (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview, not a remote image */}
          <img src={state.preview} alt={t("photoTaken")} className="h-20 w-28 rounded-md border border-border object-cover" />
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" className="bg-card" onClick={() => input.current?.click()}>
              <RotateCcw aria-hidden="true" />
              {t("photoRetake")}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setState({ kind: "empty" })}>
              <X aria-hidden="true" />
              {t("photoRemove")}
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="bg-card sm:justify-self-start"
          aria-describedby="idPhotoLabel"
          disabled={state.kind === "working"}
          onClick={() => input.current?.click()}
        >
          <Camera aria-hidden="true" />
          {state.kind === "working" ? t("photoSaving") : t("photoTake")}
        </Button>
      )}
      <p className="text-sm text-destructive" aria-live="polite">
        {state.kind === "error" ? state.message : ""}
      </p>
    </div>
  );
}
