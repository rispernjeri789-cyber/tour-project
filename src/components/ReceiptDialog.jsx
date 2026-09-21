import { Printer } from "lucide-react";
import { formatKes } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";

export function ReceiptDialog({ payment }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Printer className="h-4 w-4" />
          Print receipt
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Payment receipt</DialogTitle>
        </DialogHeader>

        <div className="receipt-print flex flex-col gap-4 text-sm">
          <div className="text-center">
            <p className="font-serif text-xl font-bold">NO AGE Tour and Travel</p>
            <p className="text-muted-foreground">Official payment receipt</p>
          </div>

          <div className="flex flex-col gap-2 border-y border-border py-4">
            <Row label="Booking reference" value={payment.booking_reference} mono />
            <Row label="Tour" value={payment.tour_title} />
            <Row
              label="Date paid"
              value={
                payment.created_at ? new Date(payment.created_at).toLocaleString("en-KE") : "—"
              }
            />
            <Row label="Payment method" value={payment.method === "cash" ? "Cash" : "M-Pesa"} />
            {payment.method === "mpesa" && (
              <>
                <Row label="Phone number" value={payment.phone_number} />
                <Row label="M-Pesa receipt no." value={payment.mpesa_receipt_number} mono />
              </>
            )}
          </div>

          <div className="flex items-center justify-between text-base font-semibold">
            <span>Amount paid</span>
            <span className="text-primary">{formatKes(payment.amount)}</span>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Thank you for booking with NO AGE Tour and Travel.
          </p>
        </div>

        <DialogFooter>
          <Button onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            Print
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value, mono }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className={mono ? "font-mono" : "text-right font-medium"}>{value || "—"}</span>
    </div>
  );
}
