-- H4: Enforce 0–10000 range for royaltyBasisPoints and platformFeeBasisPoints.
-- Both fields represent basis points (100 bps = 1%), so > 10000 means > 100% which is invalid.
ALTER TABLE "Collection"
  ADD CONSTRAINT chk_royalty_basis_points
    CHECK ("royaltyBasisPoints" IS NULL OR ("royaltyBasisPoints" >= 0 AND "royaltyBasisPoints" <= 10000)),
  ADD CONSTRAINT chk_platform_fee_basis_points
    CHECK ("platformFeeBasisPoints" IS NULL OR ("platformFeeBasisPoints" >= 0 AND "platformFeeBasisPoints" <= 10000));
