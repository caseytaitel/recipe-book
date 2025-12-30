import "./globals.css";
import { cookies, headers } from "next/headers";
import { createServerClient } from "@supabase/ssr";
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
  const cookieStore = await cookies();
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || "";

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

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