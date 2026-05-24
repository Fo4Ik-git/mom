export type ProductType = "default" | "consumables" | "time";

export interface Product {
  name: string;
  cost: number;
  value: number;
  type?: ProductType;
  presets?: number[];
}

export interface ProductsConfig {
  products: Product[];
}

export interface CalculationResult {
  profit: number;
  cost: number;
  cosmetics: number;
  work: number;
  total: number;
}
