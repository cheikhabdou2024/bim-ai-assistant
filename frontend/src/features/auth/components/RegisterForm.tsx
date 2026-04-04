import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { Button } from '../../../shared/components/ui/Button';
import { Input } from '../../../shared/components/ui/Input';
import { FormField } from '../../../shared/components/forms/FormField';
import { PasswordStrengthBar } from './PasswordStrengthBar';
import { useRegister } from '../hooks/useRegister';

const schema = z.object({
  name: z.string().min(2, 'Minimum 2 caractères').max(100),
  email: z.string().email('Email invalide'),
  password: z.string()
    .min(8, 'Minimum 8 caractères')
    .regex(/[A-Z]/, 'Au moins une majuscule')
    .regex(/\d/, 'Au moins un chiffre'),
});
type FormData = z.infer<typeof schema>;

export function RegisterForm() {
  const form = useForm<FormData>({ resolver: zodResolver(schema) });
  const { register, handleSubmit, formState: { errors }, watch } = form;
  const { mutate: registerUser, isPending, error } = useRegister();
  const password = watch('password', '');

  const onSubmit = (data: FormData) => registerUser(data);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FormField label="Nom complet" error={errors.name?.message} required>
        <Input placeholder="Aliou Diallo" {...register('name')} error={errors.name?.message} />
      </FormField>

      <FormField label="Email" error={errors.email?.message} required>
        <Input type="email" placeholder="vous@exemple.com" {...register('email')} error={errors.email?.message} />
      </FormField>

      <FormField label="Mot de passe" error={errors.password?.message} required>
        <Input type="password" placeholder="••••••••" {...register('password')} error={errors.password?.message} />
        <PasswordStrengthBar password={password} />
      </FormField>

      {error && (
        <p className="text-sm text-red-600">
          {(error as any)?.response?.data?.message || 'Une erreur est survenue'}
        </p>
      )}

      <Button type="submit" loading={isPending} className="w-full">
        Créer mon compte
      </Button>

      <p className="text-center text-sm text-gray-500">
        Déjà un compte ?{' '}
        <Link to="/login" className="text-primary-500 hover:underline font-medium">
          Se connecter
        </Link>
      </p>
    </form>
  );
}
