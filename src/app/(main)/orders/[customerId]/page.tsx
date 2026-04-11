export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { getOrdersByCustomer } from "@/lib/ordersByCustomer";

import { DataTable } from "./_components/data-table";

type PageProps = {
  params: Promise<{ customerId: string }>;
};

export default async function Page({ params }: PageProps) {
  const { customerId: rawCustomerId = "" } = await params;
  const customerId = String(rawCustomerId).trim();

  if (!customerId) {
    return (
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <h1 className="text-xl font-semibold">Thiếu số điện thoại</h1>
      </div>
    );
  }

  const { rows } = await getOrdersByCustomer(customerId);
  const customer = rows.length > 0 ? rows[0] : undefined;

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <h1 className="text-xl font-semibold">Danh sách đơn hàng - {customerId}</h1>

      <div className="bg-card/50 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-lg font-semibold">{customer ? customer.name : "Khách hàng không xác định"}</div>
            <div className="text-muted-foreground text-sm">SĐT: {customerId}</div>
          </div>
          <div className="text-right text-sm">
            <div>Email: {customer ? customer.email : "—"}</div>
            <div>Lớp: {customer ? customer.class : "—"}</div>
          </div>
        </div>
      </div>

      <DataTable data={rows} />
    </div>
  );
}
