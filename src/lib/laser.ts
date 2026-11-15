"use client";

/**
 * Bluetooth laser distance meters over Web Bluetooth (Chrome / Edge on Android, Windows, macOS).
 *
 * Protocols are taken from tested open-source projects (no official vendor docs exist):
 *  - Bosch GLM, BLE models (GLM 50-27 C/CG, 100-25 C, 120 C, 150 C, 165-27 C, 400 C):
 *    service 02a6c0d0-…, one characteristic for commands and data. After subscribing, write
 *    C0 55 02 01 00 1A to switch on automatic sending. Each measurement arrives as a frame
 *    starting C0 55 10 06 with a float32 little-endian distance in metres at byte 7.
 *    (github.com/matom-642/Bosch-GLM-BLE, github.com/ketan/Bosch-GLM50C-Rangefinder)
 *  - Leica DISTO, BLE models (D1, D2, D110, D510, D810, X3, X4, S910):
 *    service 3ab10100-…, distance on 3ab10101-… (some sources say 3ab1010D, so both are read)
 *    as float32 little-endian metres at offset 0, sent each time the button is pressed.
 */

const BOSCH_SERVICE = "02a6c0d0-0451-4000-b000-fb3210111989";
const BOSCH_CHAR = "02a6c0d1-0451-4000-b000-fb3210111989";
const BOSCH_ENABLE = new Uint8Array([0xc0, 0x55, 0x02, 0x01, 0x00, 0x1a]);

const LEICA_SERVICE = "3ab10100-f831-4395-b29d-570977d5bf94";
const LEICA_DISTANCE = ["3ab10101-f831-4395-b29d-570977d5bf94", "3ab1010d-f831-4395-b29d-570977d5bf94"];

export type LaserBrand = "bosch" | "leica";
export type LaserConnection = { name: string; brand: LaserBrand; disconnect: () => void };

/* eslint-disable @typescript-eslint/no-explicit-any */
type BT = any;

export const laserSupported = () =>
  typeof navigator !== "undefined" && "bluetooth" in navigator && typeof window !== "undefined" && window.isSecureContext;

const sane = (m: number) => Number.isFinite(m) && m > 0 && m <= 300;

/** Parses a Bosch frame; returns metres or null for heartbeats/status frames. */
export function parseBosch(view: DataView): number | null {
  if (view.byteLength < 11) return null;
  if (view.getUint8(0) !== 0xc0 || view.getUint8(1) !== 0x55 || view.getUint8(2) !== 0x10 || view.getUint8(3) !== 0x06) return null;
  const m = view.getFloat32(7, true);
  return sane(m) ? m : null;
}

export function parseLeica(view: DataView): number | null {
  if (view.byteLength < 4) return null;
  const m = view.getFloat32(0, true);
  return sane(m) ? m : null;
}

/**
 * Opens the browser's device picker and connects. `onReading` receives each distance in metres.
 * Must be called from a click (browser rule).
 */
export async function connectLaser(onReading: (metres: number) => void, onDisconnect: () => void): Promise<LaserConnection> {
  const bluetooth: BT = (navigator as any).bluetooth;
  const device: BT = await bluetooth.requestDevice({
    filters: [{ services: [BOSCH_SERVICE] }, { services: [LEICA_SERVICE] }, { namePrefix: "GLM" }, { namePrefix: "DISTO" }, { namePrefix: "Bosch" }],
    optionalServices: [BOSCH_SERVICE, LEICA_SERVICE],
  });
  let keepAlive: ReturnType<typeof setInterval> | undefined;
  let manual = false;
  device.addEventListener("gattserverdisconnected", () => {
    if (keepAlive) clearInterval(keepAlive);
    if (!manual) onDisconnect();
  });
  const server: BT = await device.gatt.connect();
  const name: string = device.name || "Laser";
  const disconnect = () => {
    manual = true;
    if (keepAlive) clearInterval(keepAlive);
    try { device.gatt.disconnect(); } catch {}
  };

  // Bosch
  try {
    const service: BT = await server.getPrimaryService(BOSCH_SERVICE);
    const ch: BT = await service.getCharacteristic(BOSCH_CHAR);
    ch.addEventListener("characteristicvaluechanged", (e: any) => {
      const m = parseBosch(e.target.value as DataView);
      if (m !== null) onReading(m);
    });
    await ch.startNotifications();
    const write = () => (ch.writeValueWithResponse ? ch.writeValueWithResponse(BOSCH_ENABLE) : ch.writeValue(BOSCH_ENABLE)).catch(() => {});
    await write();
    // The meter switches itself off after 5 minutes; a status request every 4 minutes keeps it awake.
    keepAlive = setInterval(write, 4 * 60 * 1000);
    return { name, brand: "bosch", disconnect };
  } catch {
    /* not a Bosch, try Leica */
  }

  // Leica
  const service: BT = await server.getPrimaryService(LEICA_SERVICE);
  let subscribed = 0;
  let last = 0;
  for (const uuid of LEICA_DISTANCE) {
    try {
      const ch: BT = await service.getCharacteristic(uuid);
      ch.addEventListener("characteristicvaluechanged", (e: any) => {
        const m = parseLeica(e.target.value as DataView);
        // Both characteristics may report the same press; ignore duplicates within 300 ms
        const now = Date.now();
        if (m !== null && now - last > 300) {
          last = now;
          onReading(m);
        }
      });
      await ch.startNotifications();
      subscribed++;
    } catch {
      /* characteristic not on this model */
    }
  }
  if (!subscribed) {
    disconnect();
    throw new Error("unsupported");
  }
  return { name, brand: "leica", disconnect };
}
