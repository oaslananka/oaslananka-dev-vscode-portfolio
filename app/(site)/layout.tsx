import Layout from '@/components/Layout';
import { getProfile } from '@/lib/content';
import { buildSiteShellData } from '@/lib/site-shell';

export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getProfile();

  return <Layout shell={buildSiteShellData(profile)}>{children}</Layout>;
}
