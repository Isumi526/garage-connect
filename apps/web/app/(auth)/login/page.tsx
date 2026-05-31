import { LoginForm } from '@/components/auth/login-form';

export default function LoginPage({
  searchParams,
}: {
  searchParams: { redirect?: string };
}) {
  const redirect = searchParams.redirect?.startsWith('/') ? searchParams.redirect : '/dashboard';
  return <LoginForm redirect={redirect} />;
}
