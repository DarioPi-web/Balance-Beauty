import { ORDER_STATUS_LABEL, type OrderStatus } from "@/lib/orders/labels";
import { cn } from "@/lib/utils";

export function StatusBadge({ status }: { status: OrderStatus }) {
  const tone =
    status === "pending_payment"
      ? "bg-rose-soft"
      : status === "cancelled" || status === "refunded"
        ? "bg-mist text-muted-foreground"
        : status === "delivered"
          ? "bg-mist"
          : "bg-leaf text-clinical";
  return (
    <span className={cn("rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap", tone)}>
      {ORDER_STATUS_LABEL[status]}
    </span>
  );
}
