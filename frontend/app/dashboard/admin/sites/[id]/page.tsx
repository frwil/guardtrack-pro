import { redirect } from 'next/navigation';

export default function AdminSiteDetailPage({ params }: { params: { id: string } }) {
  redirect(`/dashboard/superviseur/sites/${params.id}`);
}
