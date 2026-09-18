-- Portable reviewed rows for the report artifact.
-- Canonical derivation: node scripts/analyze-empire.mjs data/empires/prajogo

CREATE TEMP VIEW headline_metrics AS
SELECT *
FROM (VALUES (9, 7, 2, 5, 1)) AS metrics(
  "groupMembers",
  "ownershipPaths",
  "affiliationOverlaps",
  "digestionScreens",
  "cashPositiveDigestion"
);

CREATE TEMP VIEW network_roles AS
SELECT *
FROM (VALUES
  ('BREN', 'Yes', 'Control path', 'BRPT → BREN', 'Green Era Energy also holds 22.665%.'),
  ('BRPT', 'Yes', 'Control path', 'Direct', 'Prajogo position reported at 71.37%.'),
  ('CDIA', 'Yes', 'Ownership-connected', 'TPIA → CDIA', 'No all-control path from Prajogo in loaded edges.'),
  ('CUAN', 'Yes', 'Control path', 'Direct', 'No direct mining-site rows returned.'),
  ('NRCA', 'No', 'Downstream of overlap', 'None', 'Reached through SSIA, whose Prajogo path is unproven.'),
  ('PTRO', 'Yes', 'Ownership-connected', 'CUAN → PTRO', 'CUAN 41.5% and KJP 45.328% records conflict in layer/date.'),
  ('RATU', 'Yes', 'Affiliation overlap', 'None', 'RAJA is reported as 68.68% controller.'),
  ('SINI', 'Yes', 'Ownership-connected', 'CUAN → PTRO → SINI', 'KJP also holds 7.9%; its upstream percentage is unavailable.'),
  ('SSIA', 'Yes', 'Affiliation overlap', 'None', 'Barito label without a loaded Prajogo ownership path.'),
  ('TPIA', 'Yes', 'Ownership-connected', 'Direct', 'Direct Prajogo stake is non-controlling; BRPT also holds 34.63%.')
) AS network(
  ticker,
  "groupMember",
  role,
  "ownershipPath",
  "keyCaveat"
);

CREATE TEMP VIEW valuation_screen AS
SELECT *
FROM (VALUES
  ('BREN', 'Multiple digestion', 'Mixed', 156.94, -73.2, 521.6, 55.9, 'Latest YoY quarter', 1.06),
  ('BRPT', 'Breakdown risk', 'Unsupported', 60.31, 61.3, 499.1, -78.9, 'Latest YoY quarter', -29.22),
  ('CDIA', 'Multiple digestion', 'Mixed', 67.57, -34.3, 167.6, 308.5, 'Latest annual', -8.76),
  ('CUAN', 'Multiple digestion', 'Mixed', 39.41, -66.3, 262.5, 64.5, 'Latest YoY quarter', -11.05),
  ('NRCA', 'Multiple digestion', 'Mixed', 7.02, -67.6, NULL, 53.8, 'Latest YoY quarter', -0.03),
  ('PTRO', 'Multiple digestion', 'Mixed', 104.53, -54.3, 861.5, 54.2, 'Latest YoY quarter', -7.53),
  ('RATU', 'Transition', 'Unsupported', 30.55, -70.8, 181.0, 5.7, 'Latest YoY quarter', 0.18),
  ('SINI', 'Breakdown risk', 'Mixed', 28.07, -73.7, 274.8, 46.6, 'Latest YoY quarter', -0.14),
  ('SSIA', 'Breakdown risk', 'Mixed', 16.60, -38.6, NULL, 24.2, 'Latest YoY quarter', -2.69),
  ('TPIA', 'Breakdown risk', 'Unsupported', 75.99, 128.9, 654.9, -88.4, 'Latest YoY quarter', -32.85)
) AS valuations(
  ticker,
  stage,
  readiness,
  "latestPe",
  "peChangePercent",
  "peerPremiumPercent",
  "earningsGrowthPercent",
  "earningsBasis",
  "fcfTrillion"
);

SELECT * FROM headline_metrics;
SELECT * FROM network_roles ORDER BY ticker;
SELECT * FROM valuation_screen ORDER BY "peChangePercent";
