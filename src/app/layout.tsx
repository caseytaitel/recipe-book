import "./globals.css";
import { cookies, headers } from "next/headers";
import { createSupabaseServerReadClient } from "@/lib/supabase/server";
import NavBar from "./NavBar";

export const metadata = {
  title: "Recipe Book",
  description: "Recipe organizer",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerReadClient();
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || "";

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const showNavBar =
    user && pathname !== "/" && pathname !== "/login" && pathname !== "/signup";

  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-slate-900">
        {showNavBar && <NavBar />}
        <div className="mx-auto max-w-5xl px-4 py-6">{children}</div>
      </body>
    </html>
  );
}