// Top-of-app banners driven by the hosted status.json (SPEC §11): a broadcast "notice"
// and an "update available" prompt linking to the GitHub release. Both are dismissible
// (remembered per notice text / per version so they don't nag).

import { useState } from "react";
import { Download, Megaphone, X } from "lucide-react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { Button } from "@/components/ui/button";
import { useUpdateCheck } from "@/hooks/useUpdateCheck";
import { readCache, writeCache } from "@/lib/cache";

interface Dismissed {
  update?: string; // latestVersion that was dismissed
  notice?: string; // notice text that was dismissed
}

export function UpdateBanner() {
  const { updateAvailable, latestVersion, downloadUrl, notice } = useUpdateCheck();
  const [dismissed, setDismissed] = useState<Dismissed>(
    () => readCache<Dismissed>("dismissedBanners")?.data ?? {},
  );

  function dismiss(patch: Dismissed) {
    const next = { ...dismissed, ...patch };
    setDismissed(next);
    writeCache("dismissedBanners", next);
  }

  const showNotice = !!notice && dismissed.notice !== notice;
  const showUpdate = updateAvailable && !!latestVersion && dismissed.update !== latestVersion;
  if (!showNotice && !showUpdate) return null;

  return (
    <div>
      {showNotice && (
        <div className="flex items-center justify-between gap-3 border-b border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs text-amber-200">
          <span className="flex items-center gap-1.5">
            <Megaphone className="size-3.5 shrink-0" />
            {notice}
          </span>
          <button
            type="button"
            aria-label="Dismiss notice"
            className="text-amber-200/70 hover:text-amber-100"
            onClick={() => dismiss({ notice: notice ?? undefined })}
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {showUpdate && (
        <div className="flex items-center justify-between gap-3 border-b border-primary/30 bg-primary/15 px-4 py-1.5 text-xs">
          <span>
            <span className="font-semibold text-primary">Update available</span> — version{" "}
            {latestVersion} is out.
          </span>
          <div className="flex items-center gap-1">
            <Button size="xs" onClick={() => void openUrl(downloadUrl)}>
              <Download className="size-3.5" />
              Download
            </Button>
            <button
              type="button"
              aria-label="Dismiss"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => dismiss({ update: latestVersion ?? undefined })}
            >
              <X className="size-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
