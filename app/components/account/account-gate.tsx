import { auth } from "@/auth";
import { AccountBlockedOverlay } from "@/app/components/account/account-blocked-overlay";
import { getUserAccountStatus, shouldBlockUser } from "@/lib/account-status";

export async function AccountGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    return children;
  }

  const status = await getUserAccountStatus(session.user.id);

  if (!status || !shouldBlockUser(status)) {
    return children;
  }

  return (
    <>
      <div className="pointer-events-none select-none" aria-hidden>
        {children}
      </div>
      <AccountBlockedOverlay
        banReason={status.banReason}
        supportEmail={status.support.email}
        supportTelegram={status.support.telegram}
      />
    </>
  );
}
