"use client";

import { useTranslations } from "next-intl";
import { BarChart3, BedDouble, Inbox, Settings, Users } from "lucide-react";
import { BottomNav } from "@/components/galmee/bottom-nav";

const ITEMS = [
  { href: "/", key: "home", icon: BedDouble, manager: false },
  { href: "/guests", key: "guests", icon: Users, manager: false },
  { href: "/requests", key: "requests", icon: Inbox, manager: false },
  { href: "/reports", key: "reports", icon: BarChart3, manager: true },
  { href: "/settings", key: "settings", icon: Settings, manager: true },
] as const;

/** Hotel's destinations in the shared Galmee nav; reports and setup are for managers. */
export function AppNav({ variant, canManage }: { variant: "bottom" | "side"; canManage: boolean }) {
  const t = useTranslations("nav");
  return (
    <BottomNav
      variant={variant}
      menuLabel={t("menu")}
      items={ITEMS.filter((item) => canManage || !item.manager).map(({ href, key, icon }) => ({
        href,
        label: t(key),
        icon,
      }))}
    />
  );
}
