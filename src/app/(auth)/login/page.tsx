import { LoginForm } from '@/components/auth/login-form';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Login - Black HAT Commit',
  description: 'Login to your Black HAT Commit account.',
};

export default function LoginPage() {
  return <LoginForm />;
}
