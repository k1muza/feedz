
'use client';

import { useState, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { User } from '@/types';
import { saveUser } from '@/app/actions';
import { useToast } from '../ui/use-toast';
import { X, Save, Loader2, ImageIcon, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { AssetSelectionModal } from './AssetSelectionModal';
import Image from 'next/image';

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  user: User | null;
}

const UserFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  role: z.enum(['Administrator', 'Editor', 'Viewer']),
  image: z.string().url('A valid image URL is required'),
  bio: z.string().optional(),
});

type FormValues = z.infer<typeof UserFormSchema>;

export const UserFormModal = ({ isOpen, onClose, onSave, user }: UserFormModalProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<FormValues>({
    resolver: zodResolver(UserFormSchema),
  });
  
  const avatarImage = watch('image');

  useEffect(() => {
    if (isOpen) {
      if (user) {
        reset({
          name: user.name,
          email: user.email,
          role: user.role,
          image: user.image,
          bio: user.bio,
        });
      } else {
        reset({
          name: '',
          email: '',
          role: 'Editor',
          image: '',
          bio: '',
        });
      }
      setServerError(null);
    }
  }, [isOpen, user, reset]);

  if (!isOpen) return null;

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    setIsSubmitting(true);
    setServerError(null);
    const result = await saveUser(data, user?.id);
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
  
  const handleImageSelect = (src: string) => {
    setValue('image', src, { shouldValidate: true, shouldDirty: true });
    setIsAssetModalOpen(false);
  }

  return (
    <>
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-xl w-full max-w-lg flex flex-col max-h-[90vh]">
        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Header */}
          <div className="p-4 border-b border-gray-700 flex justify-between items-center flex-shrink-0">
            <h3 className="text-lg font-medium text-white">{user ? 'Edit User' : 'Add New User'}</h3>
            <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-200">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Content */}
          <div className="p-6 flex-grow overflow-y-auto space-y-4">
            {serverError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{serverError}</AlertDescription>
              </Alert>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300">Avatar Image</label>
               <div className="mt-2 flex items-center gap-4">
                  <div className="relative h-16 w-16 rounded-full overflow-hidden bg-gray-700">
                    {avatarImage ? (
                        <Image src={avatarImage} alt="Avatar" layout="fill" className="object-cover" />
                    ) : (
                        <ImageIcon className="h-8 w-8 text-gray-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                    )}
                  </div>
                  <button type="button" onClick={() => setIsAssetModalOpen(true)} className="px-3 py-1.5 border border-gray-600 rounded-lg hover:bg-gray-700 text-sm">
                      {avatarImage ? 'Change' : 'Select'} Image
                  </button>
               </div>
               {errors.image && <p className="text-red-500 text-xs mt-1">{errors.image.message}</p>}
            </div>

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-300">Full Name</label>
              <input id="name" {...register('name')} className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md p-2" />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300">Email</label>
              <input id="email" type="email" {...register('email')} className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md p-2" />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-300">Role</label>
              <select id="role" {...register('role')} className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md p-2">
                <option value="Administrator">Administrator</option>
                <option value="Editor">Editor</option>
                <option value="Viewer">Viewer</option>
              </select>
              {errors.role && <p className="text-red-500 text-xs mt-1">{errors.role.message}</p>}
            </div>

             <div>
                <label htmlFor="bio" className="block text-sm font-medium text-gray-300">Bio</label>
                <textarea
                    id="bio"
                    rows={3}
                    {...register('bio')}
                    className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md p-2"
                    placeholder="A short biography of the user..."
                />
                {errors.bio && <p className="text-red-500 text-xs mt-1">{errors.bio.message}</p>}
            </div>

          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-700 flex justify-end space-x-3 flex-shrink-0">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-600 rounded-lg hover:bg-gray-700">Cancel</button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg flex items-center space-x-2 disabled:bg-gray-500"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{isSubmitting ? 'Saving...' : 'Save User'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
    <AssetSelectionModal 
      isOpen={isAssetModalOpen}
      onClose={() => setIsAssetModalOpen(false)}
      onSelect={handleImageSelect}
    />
    </>
  );
};
