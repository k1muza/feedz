

'use client';

import { useState, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { TeamMember } from '@/types';
import { saveTeamMember } from '@/app/actions';
import { X, Save, Loader2, ImageIcon, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import Image from 'next/image';

interface TeamFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  member: TeamMember | null;
}

const TeamMemberFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  role: z.string().min(1, 'Role is required'),
  bio: z.string().optional(),
  image: z.string().url('Enter a valid image URL').optional().or(z.literal('')),
  social: z.object({
      linkedin: z.string().url().optional().or(z.literal('')),
      email: z.string().email().optional().or(z.literal(''))
  }).optional()
});

type FormValues = z.infer<typeof TeamMemberFormSchema>;

export const TeamFormModal = ({ isOpen, onClose, onSave, member }: TeamFormModalProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<FormValues>({
    resolver: zodResolver(TeamMemberFormSchema),
  });
  
  const avatarImage = watch('image');

  useEffect(() => {
    if (isOpen) {
      if (member) {
        reset({
          name: member.name,
          role: member.role,
          bio: member.bio,
          image: member.image,
          social: {
            linkedin: member.social?.linkedin || '',
            email: member.social?.email || ''
          }
        });
      } else {
        reset({
          name: '',
          role: '',
          bio: '',
          image: '',
          social: { linkedin: '', email: '' }
        });
      }
      setServerError(null);
    }
  }, [isOpen, member, reset]);

  if (!isOpen) return null;

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    setIsSubmitting(true);
    setServerError(null);
    const result = await saveTeamMember(data, member?.id);
    setIsSubmitting(false);

    if (result.success) {
      onSave();
    } else {
      if (result.errors) {
        setServerError(Object.values(result.errors).flat().join(', '));
      } else {
        setServerError('An unknown error occurred on the server.');
      }
    }
  };
  

  return (
    <>
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-ash-800 border border-ash-700 rounded-lg w-full max-w-lg flex flex-col max-h-[90vh]">
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="p-4 border-b border-ash-700 flex justify-between items-center flex-shrink-0">
            <h3 className="text-lg font-medium text-ash-100">{member ? 'Edit Team Member' : 'Add New Member'}</h3>
            <button type="button" onClick={onClose} className="text-ash-400 hover:text-ash-200">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 flex-grow overflow-y-auto space-y-4">
            {serverError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{serverError}</AlertDescription>
              </Alert>
            )}

            <div>
              <label className="block text-sm font-medium text-ash-300">Profile Image</label>
               <div className="mt-2 flex items-center gap-4">
                  <div className="relative h-16 w-16 rounded-full overflow-hidden bg-ash-700">
                    {avatarImage && /^https:\/\//.test(avatarImage) ? (
                        <Image src={avatarImage} alt="Avatar" fill sizes="64px" className="object-cover" unoptimized />
                    ) : (
                        <ImageIcon className="h-8 w-8 text-ash-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                    )}
                  </div>
                  <input type="url" {...register('image')} placeholder="https://… (optional)" className="flex-1 bg-ash-700 border-ash-600 rounded-md text-sm p-2" />
               </div>
               {errors.image && <p className="text-red-500 text-xs mt-1">{errors.image.message}</p>}
            </div>

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-ash-300">Full Name</label>
              <input id="name" {...register('name')} className="mt-1 block w-full bg-ash-700 border-ash-600 rounded-md p-2" />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
            </div>

            <div>
              <label htmlFor="role" className="block text-sm font-medium text-ash-300">Role</label>
              <input id="role" {...register('role')} className="mt-1 block w-full bg-ash-700 border-ash-600 rounded-md p-2" />
              {errors.role && <p className="text-red-500 text-xs mt-1">{errors.role.message}</p>}
            </div>

             <div>
                <label htmlFor="bio" className="block text-sm font-medium text-ash-300">Bio</label>
                <textarea
                    id="bio"
                    rows={3}
                    {...register('bio')}
                    className="mt-1 block w-full bg-ash-700 border-ash-600 rounded-md p-2"
                    placeholder="A short biography of the team member..."
                />
                {errors.bio && <p className="text-red-500 text-xs mt-1">{errors.bio.message}</p>}
            </div>

            <div>
              <label htmlFor="social.linkedin" className="block text-sm font-medium text-ash-300">LinkedIn URL</label>
              <input id="social.linkedin" {...register('social.linkedin')} className="mt-1 block w-full bg-ash-700 border-ash-600 rounded-md p-2" />
              {errors.social?.linkedin && <p className="text-red-500 text-xs mt-1">{errors.social.linkedin.message}</p>}
            </div>

             <div>
              <label htmlFor="social.email" className="block text-sm font-medium text-ash-300">Email</label>
              <input id="social.email" type="email" {...register('social.email')} className="mt-1 block w-full bg-ash-700 border-ash-600 rounded-md p-2" />
              {errors.social?.email && <p className="text-red-500 text-xs mt-1">{errors.social.email.message}</p>}
            </div>

          </div>

          <div className="p-4 border-t border-ash-700 flex justify-end space-x-3 flex-shrink-0">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-ash-600 rounded-lg hover:bg-ash-700">Cancel</button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-harvest-600 hover:bg-harvest-500 text-ash-950 rounded-lg flex items-center space-x-2 disabled:bg-ash-500"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{isSubmitting ? 'Saving...' : 'Save Member'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
    </>
  );
};
