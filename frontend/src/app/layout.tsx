import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "../contexts/AuthContext";
import { Toaster } from "react-hot-toast";

const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
});

export const metadata: Metadata = {
  title: "Rent Management System",
  description: "A comprehensive rental property management system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${figtree.variable} font-sans antialiased`}>
        <AuthProvider>
          {children}
          <Toaster position="top-right" />
        </AuthProvider>
      </body>
    </html>
  );
}
