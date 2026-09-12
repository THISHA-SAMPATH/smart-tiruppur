"use client";

import { useState } from "react";
import Link from "next/link";

interface Coupon {
  id: string;
  brand: string;
  discount: string;
  pointsCost: number;
  claimed: boolean;
  code: string;
}

export default function CitizenEcoRewardsSection() {
  const [userPoints, setUserPoints] = useState<number>(450);
  const [coupons, setCoupons] = useState<Coupon[]>([
    {
      id: "c_01",
      brand: "Tiruppur Organic Cotton Co.",
      discount: "15% OFF Garments",
      pointsCost: 150,
      claimed: false,
      code: "GREEN-TIRUPPUR-15",
    },
    {
      id: "c_02",
      brand: "EcoWeave Apparel Outlet",
      discount: "20% OFF Sustainable Knitwear",
      pointsCost: 250,
      claimed: false,
      code: "ECO-WEAVE-20",
    },
    {
      id: "c_03",
      brand: "Noyyal Clean Fiber Retail",
      discount: "₹500 Flat Voucher",
      pointsCost: 400,
      claimed: false,
      code: "NOYYAL-500-FREE",
    },
  ]);

  const claimCoupon = (couponId: string) => {
    setCoupons((prev) =>
      prev.map((c) => {
        if (c.id === couponId && userPoints >= c.pointsCost && !c.claimed) {
          setUserPoints((pts) => pts - c.pointsCost);
          return { ...c, claimed: true };
        }
        return c;
      })
    );
  };

  return (
    <div className="card" style={{ marginBottom: "24px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "12px",
          marginBottom: "16px",
        }}
      >
        <div>
          <span className="mono small" style={{ color: "#eab308", fontWeight: 700 }}>
            🎟️ SHOPPING REWARDS & GAMIFICATION
          </span>
          <h3 style={{ fontSize: "20px", margin: "4px 0 2px" }}>
            Garment Eco-Discounts & Sentinel Badges
          </h3>
          <p className="small muted" style={{ margin: 0 }}>
            Scan garment QR codes or participate in civic reports to earn Green Points & redeem shopping vouchers.
          </p>
        </div>

        {/* Green Points Balance Badge */}
        <div
          style={{
            background: "linear-gradient(135deg, #15803d 0%, #166534 100%)",
            color: "#ffffff",
            padding: "8px 16px",
            borderRadius: "8px",
            textAlign: "right",
            boxShadow: "0 4px 12px rgba(21, 128, 61, 0.25)",
          }}
        >
          <span style={{ fontSize: "11px", textTransform: "uppercase", opacity: 0.9 }}>
            My Green Balance
          </span>
          <p style={{ fontSize: "22px", fontWeight: 800, margin: "2px 0 0" }}>
            {userPoints} <span style={{ fontSize: "12px" }}>PTS</span>
          </p>
        </div>
      </div>

      {/* Sentinel Gamified Badges Grid */}
      <div style={{ marginBottom: "20px" }}>
        <p className="small muted" style={{ margin: "0 0 10px", fontWeight: 600 }}>
          🏆 Your Civic Sentinel Badges:
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
            gap: "10px",
          }}
        >
          <div
            style={{
              background: "var(--paper)",
              padding: "10px",
              borderRadius: "6px",
              border: "1px solid #eab308",
              textAlign: "center",
            }}
          >
            <span style={{ fontSize: "24px" }}>🥇</span>
            <p style={{ fontSize: "12px", fontWeight: 700, margin: "4px 0 0" }}>
              Noyyal Guardian
            </p>
            <span className="small muted" style={{ fontSize: "10px" }}>
              Level 3 Active
            </span>
          </div>

          <div
            style={{
              background: "var(--paper)",
              padding: "10px",
              borderRadius: "6px",
              border: "1px solid var(--indigo-soft)",
              textAlign: "center",
            }}
          >
            <span style={{ fontSize: "24px" }}>👗</span>
            <p style={{ fontSize: "12px", fontWeight: 700, margin: "4px 0 0" }}>
              DPP Scanner
            </p>
            <span className="small muted" style={{ fontSize: "10px" }}>
              5 Garments Scanned
            </span>
          </div>

          <div
            style={{
              background: "var(--paper)",
              padding: "10px",
              borderRadius: "6px",
              border: "1px solid var(--hairline)",
              textAlign: "center",
            }}
          >
            <span style={{ fontSize: "24px" }}>🛡️</span>
            <p style={{ fontSize: "12px", fontWeight: 700, margin: "4px 0 0" }}>
              Verified Reporter
            </p>
            <span className="small muted" style={{ fontSize: "10px" }}>
              2 Reports Logged
            </span>
          </div>
        </div>
      </div>

      {/* Redeemable Garment Discount Coupons */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "10px" }}>
          <p className="small muted" style={{ margin: 0, fontWeight: 600 }}>
            🏷️ Redeem Points for Garment Brand Coupons:
          </p>
          <Link href="/verify" className="small" style={{ color: "#4f46e5", textDecoration: "none", fontWeight: 600 }}>
            + Earn more points by scanning DPP QR tags →
          </Link>
        </div>

        <div
          className="grid"
          style={{
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "12px",
          }}
        >
          {coupons.map((c) => (
            <div
              key={c.id}
              style={{
                background: "var(--paper)",
                padding: "12px 14px",
                borderRadius: "6px",
                border: "1px solid var(--hairline)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div>
                <span className="small muted" style={{ fontSize: "11px", fontWeight: 700 }}>
                  {c.brand}
                </span>
                <p style={{ fontSize: "15px", fontWeight: 700, margin: "4px 0 6px", color: "var(--indigo-bright, #818cf8)" }}>
                  {c.discount}
                </p>
              </div>

              {c.claimed ? (
                <div style={{ marginTop: "10px", padding: "6px", background: "rgba(34,197,94,0.1)", borderRadius: "4px", textAlign: "center" }}>
                  <span className="mono small" style={{ fontWeight: 700, color: "#166534" }}>
                    CODE: {c.code}
                  </span>
                </div>
              ) : (
                <button
                  className="btn"
                  onClick={() => claimCoupon(c.id)}
                  disabled={userPoints < c.pointsCost}
                  style={{
                    marginTop: "10px",
                    width: "100%",
                    padding: "6px 10px",
                    fontSize: "12px",
                  }}
                >
                  {userPoints >= c.pointsCost
                    ? `Claim Coupon (${c.pointsCost} PTS)`
                    : `Need ${c.pointsCost - userPoints} More PTS`}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
