import {
  HighlightStyle,
  StreamLanguage,
  syntaxHighlighting,
} from "@codemirror/language";
import { tags as t } from "@lezer/highlight";

const KEYWORDS =
  /\b(input|constant|calc|calculation|output|property|formula|return|local|include|use|mode|section|presets|highlight|auto_total|time_unit|rows)\b/;
const FUNCTIONS = /\b(IF|SUM|AVG|COUNT|MIN|MAX|SUM_ROWS)\b/;

export const calculatorScriptLanguage = StreamLanguage.define({
  token(stream) {
    if (stream.eatSpace()) {
      return null;
    }
    if (stream.match("//")) {
      stream.skipToEnd();
      return "comment";
    }
    if (stream.match(/"([^"\\]|\\.)*"/)) {
      return "string";
    }
    if (stream.match(KEYWORDS)) {
      return "keyword";
    }
    if (stream.match(FUNCTIONS)) {
      return "function";
    }
    if (stream.match(/\b\d+(\.\d+)?\b/)) {
      return "number";
    }
    if (stream.match(/[{}()=,+\-*/<>!&|?:]/)) {
      return "bracket";
    }
    if (stream.match(/[a-z_][a-z0-9_.]*/i)) {
      return "variableName";
    }
    stream.next();
    return null;
  },
});

const calculatorHighlightStyle = HighlightStyle.define([
  { tag: t.comment, color: "#6a9955", fontStyle: "italic" },
  { tag: t.keyword, color: "#569cd6", fontWeight: "600" },
  { tag: t.function(t.variableName), color: "#dcdcaa" },
  { tag: t.string, color: "#ce9178" },
  { tag: t.number, color: "#b5cea8" },
  { tag: t.variableName, color: "#9cdcfe" },
  { tag: t.bracket, color: "#ffd700" },
]);

export const calculatorScriptHighlight = syntaxHighlighting(
  calculatorHighlightStyle,
  { fallback: true },
);
