import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function DashboardRedirectPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  switch (user.role) {
    case "ADMIN":
      redirect("/admin");
    case "REGULATOR":
      redirect("/regulator");
    case "INDUSTRY":
      redirect("/industry");
    case "GROUNDWATER_OFFICER":
      redirect("/groundwater");
    case "CITIZEN":
      redirect("/citizen");
    default:
      redirect("/login");
  }
}
