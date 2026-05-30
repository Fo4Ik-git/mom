export class FormulaParseError extends Error {
  constructor(
    message: string,
    readonly offset = 0,
  ) {
    super(message);
    this.name = "FormulaParseError";
  }
}
