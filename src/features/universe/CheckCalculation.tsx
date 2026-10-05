import manifest from "../../../data/universe/manifest.json";
import {
  formatInput,
  inputLabel,
  sourceLine,
  type CheckInput,
  type CheckUnit,
  type Source,
} from "../../universe/presentation.mjs";
import { checkCopy } from "./check-copy";

export function CheckCalculation({
  definition,
  inputs,
}: {
  definition: { id: string; unit: CheckUnit };
  inputs: readonly (CheckInput & { source?: Source | null })[];
}) {
  const retrievedAt =
    inputs.find(({ source }) => source)?.source?.retrievedAt ?? manifest.retrievedAt;
  return (
    <div className="check-calculation">
      <p>{checkCopy[definition.id].formula}</p>
      {inputs.length > 0 && (
        <dl>
          {inputs.map((input, index) => (
            <div key={`${input.field}:${input.key}:${index}`}>
              <dt>{inputLabel(input)}</dt>
              <dd data-reported={input.value !== null}>
                {formatInput(input.value, input.field, definition.unit)}
              </dd>
            </div>
          ))}
        </dl>
      )}
      <p className="check-source">Source: {sourceLine(retrievedAt)}.</p>
    </div>
  );
}
