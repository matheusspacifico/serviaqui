import { roundCoordinates, type Coordinates } from "@/lib/geo";

export type BrowserLocationFailure =
  | "unsupported"
  | "denied"
  | "unavailable"
  | "timeout";

export type BrowserLocationResult =
  | { ok: true; coords: Coordinates }
  | { ok: false; reason: BrowserLocationFailure };

export type LocationPermission = "granted" | "prompt" | "denied" | "unknown";

export const BROWSER_LOCATION_MESSAGES: Record<BrowserLocationFailure, string> = {
  unsupported:
    "Seu navegador não informa a localização. Escolha a cidade e o bairro.",
  denied:
    "Você não permitiu o acesso à localização. Escolha a cidade e o bairro para buscar.",
  unavailable:
    "Não foi possível obter sua localização agora. Escolha a cidade e o bairro.",
  timeout:
    "A localização demorou demais para responder. Tente de novo ou escolha um bairro.",
};

function isSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    "geolocation" in navigator &&
    window.isSecureContext
  );
}

export function getBrowserLocation(): Promise<BrowserLocationResult> {
  if (!isSupported()) {
    return Promise.resolve({ ok: false, reason: "unsupported" });
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          ok: true,
          coords: roundCoordinates({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          }),
        }),
      (error) =>
        resolve({
          ok: false,
          reason:
            error.code === error.PERMISSION_DENIED
              ? "denied"
              : error.code === error.TIMEOUT
                ? "timeout"
                : "unavailable",
        }),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  });
}

export async function getLocationPermission(): Promise<LocationPermission> {
  if (!isSupported() || !navigator.permissions) return "unknown";
  try {
    const status = await navigator.permissions.query({ name: "geolocation" });
    return status.state;
  } catch {
    return "unknown";
  }
}
