import { AppShell } from "@/components/app-shell";
import { getSentEmails } from "@/lib/queries";
import { EmailsList } from "@/components/emails-list";
import { InboxView } from "@/components/inbox-view";

export const dynamic = "force-dynamic";

export default async function EmailsPage() {
  const emails = await getSentEmails();

  return (
    <AppShell title="Outreach" subtitle="Emails sent, drafted, and replies">
      <div className="flex w-full flex-col gap-8">
        <EmailsList emails={emails} />
        <InboxView />
      </div>
    </AppShell>
  );
}
