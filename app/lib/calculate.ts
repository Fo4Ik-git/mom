import type { CalculationResult, Product } from "@/app/types/product";

export function calculate(
  products: Product[],
  quantities: number[],
): CalculationResult {
  let sum = 0;
  let costSum = 0;
  let work = 0;

  products.forEach((product, index) => {
    const count = quantities[index] ?? 0;
    let intermediateSum = 0;
    let consumablesValue = 0;
    const type = product.type ?? "default";

    switch (type) {
      case "consumables":
        consumablesValue = count;
        break;
      case "time":
        work += product.value * count;
        intermediateSum = product.value * count;
        break;
      default:
        intermediateSum = product.value * count;
    }

    const productCost = product.cost * count;
    sum += intermediateSum + consumablesValue;
    costSum += productCost - consumablesValue;
  });

  return {
    profit: sum - costSum,
    cost: costSum,
    cosmetics: sum - work,
    work,
    total: sum,
  };
}
