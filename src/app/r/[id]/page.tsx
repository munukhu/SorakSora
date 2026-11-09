import { redirect } from "next/navigation";
import {
  getAllMessages,
  getMessageByUniqueIdOrId,
  getAboutDescription,
  getAllSettings,
} from "@/lib/db";
import { SorakSoraApp } from "@/components/SorakSoraApp";

export const dynamic = "force-dynamic";

interface UniqueMessagePageProps {
  params: Promise<{ id: string }>;
}

export default async function UniqueMessagePage({ params }: UniqueMessagePageProps) {
  const { id } = await params;
  const message = getMessageByUniqueIdOrId(id);

  // If message doesn't exist or is not approved, cleanly redirect to root
  if (!message) {
    redirect("/");
  }

  const initialMessages = getAllMessages();
  const initialAboutDescription = getAboutDescription();
  const initialSettings = getAllSettings();

  return (
    <SorakSoraApp
      initialMessages={initialMessages}
      initialSpotlightMessage={message}
      autoOpenSpotlight={true}
      initialAboutDescription={initialAboutDescription}
      initialSettings={initialSettings}
    />
  );
}
