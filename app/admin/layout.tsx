import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin',
  robots: { index: false, follow: false },
};

// Admin renders outside the portfolio chrome. The shell (nav) lives in the
// (panel) route group so the /admin/login page can stay chrome-free.
export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
