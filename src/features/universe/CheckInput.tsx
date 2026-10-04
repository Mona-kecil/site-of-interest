import manifest from "../../../data/universe/manifest.json";
import {
  formatInput,
  inputLabel,
  sourceLine,
  type CheckInput as Input,
  type CheckUnit,
  type Source,
} from "../../universe/presentation.mjs";

export function CheckInput({
  input,
  source,
  unit,
}: {
  input: Input;
  source?: Source | null;
  unit: CheckUnit;
}) {
  return (
    <>
      <strong>{inputLabel(input)}</strong>
      {input.label && <p>{input.label}</p>}
      <dl>
        <div>
          <dt>Field</dt>
          <dd>
            <code>{input.field}</code>
          </dd>
        </div>
        <div>
          <dt>Value</dt>
          <dd title={input.value === null ? undefined : String(input.value)}>
            {formatInput(input.value, input.field, unit)}
          </dd>
        </div>
        <div>
          <dt>Source</dt>
          <dd>
            {source ? sourceLine(source, manifest) : `Source not reported: ${input.sourceId}`}
          </dd>
        </div>
        {source && (
          <>
            <div>
              <dt>Retrieved</dt>
              <dd>
                <time dateTime={source.retrievedAt}>{source.retrievedAt}</time>
              </dd>
            </div>
            <div>
              <dt>Endpoint</dt>
              <dd>
                <details className="source-endpoint">
                  <summary>Full endpoint</summary>
                  <code>{source.endpoint}</code>
                </details>
              </dd>
            </div>
          </>
        )}
      </dl>
    </>
  );
}
