import { constantEntity } from "@/lib/calculator/schema/entities/constant.entity";
import { calculationEntity } from "@/lib/calculator/schema/entities/calculation.entity";
import { inputEntity } from "@/lib/calculator/schema/entities/input.entity";
import { macroEntity } from "@/lib/calculator/schema/entities/macro.entity";
import { outputEntity } from "@/lib/calculator/schema/entities/output.entity";
import type { ConfigEntityDefinition } from "@/lib/calculator/schema/_definition";

const entities = new Map<string, ConfigEntityDefinition>();

function register(entity: ConfigEntityDefinition) {
  entities.set(entity.keyword, entity);
  if (entity.keyword === "calc") {
    entities.set("calculation", entity);
  }
}

register(inputEntity);
register(constantEntity);
register(macroEntity);
register(calculationEntity);
register(outputEntity);

export function getConfigEntity(keyword: string) {
  return entities.get(keyword);
}

export function getAllConfigEntities() {
  return [inputEntity, constantEntity, macroEntity, calculationEntity, outputEntity];
}

export function matchDeclarationHeader(line: string) {
  const trimmed = line.trim();
  for (const entity of entities.values()) {
    const header = entity.parseHeader(trimmed);
    if (header) {
      return { entity, header, isBlock: trimmed.endsWith("{") };
    }
  }
  return null;
}
