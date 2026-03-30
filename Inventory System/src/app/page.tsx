import { redirect } from "next/navigation";

export default async function Home() {
  // TODO: Re-enable auth check before production
  // const supabase = await createClient();
  // const { data: { user } } = await supabase.auth.getUser();
  // if (!user) redirect("/login");

  redirect("/inventory");
}
