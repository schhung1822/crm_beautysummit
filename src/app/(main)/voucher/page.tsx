import { listSalesVouchers } from "@/lib/sales-vouchers";

import SalesVoucherManager from "./_components/sales-voucher-manager";

export const dynamic = "force-dynamic";

export default async function Page() {
  const vouchers = await listSalesVouchers();

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <SalesVoucherManager initialData={vouchers} />
    </div>
  );
}
