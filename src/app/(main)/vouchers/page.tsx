import { listAdminMiniAppVouchers } from "@/lib/miniapp-rewards";

import VoucherManager from "./_components/voucher-manager";

export default async function Page() {
  const vouchers = await listAdminMiniAppVouchers();

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <VoucherManager initialData={vouchers} />
    </div>
  );
}
