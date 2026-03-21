interface PasswordStrengthBarProps { password: string }

function getStrength(password: string): { level: number; label: string; color: string } {
  if (!password) return { level: 0, label: '', color: 'bg-gray-200' };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { level: 1, label: 'Faible', color: 'bg-red-500' };
  if (score === 2) return { level: 2, label: 'Passable', color: 'bg-orange-400' };
  if (score === 3) return { level: 3, label: 'Bon', color: 'bg-yellow-400' };
  return { level: 4, label: 'Fort', color: 'bg-secondary-500' };
}

export function PasswordStrengthBar({ password }: PasswordStrengthBarProps) {
  const { level, label, color } = getStrength(password);
  if (!password) return null;

  return (
    <div className="mt-1 space-y-1">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${i <= level ? color : 'bg-gray-200'}`}
          />
        ))}
      </div>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}
