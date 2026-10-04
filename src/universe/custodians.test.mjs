import assert from "node:assert/strict";
import test from "node:test";
import { isCustodianName } from "./owners.mjs";

test("custodian hints recognize real named intermediaries and account qualifiers", () => {
  for (const name of [
    "Bank Of Singapore Limited", "UOB Kay Hian Pte Ltd", "Bank Julius Baer And Co.Ltd",
    "Dbs Bank Ltd Sg-Pb Clients", "Ddbs Bank Ltd Sg S/A PT Persada Capital Investama",
    "Citibank Hong Kong S/A Glencore International Investments Ltd",
    "BOS S/A PT Rajati Alia Kapital", "Nsl-Client Segregated A/C",
    "Pershing Llc Main Custody", "United Overseas Bank Nominees (Private) Limited",
    "Ubs Ag Singapore Non-Treaty Omnibus Account - 2091144090",
    "Clsa Ltd - Client/Trust Account", "Morgan Stanley And Co Intl Plc-Client Ac",
    "Ubs Switzerland Ag-Client Assets -2049584001", "Nbs Clients",
    "Bp2S Sg/Bnp Paribas Singapore Branch Wealth Management",
    "Ctla Safekeeping Account Dksh Holding Lt D", "The Bank Of New York Mellon Dr",
    "Jpmcb Na Aif Clt Re - The Scottish Oriental Smaller Companies Trust Plc",
  ]) assert.equal(isCustodianName(name), true, name);
  assert.equal(isCustodianName("bank of singapore limited"), true);
  assert.equal(isCustodianName("Broker S / A Client"), true);
});

test("custodian hints do not label operating companies, people or generic banks", () => {
  for (const name of [
    "PT Astra International Tbk", "PT Bank Central Asia Tbk", "PT Danantara Asset Management",
    "Banpu Minerals (Singapore) Private Limited", "Government Of Singapore", "Garibaldi Thohir",
    "PT Asabri (Persero)", "General Atlantic Singapore CMR Pte Ltd", "PT Citi Mandiri", "Sarana Asia", "",
  ]) assert.equal(isCustodianName(name), false, name);
});
