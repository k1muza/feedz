
export type Asset = {
  id: string;
  src: string;
  alt: string;
  type: 'image' | 'video' | 'document';
  tags: string[];
};
