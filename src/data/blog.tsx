// This file is no longer the primary source of data and will be removed in a future step.
// For now, it remains to prevent breaking imports in other files.
// All blog data is now fetched from Firestore via server actions.

import { BlogPost } from "@/types";


// This data is now for fallback or example purposes only.
export const allBlogPosts: BlogPost[] = [
  {
    id: '1',
    slug: 'optimizing-amino-acid-balance',
    title: 'Optimizing Amino Acid Balance in Poultry Diets',
    excerpt: 'Learn how proper amino acid formulation can improve feed efficiency and reduce costs',
    content: `Learn how proper amino acid formulation can improve feed efficiency and reduce costs, by precisely balancing the essential amino acids—especially **lysine**, **methionine**, **threonine**, and **tryptophan**—to match a bird’s true nutritional requirements, you ensure that every gram of feed is converted into muscle rather than wasted.

This targeted formulation sharpens feed conversion ratios, meaning poultry needs less total feed to reach market weight. At the same time, it allows you to replace some high-cost protein ingredients with crystalline amino acids, cutting raw-material expenses.
`,
    image: '/images/blog/blog-1.png',
    category: 'Nutrition',
    tags: ['Amino Acids', 'Poultry', 'Formulation'],
    featured: true,
    date: '2023-11-15',
    readingTime: '8 min read',
    author: {
      name: 'Dr. Sarah Johnson',
      role: 'Poultry Nutritionist',
      image: '/images/authors/doctor.png'
    }
  },
];
