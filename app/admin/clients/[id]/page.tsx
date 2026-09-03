import { redirect } from "next/navigation";

export default async function AdminClientDetailAliasPage({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
  const { id } = await params;
  redirect(`/manager/clients/${id}`);
}
