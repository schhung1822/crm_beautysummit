import { getAcademy } from "@/lib/events";

import { DataTable } from "./_components/data-table";

export default async function Page() {
  const academy = await getAcademy();

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <DataTable data={academy} />
    </div>
  );
}
