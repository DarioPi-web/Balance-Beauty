import { describe, expect, it } from "vitest";
import {
  imageKeys,
  keysFromStoragePath,
  storageShareUrl,
  storageVariantUrl,
} from "@/lib/admin/image-paths";
import imageLoader, { publicImageUrl } from "@/lib/image-loader";

const base =
  "https://x.supabase.co/storage/v1/object/public/product-images/serum-niacinamida/ab12cd34ef56";

describe("fotos subidas desde el admin", () => {
  it("genera maestra, 5 variantes del loader y JPEG para compartir", () => {
    const k = imageKeys("serum-niacinamida", "ab12cd34ef56");
    expect(k.master).toBe("serum-niacinamida/ab12cd34ef56.avif");
    expect(k.variants.map((v) => v.key)).toEqual(
      [256, 384, 640, 828, 1080].map((w) => `serum-niacinamida/ab12cd34ef56-${w}.avif`),
    );
    expect(k.share).toBe("serum-niacinamida/ab12cd34ef56-share.jpg");
  });

  it("recupera todas las claves para borrar y no toca fotos heredadas", () => {
    expect(keysFromStoragePath("serum-niacinamida/ab12cd34ef56.avif")).toHaveLength(7);
    expect(keysFromStoragePath("/products/agua-micelar/1.webp")).toBeNull();
  });

  it("el loader elige la variante AVIF más chica que cubre el ancho", () => {
    expect(storageVariantUrl(`${base}.avif`, 300)).toBe(`${base}-384.avif`);
    expect(imageLoader({ src: `${base}.avif`, width: 2000 })).toBe(`${base}-1080.avif`);
    expect(storageShareUrl(`${base}.avif`)).toBe(`${base}-share.jpg`);
    expect(publicImageUrl(`${base}.avif`)).toBe(`${base}-share.jpg`);
  });

  it("las fotos del sitio siguen igual", () => {
    expect(imageLoader({ src: "/products/agua-micelar/1.webp", width: 640 })).toBe(
      "/img/products/agua-micelar/1-640.avif",
    );
  });
});
