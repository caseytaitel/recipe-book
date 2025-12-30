import { logout } from "@/lib/recipes";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";

export default function NavBar() {
  async function handleLogout() {
    "use server";
    await logout();
    revalidatePath("/", "layout");
    redirect("/");
  }

  return (
    <nav className="h-12 border-b">
      <div className="mx-auto max-w-5xl px-4 h-full flex items-center justify-between">
        <Link href="/recipes" className="text-sm font-medium">
          Recipe Book
        </Link>
        <form action={handleLogout}>
          <button type="submit" className="text-sm">
            Log Out
          </button>
        </form>
      </div>
    </nav>
  );
}

