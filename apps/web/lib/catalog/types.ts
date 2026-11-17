export type ProductImage = { src: string; alt: string };

export type Product = {
  id: string;
  sku: string;
  slug: string;
  name: string;
  brand: string | null;
  tagline: string | null;
  description: string;
  price: number;
  compareAtPrice: number | null;
  stock: number | null;
  inStock: boolean;
  categories: string[];
  concerns: string[];
  images: ProductImage[];
  /** Requiere validación regulatoria antes de venderse online (R-04): se muestra "Consultar". */
  requiresReview: boolean;
};

export type Taxon = { slug: string; name: string; description: string; order: number };

export type CatalogSnapshot = {
  categories: Taxon[];
  concerns: Taxon[];
  products: Product[];
};

export type SortKey = "recomendados" | "precio-asc" | "precio-desc" | "nombre";
