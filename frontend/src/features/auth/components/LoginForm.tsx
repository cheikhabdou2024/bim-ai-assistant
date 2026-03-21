import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { Button } from '../../../shared/components/ui/Button';
import { Input } from '../../../shared/components/ui/Input';
import { FormField } from '../../../shared/components/forms/FormField';
import { useLogin } from '../hooks/useLogin';

const schema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
});
type FormData = z.infer<typeof schema>;

export function LoginForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });
  const { mutate: login, isPending, error } = useLogin();

  const onSubmit = (data: FormData) => login(data);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FormField label="Email" error={errors.email?.message} required>
        <Input type="email" placeholder="vous@exemple.com" {...register('email')} error={errors.email?.message} />
      </FormField>

      <FormField label="Mot de passe" error={errors.password?.message} required>
        <Input type="password" placeholder="••••••••" {...register('password')} error={errors.password?.message} />
      </FormField>

      {error && (
        <p className="text-sm text-red-600">
          {(error as any)?.response?.data?.message || 'Identifiants incorrects'}
        </p>
      )}

      <Button type="submit" loading={isPending} className="w-full">
        Se connecter
      </Button>

      <p className="text-center text-sm text-gray-500">
        Pas encore de compte ?{' '}
        <Link to="/register" className="text-primary-500 hover:underline font-medium">
          Créer un compte
        </Link>
      </p>
    </form>
  );
}
