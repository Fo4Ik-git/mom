import { setRequestLocale } from "next-intl/server";
import { AdminCalculators } from "@/app/components/admin/admin-calculators";

export default async function AdminCalculatorsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <AdminCalculators />;
}
