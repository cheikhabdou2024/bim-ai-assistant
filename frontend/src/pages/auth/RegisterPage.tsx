import { AuthLayout } from '../../layouts/AuthLayout';
import { RegisterForm } from '../../features/auth/components/RegisterForm';

export function RegisterPage() {
  return (
    <AuthLayout
      title="Créer un compte"
      subtitle="Rejoignez BIM AI Assistant"
    >
      <RegisterForm />
    </AuthLayout>
  );
}
