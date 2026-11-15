"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BellRing, Check } from "lucide-react";
import { savePushSubscription } from "@/app/[locale]/admin/actions";

/** Registers the service worker and keeps the number on the installed app's icon current. */
export function PwaClient({ badge }: { badge: number }) {
  useEffect(() => {
    if ("serviceWorker" in navigator && window.isSecureContext) navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  useEffect(() => {
    const nav = navigator as Navigator & { setAppBadge?: (n: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
    if (badge > 0) nav.setAppBadge?.(badge).catch(() => {});
    else nav.clearAppBadge?.().catch(() => {});
  }, [badge]);
  return null;
}

function urlB64ToUint8Array(base64: string) {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

function deviceLabel() {
  const ua = navigator.userAgent;
  const os = /iPhone|iPad/.test(ua) ? "iPhone" : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows" : /Mac/.test(ua) ? "Mac" : "Device";
  const br = /Edg\//.test(ua) ? "Edge" : /SamsungBrowser/.test(ua) ? "Samsung Internet" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "";
  return [os, br].filter(Boolean).join(" · ");
}

type Labels = { pushEnable: string; pushEnabled: string; pushBlocked: string; pushUnsupported: string; pushHttps: string };

/** "Turn on notifications on this device" button with clear states. */
export function PushSetup({ vapidKey, L }: { vapidKey: string; L: Labels }) {
  const router = useRouter();
  const [state, setState] = useState<"checking" | "off" | "on" | "blocked" | "unsupported" | "insecure" | "busy">("checking");

  useEffect(() => {
    (async () => {
      if (!window.isSecureContext) return setState("insecure");
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return setState("unsupported");
      if (Notification.permission === "denied") return setState("blocked");
      const reg = await navigator.serviceWorker.register("/sw.js");
      const sub = await reg.pushManager.getSubscription();
      const key = urlB64ToUint8Array(vapidKey);
      const k = sub?.options.applicationServerKey ? new Uint8Array(sub.options.applicationServerKey) : null;
      const sameKey = !!k && k.length === key.length && k.every((b, i) => b === key[i]);
      setState(sub && sameKey && Notification.permission === "granted" ? "on" : "off");
    })().catch(() => setState("unsupported"));
  }, []);

  const enable = async () => {
    setState("busy");
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") return setState(perm === "denied" ? "blocked" : "off");
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const key = urlB64ToUint8Array(vapidKey);
      let sub = await reg.pushManager.getSubscription();
      // A subscription made with a different server key can't receive our messages: replace it
      const existingKey = sub?.options.applicationServerKey ? new Uint8Array(sub.options.applicationServerKey) : null;
      if (sub && (!existingKey || existingKey.length !== key.length || existingKey.some((b, i) => b !== key[i]))) {
        await sub.unsubscribe();
        sub = null;
      }
      sub = sub || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key }));
      const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
      const res = await savePushSubscription(json, deviceLabel());
      setState(res.ok ? "on" : "off");
      router.refresh();
    } catch {
      setState("unsupported");
    }
  };

  if (state === "on")
    return <p className="flex items-center gap-2 rounded-lg bg-[#dff0e6] px-4 py-3 text-sm text-[#23633f]"><Check size={17} /> {L.pushEnabled}</p>;
  if (state === "blocked") return <p className="rounded-lg bg-[#f6e1df] px-4 py-3 text-sm text-[#9a332c]">{L.pushBlocked}</p>;
  if (state === "unsupported") return <p className="rounded-lg bg-[#f6e1df] px-4 py-3 text-sm text-[#9a332c]">{L.pushUnsupported}</p>;
  if (state === "insecure") return <p className="rounded-lg bg-[#fbf4e6] px-4 py-3 text-sm text-[#8a5a12]">{L.pushHttps}</p>;
  return (
    <button type="button" onClick={enable} disabled={state !== "off"} className="btn w-full bg-brass py-3 text-white hover:bg-[#8d6b36] disabled:opacity-60 sm:w-auto">
      <BellRing size={18} /> {L.pushEnable}
    </button>
  );
}
