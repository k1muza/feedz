
'use client';

import { useState, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Composition, Nutrient } from '@/types';
import { getNutrients } from '@/data/nutrients';
import { updateIngredientCompositions } from '@/app/actions';
import { useToast } from '../ui/use-toast';
import { Trash2, Plus, Loader2, Save, ChevronsUpDown } from 'lucide-react';
import { Button } from '../ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { cn } from '@/lib/utils';

interface NutrientCompositionManagerProps {
  ingredientId: string;
  initialCompositions: Composition[];
  onCompositionChange: () => void;
}

const CompositionFormSchema = z.object({
  nutrientId: z.string().min(1, 'Nutrient is required.'),
  value: z.coerce.number().min(0, 'Value must be a positive number.'),
});

type FormValues = z.infer<typeof CompositionFormSchema>;

export const NutrientCompositionManager = ({
  ingredientId,
  initialCompositions,
  onCompositionChange,
}: NutrientCompositionManagerProps) => {
  const [compositions, setCompositions] = useState<Composition[]>(initialCompositions);
  const [allNutrients, setAllNutrients] = useState<Nutrient[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(CompositionFormSchema),
    defaultValues: {
      nutrientId: '',
      value: 0,
    },
  });

  useEffect(() => {
    const nutrientsData = getNutrients();
    setAllNutrients(nutrientsData);
  }, []);
  
  useEffect(() => {
    setCompositions(initialCompositions);
  }, [initialCompositions]);

  const handleAddComposition: SubmitHandler<FormValues> = async (data) => {
    const newComposition: Composition = {
      nutrientId: data.nutrientId,
      value: data.value,
      nutrient: allNutrients.find(n => n.id === data.nutrientId)
    };
    
    // Avoid adding duplicate nutrients
    if (compositions.some(c => c.nutrientId === newComposition.nutrientId)) {
        toast({ title: "Duplicate Nutrient", description: "This nutrient is already in the list.", variant: "destructive" });
        return;
    }

    const updatedCompositions = [...compositions, newComposition];
    await handleSave(updatedCompositions);
    form.reset();
  };
  
  const handleDeleteComposition = async (nutrientId: string) => {
    const updatedCompositions = compositions.filter(c => c.nutrientId !== nutrientId);
    await handleSave(updatedCompositions);
  };
  
  const handleSave = async (updatedCompositions: Composition[]) => {
      setIsSubmitting(true);
      const result = await updateIngredientCompositions(ingredientId, updatedCompositions);
      setIsSubmitting(false);

      if (result.success) {
          toast({ title: 'Success!', description: 'Nutrient compositions updated.' });
          setCompositions(updatedCompositions);
          onCompositionChange(); // Notify parent to refetch data
      } else {
          toast({ title: 'Error', description: result.error, variant: 'destructive' });
      }
  }

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Manage Nutrient Composition</h3>
      
      {/* Table of existing compositions */}
      <div className="max-h-96 overflow-y-auto mb-6 border border-gray-700 rounded-lg">
        <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-800 sticky top-0">
                <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Nutrient</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Value</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-400 uppercase">Actions</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
                {compositions.map((comp) => (
                    <tr key={comp.nutrientId} className="hover:bg-gray-700/50">
                        <td className="px-4 py-2 text-sm text-white">{comp.nutrient?.name || 'Unknown Nutrient'}</td>
                        <td className="px-4 py-2 text-sm text-gray-400">{comp.value}{comp.nutrient?.unit}</td>
                        <td className="px-4 py-2 text-right">
                            <button onClick={() => handleDeleteComposition(comp.nutrientId)} className="text-red-500 hover:text-red-400 p-1 rounded-md">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </td>
                    </tr>
                ))}
                 {compositions.length === 0 && (
                    <tr>
                        <td colSpan={3} className="text-center py-4 text-gray-500">No compositions added yet.</td>
                    </tr>
                )}
            </tbody>
        </table>
      </div>
      
      {/* Form to add a new composition */}
      <form onSubmit={form.handleSubmit(handleAddComposition)} className="flex flex-col md:flex-row gap-4 items-start">
        <div className="flex-1 w-full">
           <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between bg-gray-700 border-gray-600 hover:bg-gray-600"
                >
                  {form.watch('nutrientId')
                    ? allNutrients.find((n) => n.id === form.watch('nutrientId'))?.name
                    : "Select a nutrient..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput placeholder="Search nutrient..." />
                    <CommandList>
                        <CommandEmpty>No nutrient found.</CommandEmpty>
                        <CommandGroup>
                        {allNutrients.map((nutrient) => (
                            <CommandItem
                            key={nutrient.id}
                            value={nutrient.name}
                            onSelect={() => {
                                form.setValue('nutrientId', nutrient.id)
                                setPopoverOpen(false)
                            }}
                            >
                            {nutrient.name}
                            </CommandItem>
                        ))}
                        </CommandGroup>
                    </CommandList>
                  </Command>
              </PopoverContent>
            </Popover>
          {form.formState.errors.nutrientId && <p className="text-red-500 text-xs mt-1">{form.formState.errors.nutrientId.message}</p>}
        </div>
        <div className="w-full md:w-auto">
          <input 
            type="number"
            step="any"
            placeholder="Value"
            {...form.register('value')}
            className="w-full bg-gray-700 border-gray-600 rounded-md p-2"
          />
          {form.formState.errors.value && <p className="text-red-500 text-xs mt-1">{form.formState.errors.value.message}</p>}
        </div>
        <Button type="submit" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-500 w-full md:w-auto">
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin"/> : <Plus className="w-4 h-4" />}
          <span className="ml-2">Add</span>
        </Button>
      </form>
    </div>
  );
};

