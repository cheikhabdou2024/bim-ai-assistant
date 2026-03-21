import { AuthLayout } from '../../layouts/AuthLayout';
import { LoginForm } from '../../features/auth/components/LoginForm';

export function LoginPage() {
  return (
    <AuthLayout
      title="Bienvenue"
      subtitle="Connectez-vous à votre espace BIM AI"
    >
      <LoginForm />
    </AuthLayout>
  );
}
