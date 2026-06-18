// Reads the hosted status.json on startup (SPEC §11). It lives on GitHub raw, so it can be
// changed without rebuilding the app: bump `latestVersion` to surface an update banner, or
// set `notice` to broadcast a message. Fails silently when offline / not yet published.

import { useEffect, useState } from "react";
import { config } from "@/config";
import { isNewer } from "@/lib/version";

interface RemoteStatus {
  latestVersion?: string;
  downloadUrl?: string;
  notice?: string | null;
}

export interface UpdateInfo {
  updateAvailable: boolean;
  latestVersion: string | null;
  downloadUrl: string;
  notice: string | null;
}

const INITIAL: UpdateInfo = {
  updateAvailable: false,
  latestVersion: null,
  downloadUrl: config.releasesUrl,
  notice: null,
};

export function useUpdateCheck(): UpdateInfo {
  const [info, setInfo] = useState<UpdateInfo>(INITIAL);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(config.statusRemoteUrl, { cache: "no-store" });
        if (!res.ok) return;
        const s = (await res.json()) as RemoteStatus;
        if (cancelled) return;
        setInfo({
          updateAvailable: !!s.latestVersion && isNewer(s.latestVersion, config.appVersion),
          latestVersion: s.latestVersion ?? null,
          downloadUrl: s.downloadUrl || config.releasesUrl,
          notice: s.notice ?? null,
        });
      } catch {
        /* offline or status.json not published — skip the check */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return info;
}
