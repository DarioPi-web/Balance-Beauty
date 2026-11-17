/** Datos públicos del sitio (se migran a store_settings cuando haya Supabase). */
export const site = {
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  social: {
    instagram: "https://www.instagram.com/balancesaludbelleza",
    tiktok: "https://www.tiktok.com/@balancesaludbelleza",
    facebook: "https://www.facebook.com/profile.php?id=100037905023515",
  },
  transferDiscountPercent: 10,
  installments: { standard: 6, promo: 12, promoMinAmount: 150000 },
} as const;
