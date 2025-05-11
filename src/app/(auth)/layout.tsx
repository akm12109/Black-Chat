import { Logo } from '@/components/common/logo';
import { PublicRouteGuard } from '@/components/auth/public-route-guard';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PublicRouteGuard>
      <main className="flex flex-col items-center justify-center min-h-screen p-4 bg-background">
        <div className="mb-12">
          <Logo textSize="text-4xl" iconSize={40} />
        </div>
        <div className="w-full max-w-md">
          {children}
        </div>
      </main>
    </PublicRouteGuard>
  );
}
