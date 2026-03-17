"use client";

import { useEffect, useState } from "react";
import { X, Download, Share } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "meshek-pwa-install-dismissed";

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream;
}

function isInStandaloneMode(): boolean {
  if (typeof window === "undefined") return false;
  // iOS standalone check
  if ((navigator as unknown as { standalone?: boolean }).standalone === true) return true;
  // Android/Chrome standalone check
  return window.matchMedia("(display-mode: standalone)").matches;
}

export function InstallPrompt() {
  const [androidInstallEvent, setAndroidInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (localStorage.getItem(DISMISS_KEY)) return;
    if (isInStandaloneMode()) return;

    if (isIOS()) {
      // On iOS, show manual install instructions
      setShowIOSPrompt(true);
      setDismissed(false);
      return;
    }

    // Android: wait for beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      setAndroidInstallEvent(e as BeforeInstallPromptEvent);
      setDismissed(false);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleAndroidInstall = async () => {
    if (!androidInstallEvent) return;
    await androidInstallEvent.prompt();
    const { outcome } = await androidInstallEvent.userChoice;
    if (outcome === "accepted") localStorage.setItem(DISMISS_KEY, "true");
    setDismissed(true);
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, "true");
    setDismissed(true);
  };

  if (dismissed) return null;
  if (!showIOSPrompt && !androidInstallEvent) return null;

  // iOS prompt: manual instructions
  if (showIOSPrompt) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 rounded-xl border bg-card p-4 shadow-lg md:left-auto md:right-6 md:w-80">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Share className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">התקן את האפליקציה</p>
            <p className="text-xs text-muted-foreground mt-1">
              לחץ על{" "}
              <span className="inline-flex items-center gap-0.5 font-medium">
                <Share className="h-3 w-3" /> שתף
              </span>{" "}
              ואז &ldquo;הוסף למסך הבית&rdquo;
            </p>
          </div>
          <Button size="sm" variant="ghost" onClick={handleDismiss} className="shrink-0 -mt-1">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  // Android prompt: native install
  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 flex items-center gap-3 rounded-xl border bg-card p-4 shadow-lg md:left-auto md:right-6 md:w-80">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <Download className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">התקן את האפליקציה</p>
        <p className="text-xs text-muted-foreground">הוסף למסך הבית לגישה מהירה</p>
      </div>
      <div className="flex gap-2 shrink-0">
        <Button size="sm" onClick={handleAndroidInstall}>התקן</Button>
        <Button size="sm" variant="ghost" onClick={handleDismiss}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
