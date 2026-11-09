import { getAllMessages, getAboutDescription, getAllSettings } from "@/lib/db";
import { SorakSoraApp } from "@/components/SorakSoraApp";

export const dynamic = "force-dynamic";

export default function Home() {
  const initialMessages = getAllMessages();
  const initialAboutDescription = getAboutDescription();
  const initialSettings = getAllSettings();

  return (
    <SorakSoraApp
      initialMessages={initialMessages}
      initialAboutDescription={initialAboutDescription}
      initialSettings={initialSettings}
    />
  );
}
