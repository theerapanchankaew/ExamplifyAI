import data from './placeholder-images.json';

export type ImagePlaceholder = {
  id: string;
  description: string;
  imageUrl: string;
  imageHint: string;
  priceInCab?: number;
};

export const PlaceHolderImages: ImagePlaceholder[] = data.placeholderImages;
