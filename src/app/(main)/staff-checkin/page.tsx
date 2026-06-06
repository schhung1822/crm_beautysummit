import StaffCheckinClient from "./_components/staff-checkin-client";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const areaMode = params.area === "gift" ? "gift" : "checkin";

  return <StaffCheckinClient areaMode={areaMode} />;
}
