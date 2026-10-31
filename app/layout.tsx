import type { Metadata } from "next";
import "./mouvra.css";
import "./responsive.css";
import "./experience.css";
import { StoreProvider } from '@/components/store';
import Storefront from '@/components/Storefront';

export const metadata: Metadata = {
  title: "MOUVRA — искусство точности",
  description: "Игровые мыши с характером. Официальные характеристики, настоящие 3D-модели, сравнение и ваша личная коллекция.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body><StoreProvider><Storefront/>{children}</StoreProvider></body>
    </html>
  );
}
