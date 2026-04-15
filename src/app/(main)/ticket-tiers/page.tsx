import { listTicketTiers } from "@/lib/ticket-tiers";

import TicketTierManager from "./_components/ticket-tier-manager";

export default async function Page() {
  const tiers = await listTicketTiers();

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <TicketTierManager initialData={tiers} />
    </div>
  );
}
