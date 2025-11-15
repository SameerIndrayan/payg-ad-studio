export type Product = {
  id: string | number;
  title: string;
  price?: number | null;
  imageUrl?: string | null;
  // add fields if your API returns them (vendor, tags, etc.)
};
