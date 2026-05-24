"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { appFetch } from "@/lib/api-client";

interface UserRow {
  id: string;
  email: string;
  name: string | null;
  role: "USER" | "ADMIN";
  banned: boolean;
  calculatorsCount: number;
}

export function AdminUsers() {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const [users, setUsers] = useState<UserRow[]>([]);

  async function load() {
    const response = await appFetch("/api/admin/users");
    const data = await response.json();
    setUsers(data.users ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function updateUser(id: string, patch: { role?: string; banned?: boolean }) {
    await appFetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
    await load();
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card/90 shadow-card">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-border bg-muted/40">
          <tr>
            <th className="px-4 py-3 font-medium">{tc("email")}</th>
            <th className="px-4 py-3 font-medium">{t("role")}</th>
            <th className="px-4 py-3 font-medium">{t("status")}</th>
            <th className="px-4 py-3 font-medium">{t("statsCalculators")}</th>
            <th className="px-4 py-3 font-medium">{t("actions")}</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} className="border-b border-border/60">
              <td className="px-4 py-3 font-medium">{user.email}</td>
              <td className="px-4 py-3">{user.role}</td>
              <td className="px-4 py-3">
                {user.banned ? tc("banned") : tc("active")}
              </td>
              <td className="px-4 py-3">{user.calculatorsCount}</td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      updateUser(user.id, {
                        role: user.role === "ADMIN" ? "USER" : "ADMIN",
                      })
                    }
                    className="text-xs font-medium text-accent underline"
                  >
                    {user.role === "ADMIN" ? t("removeAdmin") : t("makeAdmin")}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateUser(user.id, { banned: !user.banned })
                    }
                    className="text-xs font-medium text-destructive underline"
                  >
                    {user.banned ? t("unban") : t("ban")}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
