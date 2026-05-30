import type { Product } from "@/app/types/product";
import { QuantityInput } from "@/app/components/calculator/quantity-input";

interface ProductItemProps {
  product: Product;
  index: number;
  value: number;
  onChange: (value: number) => void;
  presetsLabel?: string;
}

export function ProductItem({
  product,
  index,
  value,
  onChange,
  presetsLabel = "Suggestions",
}: ProductItemProps) {
  const inputId = `product-${index}`;
  const listId = product.presets ? `presets-${index}` : undefined;

  return (
    <div className="group">
      <label
        htmlFor={inputId}
        className="mb-2 block text-sm font-medium text-foreground"
      >
        {product.name}
      </label>
      <QuantityInput
        id={inputId}
        value={value}
        list={listId}
        onChange={onChange}
        className="block h-11 w-full rounded-xl border border-border bg-input px-3.5 text-sm text-foreground shadow-sm transition placeholder:text-muted-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-ring/30"
      />
      {product.presets && (
        <>
          <datalist id={listId}>
            {product.presets.map((preset) => (
              <option key={preset} value={preset} />
            ))}
          </datalist>
          <p className="mt-2 text-xs text-muted-foreground">
            {presetsLabel}: {product.presets.join(", ")}
          </p>
        </>
      )}
    </div>
  );
}
