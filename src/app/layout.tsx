import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mag Tuired — When Gods and Monsters Clashed for Ériu",
  description:
    "A browser real-time strategy game of Celtic mythology. Lead the Tuatha Dé Danann, the Fomóire, the Aos Sí, or the Sluagh in the battle for sovereignty over Ireland.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-stone-950 text-stone-100">{children}</body>
    </html>
  );
}
