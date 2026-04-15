import { getAdminUsers } from "@/lib/admin-users";

import { DataTable } from "./_components/data-table";

export default async function Page() {
  const users = await getAdminUsers();

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <DataTable data={users} />
    </div>
  );
}
