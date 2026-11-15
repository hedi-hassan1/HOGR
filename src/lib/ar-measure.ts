"use client";

/**
 * Phone-camera measuring with WebXR (Chrome on Android phones with ARCore / Google Play Services for AR).
 * The camera feed is shown by the system; we hit-test the real surface under the screen centre,
 * let the user drop two points, and report the straight-line distance between them.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
type V3 = { x: number; y: number; z: number };

export type ArState = {
  tracking: boolean; // a surface is under the crosshair
  points: V3[]; // placed points (max 2)
  liveCm: number | null; // distance from point 1 to the crosshair, or between both points
  screen: { x: number; y: number }[]; // placed points projected to screen pixels
  cursor: { x: number; y: number } | null;
};

export type ArController = { addPoint: () => void; reset: () => void; end: () => void };

export async function arSupported(): Promise<boolean> {
  try {
    const xr = (navigator as any).xr;
    return !!xr && window.isSecureContext && (await xr.isSessionSupported("immersive-ar"));
  } catch {
    return false;
  }
}

const dist = (a: V3, b: V3) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

/** Multiplies a column-major 4×4 matrix by a vector. */
function mul(m: Float32Array, v: [number, number, number, number]): [number, number, number, number] {
  const r: [number, number, number, number] = [0, 0, 0, 0];
  for (let i = 0; i < 4; i++) r[i] = m[i] * v[0] + m[4 + i] * v[1] + m[8 + i] * v[2] + m[12 + i] * v[3];
  return r;
}

/** Call from a click handler (browsers require a user gesture). */
export async function startAr(overlay: HTMLElement, onUpdate: (s: ArState) => void, onEnd: () => void): Promise<ArController> {
  const xr = (navigator as any).xr;
  const session: any = await xr.requestSession("immersive-ar", {
    requiredFeatures: ["hit-test", "local"],
    optionalFeatures: ["dom-overlay"],
    domOverlay: { root: overlay },
  });

  const canvas = document.createElement("canvas");
  const gl = canvas.getContext("webgl", { xrCompatible: true, alpha: true }) as WebGLRenderingContext;
  session.updateRenderState({ baseLayer: new (window as any).XRWebGLLayer(session, gl) });
  const refSpace = await session.requestReferenceSpace("local");
  const viewerSpace = await session.requestReferenceSpace("viewer");
  const hitSource = await session.requestHitTestSource({ space: viewerSpace });

  const points: V3[] = [];
  const recent: V3[] = []; // smoothing window for the crosshair position
  let current: V3 | null = null;
  let ended = false;

  session.addEventListener("end", () => {
    ended = true;
    try { hitSource.cancel(); } catch {}
    onEnd();
  });

  const onFrame = (_t: number, frame: any) => {
    if (ended) return;
    session.requestAnimationFrame(onFrame);
    const layer = session.renderState.baseLayer;
    gl.bindFramebuffer(gl.FRAMEBUFFER, layer.framebuffer);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const hits = frame.getHitTestResults(hitSource);
    if (hits.length) {
      const p = hits[0].getPose(refSpace).transform.position;
      recent.push({ x: p.x, y: p.y, z: p.z });
      if (recent.length > 6) recent.shift();
      current = {
        x: recent.reduce((s, q) => s + q.x, 0) / recent.length,
        y: recent.reduce((s, q) => s + q.y, 0) / recent.length,
        z: recent.reduce((s, q) => s + q.z, 0) / recent.length,
      };
    } else {
      current = null;
      recent.length = 0;
    }

    const pose = frame.getViewerPose(refSpace);
    const project = (p: V3) => {
      if (!pose) return null;
      const view = pose.views[0];
      const eye = mul(view.transform.inverse.matrix, [p.x, p.y, p.z, 1]);
      const clip = mul(view.projectionMatrix, eye);
      if (clip[3] <= 0) return null;
      return { x: ((clip[0] / clip[3]) * 0.5 + 0.5) * window.innerWidth, y: (1 - ((clip[1] / clip[3]) * 0.5 + 0.5)) * window.innerHeight };
    };

    const live = points.length === 2 ? dist(points[0], points[1]) : points.length === 1 && current ? dist(points[0], current) : null;
    onUpdate({
      tracking: !!current,
      points: [...points],
      liveCm: live === null ? null : Math.round(live * 1000) / 10,
      screen: points.map(project).filter(Boolean) as { x: number; y: number }[],
      cursor: current ? project(current) : null,
    });
  };
  session.requestAnimationFrame(onFrame);

  return {
    addPoint: () => {
      if (current && points.length < 2) points.push({ ...current });
    },
    reset: () => {
      points.length = 0;
    },
    end: () => {
      if (!ended) session.end().catch(() => {});
    },
  };
}
