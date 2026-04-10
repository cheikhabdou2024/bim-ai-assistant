import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const chatSchema = z.object({
  message: z
    .string()
    .min(1, 'Le message ne peut pas être vide')
    .max(4000, 'Le message ne peut pas dépasser 4000 caractères')
    .trim(),
});

export type ChatFormValues = z.infer<typeof chatSchema>;

export function useChatForm() {
  return useForm<ChatFormValues>({
    resolver: zodResolver(chatSchema),
    defaultValues: { message: '' },
  });
}
