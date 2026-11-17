"use client";

/**
 * File input that shrinks photos in the browser before they are uploaded (max 2000 px, JPEG).
 * Keeps uploads small for mobile data and under the online upload limit (about 4 MB per request).
 */
async function shrink(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.size < 900 * 1024) return file;
  try {
    const img = await createImageBitmap(file);
    const scale = Math.min(1, 2000 / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * scale);
    c.height = Math.round(img.height * scale);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    const blob = await new Promise<Blob | null>((res) => c.toBlob(res, "image/jpeg", 0.84));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

export function ImageInput({ name, multiple, required, className = "" }: { name: string; multiple?: boolean; required?: boolean; className?: string }) {
  return (
    <input
      type="file"
      name={name}
      accept="image/jpeg,image/png,image/webp"
      multiple={multiple}
      required={required}
      className={className}
      onChange={async (e) => {
        const input = e.currentTarget;
        const files = Array.from(input.files || []);
        if (!files.length) return;
        const smaller = await Promise.all(files.map(shrink));
        const dt = new DataTransfer();
        smaller.forEach((f) => dt.items.add(f));
        input.files = dt.files;
      }}
    />
  );
}
