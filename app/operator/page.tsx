import type { Metadata } from "next";

import { OperatorInbox } from "@/components/modules/operator-inbox";
import { absoluteUrl } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Ответы на комментарии | Обучение от тети Аннушки",
  description: "Внутренний экран для ответов на комментарии пользователей по модулям.",
  alternates: {
    canonical: absoluteUrl("/operator")
  }
};

export const dynamic = "force-dynamic";

export default function OperatorPage() {
  return (
    <main className="shell page">
      <OperatorInbox />
    </main>
  );
}
