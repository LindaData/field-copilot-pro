import { Capacitor, type PluginListenerHandle } from "@capacitor/core";
import { Clipboard } from "@capacitor/clipboard";
import { Geolocation } from "@capacitor/geolocation";
import { Network } from "@capacitor/network";
import { Share } from "@capacitor/share";

type PositionLike = {
  coords: {
    latitude: number;
    longitude: number;
  };
};

type WatchPositionErrorLike = {
  code?: number | string;
  message?: string;
};

type WatchPositionOptions = {
  enableHighAccuracy?: boolean;
  maximumAge?: number;
  timeout?: number;
};

const canUseDom = typeof window !== "undefined";

export function isNativeApp() {
  return Capacitor.isNativePlatform();
}

export async function copyText(text: string) {
  if (isNativeApp()) {
    await Clipboard.write({ string: text });
    return;
  }

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();
  document.execCommand("copy");
  document.body.removeChild(area);
}

export async function shareOrCopyUrl(input: { title: string; text?: string; url: string }) {
  if (isNativeApp()) {
    const canShare = await Share.canShare();
    if (canShare.value) {
      await Share.share({
        title: input.title,
        text: input.text,
        url: input.url,
        dialogTitle: input.title,
      });
      return "shared" as const;
    }
  }

  if (canUseDom && typeof navigator !== "undefined" && typeof navigator.share === "function") {
    await navigator.share({
      title: input.title,
      text: input.text,
      url: input.url,
    });
    return "shared" as const;
  }

  await copyText(input.url);
  return "copied" as const;
}

export function shareableCurrentUrl(publicBaseUrl = "https://lindadata.github.io/field-copilot-pro/") {
  if (canUseDom && window.location.protocol.startsWith("http")) {
    return window.location.href;
  }

  if (!canUseDom) return publicBaseUrl;
  const base = publicBaseUrl.replace(/\/$/, "");
  return `${base}${window.location.pathname}${window.location.search}${window.location.hash}`;
}

export async function subscribeNetworkStatus(onChange: (connected: boolean) => void) {
  if (isNativeApp()) {
    const status = await Network.getStatus();
    onChange(status.connected);
    const handle: PluginListenerHandle = await Network.addListener("networkStatusChange", (next) => {
      onChange(next.connected);
    });
    return () => {
      void handle.remove();
    };
  }

  if (!canUseDom) return () => {};
  const update = () => onChange(navigator.onLine);
  update();
  window.addEventListener("online", update);
  window.addEventListener("offline", update);
  return () => {
    window.removeEventListener("online", update);
    window.removeEventListener("offline", update);
  };
}

export function watchFieldPosition(
  onPosition: (position: PositionLike) => void,
  onError: (error: WatchPositionErrorLike) => void,
  options: WatchPositionOptions,
) {
  if (isNativeApp()) {
    let active = true;
    let watchId: string | undefined;

    void Geolocation.watchPosition(options, (position, error) => {
      if (!active) return;
      if (error) {
        onError(error);
        return;
      }
      if (position) onPosition(position);
    }).then((id) => {
      if (!active) {
        void Geolocation.clearWatch({ id });
        return;
      }
      watchId = id;
    }).catch(onError);

    return () => {
      active = false;
      if (watchId) void Geolocation.clearWatch({ id: watchId });
    };
  }

  if (typeof navigator === "undefined" || !navigator.geolocation) {
    onError({ code: "unavailable", message: "Geolocation is unavailable." });
    return () => {};
  }

  const watchId = navigator.geolocation.watchPosition(onPosition, onError, options);
  return () => navigator.geolocation.clearWatch(watchId);
}
