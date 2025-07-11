import { Asset } from "@/types/assets";

// This is a mock database for assets.
// In a real application, this data would come from a database or a file storage service like S3.

// THIS FILE IS NOW DEPRECATED AND WILL BE REMOVED.
// ASSETS ARE FETCHED DIRECTLY FROM S3 VIA A SERVER ACTION.

export let allAssets: Asset[] = [];


// --- Mock API Functions ---

// Function to add a new asset
export const addAsset = (newAsset: Asset) => {
  allAssets.unshift(newAsset); // Add to the beginning of the array
};

// Function to delete an asset
export const deleteAsset = (assetId: string) => {
  allAssets = allAssets.filter(asset => asset.id !== assetId);
};
