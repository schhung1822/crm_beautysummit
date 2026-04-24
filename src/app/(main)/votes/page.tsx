import { getAcademy } from "@/lib/events";
import { getEventDay1Date } from "@/lib/event-settings";
import { listVoteOptions } from "@/lib/vote-options";

import { DataTable } from "./_components/data-table";

export default async function Page() {
  const [academy, voteOptions, eventDay1] = await Promise.all([getAcademy(), listVoteOptions(), getEventDay1Date()]);

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <DataTable data={academy} initialVoteOptions={voteOptions} eventDay1={eventDay1} />
    </div>
  );
}
