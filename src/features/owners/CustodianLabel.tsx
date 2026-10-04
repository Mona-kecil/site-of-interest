const explanation =
  "This holder of record may hold shares for clients; the name does not identify the beneficial owner.";

export function CustodianLabel() {
  return (
    <small className="custodian-label" title={explanation}>
      <strong>Custodian or nominee account</strong>
      <span>{explanation}</span>
    </small>
  );
}
