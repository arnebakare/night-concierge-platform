import { redirect } from "next/navigation";

export default async function AdminRequestDetailAliasPage({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
  const { id } = await params;
  redirect(`/manager/requests/${id}`);
}
