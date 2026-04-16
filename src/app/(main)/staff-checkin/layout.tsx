import { ReactNode } from "react";

import { LayoutControls } from "@/app/(main)/dashboard/_components/sidebar/layout-controls";
import { ThemeSwitcher } from "@/app/(main)/dashboard/_components/sidebar/theme-switcher";
import { getPreference } from "@/server/server-actions";
import {
  CONTENT_LAYOUT_VALUES,
  NAVBAR_STYLE_VALUES,
  SIDEBAR_VARIANT_VALUES,
  SIDEBAR_COLLAPSIBLE_VALUES,
  type ContentLayout,
  type NavbarStyle,
  type SidebarVariant,
  type SidebarCollapsible,
} from "@/types/preferences/layout";

import { StaffAccountSwitcher } from "./_components/staff-account-switcher";

export default async function Layout({ children }: Readonly<{ children: ReactNode }>) {
  const [sidebarVariant, sidebarCollapsible, contentLayout, navbarStyle] = await Promise.all([
    getPreference<SidebarVariant>("sidebar_variant", SIDEBAR_VARIANT_VALUES, "inset"),
    getPreference<SidebarCollapsible>("sidebar_collapsible", SIDEBAR_COLLAPSIBLE_VALUES, "icon"),
    getPreference<ContentLayout>("content_layout", CONTENT_LAYOUT_VALUES, "centered"),
    getPreference<NavbarStyle>("navbar_style", NAVBAR_STYLE_VALUES, "scroll"),
  ]);

  const layoutPreferences = {
    contentLayout,
    variant: sidebarVariant,
    collapsible: sidebarCollapsible,
    navbarStyle,
  };

  return (
    <div className="bg-muted/20 flex min-h-screen w-full flex-col">
      <header className="bg-background sticky top-0 z-50 flex h-14 shrink-0 items-center gap-2 border-b px-4 lg:px-6">
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-2 font-semibold">Lễ tân Check-in</div>
          <div className="flex items-center gap-2">
            <LayoutControls {...layoutPreferences} />
            <ThemeSwitcher />
            <StaffAccountSwitcher />
          </div>
        </div>
      </header>
      <main className="w-full flex-1 p-4 md:p-6 lg:mx-auto lg:max-w-screen-2xl">{children}</main>
    </div>
  );
}
