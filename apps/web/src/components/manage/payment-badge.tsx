import { Badge, type BadgeVariant } from "~/components/ui/badge";
import {
  paymentStatusLabel,
  type PaymentStatus,
} from "@repo/domain/booking-payment";

const VARIANTS: Record<PaymentStatus, BadgeVariant> = {
  pending: "outline",
  paid: "success",
  failed: "destructive",
  refunded: "secondary",
  partially_refunded: "secondary",
  waived: "secondary",
};

export function PaymentBadge({
  status,
  refundInProgress = false,
}: {
  status: PaymentStatus;
  refundInProgress?: boolean;
}) {
  return (
    <Badge variant={refundInProgress ? "warning" : VARIANTS[status]} size="sm">
      {refundInProgress ? "Refund in progress" : paymentStatusLabel(status)}
    </Badge>
  );
}
