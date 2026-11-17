import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { BottomNav } from "@/components/layout/bottom-nav";
import { CartSheetHost } from "@/components/cart/cart-button";
import { JsonLd, organizationLd } from "@/lib/seo";

export default function ShopLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <SiteHeader />
      <div className="flex-1">{children}</div>
      <SiteFooter />
      <BottomNav />
      <CartSheetHost />
      <JsonLd data={organizationLd()} />
    </>
  );
}
