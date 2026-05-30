import { getAdminUsers } from "@/lib/admin-users";

import AccountPageClient from "./account-page-client";

export default async function Page() {
  const members = (await getAdminUsers()).filter((item) => item.role.trim().toLowerCase() !== "user");

  return <AccountPageClient initialMembers={members} />;
}
