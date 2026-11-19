"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { UploadResult } from "@/actions/admin-products";

const MAX_SIDE = 2000;

/** Achica la foto en el navegador (respeta la rotación EXIF) → JPEG ≤ 2000 px. */
async function downscale(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob"))), "image/jpeg", 0.9),
  );
}

/**
 * Subida de fotos del producto: varias a la vez (o desde la cámara del celular), se achican
 * en el navegador y se mandan de a una (límite de 4,5 MB por pedido en Vercel).
 */
export function ImageUploader({
  productId,
  upload,
}: {
  productId: string;
  upload: (fd: FormData) => Promise<UploadResult>;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [progress, setProgress] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  const onChange = () => {
    const files = Array.from(input.current?.files ?? []).slice(0, 12);
    if (files.length === 0) return;
    setErrors([]);
    start(async () => {
      const failed: string[] = [];
      for (const [i, file] of files.entries()) {
        setProgress(`Subiendo ${i + 1} de ${files.length}…`);
        try {
          const blob = await downscale(file);
          const fd = new FormData();
          fd.set("id", productId);
          fd.set("name", file.name);
          fd.set(
            "file",
            new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" }),
          );
          const res = await upload(fd);
          if (!res.ok) failed.push(res.error);
        } catch {
          failed.push(`${file.name}: el navegador no pudo leer la foto (probá con JPG o PNG)`);
        }
      }
      setErrors(failed);
      setProgress(
        failed.length === files.length
          ? null
          : `Listo: ${files.length - failed.length} foto${files.length - failed.length === 1 ? "" : "s"} subida${files.length - failed.length === 1 ? "" : "s"}.`,
      );
      if (input.current) input.current.value = "";
      router.refresh();
    });
  };

  return (
    <div className="grid gap-2">
      <label className="inline-flex min-h-11 w-fit cursor-pointer items-center justify-center rounded-full bg-leaf px-5 font-medium text-clinical hover:bg-leaf-hover has-[:disabled]:cursor-wait has-[:disabled]:opacity-60">
        {pending ? "Subiendo…" : "Agregar fotos"}
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          multiple
          disabled={pending}
          onChange={onChange}
          className="sr-only"
        />
      </label>
      <p className="text-sm text-muted-foreground">
        JPG, PNG o WebP, mínimo 600 px. Ideal: fondo claro, producto centrado, 1200 px o más. Podés
        elegir varias o sacarlas con el celular.
      </p>
      <p role="status" aria-live="polite" className="text-sm">
        {progress}
      </p>
      {errors.length ? (
        <ul
          role="alert"
          className="grid gap-1 rounded-xl border border-alert/40 bg-rose-soft px-4 py-3 text-sm"
        >
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
