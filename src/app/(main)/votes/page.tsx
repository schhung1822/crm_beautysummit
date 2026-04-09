import { getAcademy } from "@/lib/events";
import { listVoteOptions } from "@/lib/vote-options";

import { DataTable } from "./_components/data-table";

export default async function Page() {
  const [academy, voteOptions] = await Promise.all([getAcademy(), listVoteOptions()]);

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <DataTable data={academy} initialVoteOptions={voteOptions} />
    </div>
  );
}
