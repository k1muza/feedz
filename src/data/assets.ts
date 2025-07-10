
import { Asset } from "@/types/assets";

// This is a mock database for assets.
// In a real application, this data would come from a database or a file storage service like S3.

export let allAssets: Asset[] = [
  {
    id: 'prod-soy-1',
    src: '/images/products/soybean/soy-4.png',
    alt: 'High-protein soybean meal',
    type: 'image',
    tags: ['product', 'soybean', 'protein'],
  },
  {
    id: 'prod-sunflower-1',
    src: '/images/products/sunflower/sunflower.png',
    alt: 'Expeller-pressed sunflower cake',
    type: 'image',
    tags: ['product', 'sunflower', 'protein'],
  },
  {
    id: 'prod-fish-1',
    src: '/images/products/fish/fish.png',
    alt: 'Peruvian fish meal',
    type: 'image',
    tags: ['product', 'fishmeal', 'protein'],
  },
  {
    id: 'prod-corn-1',
    src: '/images/products/corn/corn.png',
    alt: 'Yellow corn grain',
    type: 'image',
    tags: ['product', 'corn', 'energy'],
  },
  {
    id: 'prod-wheat-1',
    src: '/images/products/wheat/wheat.png',
    alt: 'Wheat bran for fiber',
    type: 'image',
    tags: ['product', 'wheat', 'fiber'],
  },
  {
    id: 'prod-dcp-1',
    src: '/images/products/dcp/dcp.png',
    alt: 'Dicalcium phosphate mineral',
    type: 'image',
    tags: ['product', 'dcp', 'mineral'],
  },
  {
    id: 'prod-lysine-1',
    src: '/images/products/lysine/lysine.png',
    alt: 'L-Lysine HCL additive',
    type: 'image',
    tags: ['product', 'lysine', 'additive'],
  },
  {
    id: 'blog-1',
    src: '/images/blog/blog-1.png',
    alt: 'Chicken standing in a field',
    type: 'image',
    tags: ['blog', 'poultry'],
  },
  {
    id: 'blog-2',
    src: '/images/blog/blog-2.png',
    alt: 'Pouring feed into a trough',
    type: 'image',
    tags: ['blog', 'feeding', 'cost-saving'],
  },
  {
    id: 'blog-3',
    src: '/images/blog/blog-3.png',
    alt: 'Corn cobs with mold',
    type: 'image',
    tags: ['blog', 'mycotoxins', 'safety'],
  },
  {
    id: 'author-1',
    src: '/images/authors/doctor.png',
    alt: 'Portrait of Dr. Sarah Johnson',
    type: 'image',
    tags: ['author', 'profile'],
  },
];


// --- Mock API Functions ---

// Function to add a new asset
export const addAsset = (newAsset: Asset) => {
  allAssets.unshift(newAsset); // Add to the beginning of the array
};

// Function to delete an asset
export const deleteAsset = (assetId: string) => {
  allAssets = allAssets.filter(asset => asset.id !== assetId);
};
