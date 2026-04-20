import { listVoteOptions } from "@/lib/vote-options";

import { VoteOptionManager } from "../votes/_components/vote-option-manager";

export default async function Page() {
  const voteOptions = await listVoteOptions();

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div className="flex w-full flex-col gap-6">
        <VoteOptionManager initialData={voteOptions} />
      </div>
    </div>
  );
}
