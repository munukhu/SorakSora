import { redirect } from "next/navigation";
import { getAllMessages, getRandomMessage, getAboutDescription, getAllSettings } from "@/lib/db";
import { SorakSoraApp } from "@/components/SorakSoraApp";

export const dynamic = "force-dynamic";

export default function RandomFallbackPage() {
  const randomMessage = getRandomMessage();

  // If no approved messages exist yet, cleanly redirect to root
  if (!randomMessage) {
    redirect("/");
  }

  const initialMessages = getAllMessages();
  const initialAboutDescription = getAboutDescription();
  const initialSettings = getAllSettings();

  return (
    <SorakSoraApp
      initialMessages={initialMessages}
      initialSpotlightMessage={randomMessage}
      autoOpenSpotlight={true}
      initialAboutDescription={initialAboutDescription}
      initialSettings={initialSettings}
    />
  );
}
