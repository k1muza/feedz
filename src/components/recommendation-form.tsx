'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useState } from 'react';
import { Loader2, Leaf, BrainCircuit, AlertCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { getRecommendations } from '@/app/actions';
import type { RecommendIngredientCombinationsOutput } from '@/ai/flows/recommend-ingredient-combinations';
import { Skeleton } from './ui/skeleton';

const formSchema = z.object({
  animalType: z.string().min(1, 'Please select an animal type.'),
  nutritionalGoals: z
    .string()
    .min(10, 'Please describe the nutritional goals in at least 10 characters.')
    .max(500, 'Please keep the description under 500 characters.'),
});

const animalTypes = [
  'Cattle',
  'Poultry',
  'Swine',
  'Aquaculture',
  'Equine',
  'Sheep & Goats',
];

export function RecommendationForm() {
  const [result, setResult] =
    useState<RecommendIngredientCombinationsOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      animalType: '',
      nutritionalGoals: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const recommendation = await getRecommendations(values);
      setResult(recommendation);
    } catch (e) {
      setError('An unexpected error occurred. Please try again.');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <Card className="shadow-xl bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-2xl md:text-3xl font-bold font-headline text-center">
            AI Feed Combination Recommender
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="grid md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="animalType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-lg">Animal Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select an animal type..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {animalTypes.map((animal) => (
                            <SelectItem key={animal} value={animal}>
                              {animal}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        For which animal are you formulating this feed?
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="nutritionalGoals"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-lg">
                        Nutritional Goals
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="e.g., Promote rapid growth in young broilers, support lactation in dairy cows, improve hoof strength in horses..."
                          className="resize-none"
                          rows={4}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-accent text-accent-foreground hover:bg-accent/90 py-6 text-lg"
              >
                {isLoading && (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                )}
                {isLoading ? 'Thinking...' : 'Get Recommendations'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {isLoading && <LoadingSkeleton />}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {result && <ResultsDisplay result={result} />}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardHeader>
        <Skeleton className="h-8 w-3/4" />
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-6 w-1/4" />
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-6 w-32 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-28 rounded-full" />
          </div>
        </div>
        <Separator />
        <div className="space-y-2">
          <Skeleton className="h-6 w-1/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      </CardContent>
    </Card>
  );
}

function ResultsDisplay({
  result,
}: {
  result: RecommendIngredientCombinationsOutput;
}) {
  return (
    <Card className="border-primary shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-bold font-headline text-primary flex items-center gap-2">
          Your AI-Generated Recommendation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="text-xl font-semibold mb-3 flex items-center gap-2 text-primary-foreground/90">
            <Leaf className="h-5 w-5 text-primary" />
            Recommended Ingredients
          </h3>
          <div className="flex flex-wrap gap-2">
            {result.recommendedIngredients.map((ingredient) => (
              <Badge key={ingredient} variant="secondary" className="text-base px-3 py-1">
                {ingredient}
              </Badge>
            ))}
          </div>
        </div>
        <Separator />
        <div>
          <h3 className="text-xl font-semibold mb-3 flex items-center gap-2 text-primary-foreground/90">
            <BrainCircuit className="h-5 w-5 text-primary" />
            AI Reasoning
          </h3>
          <p className="text-muted-foreground whitespace-pre-wrap">
            {result.reasoning}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
