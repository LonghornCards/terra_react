// src/pages/TexasWarrantyDeed.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function TexasWarrantyDeed() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    deedDate: "",
    grantorName: "",
    grantorAddress: "",
    grantorCityStateZip: "",
    granteeName: "",
    granteeAddress: "",
    granteeCityStateZip: "",
    county: "",
    consideration: "",
    legalDescription: "",
    streetAddress: "",
  });

  // Load/save to localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("txWarrantyDeedForm");
      if (saved) setForm(JSON.parse(saved));
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("txWarrantyDeedForm", JSON.stringify(form));
    } catch {}
  }, [form]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  };

  const formatDateLong = (iso) => {
    if (!iso) return "__________________";
    const d = new Date(iso);
    if (isNaN(+d)) return "__________________";
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const money = useMemo(() => {
    const n = Number(form.consideration);
    if (!Number.isFinite(n) || n <= 0) return "__________________";
    return n.toLocaleString(undefined, {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    });
  }, [form.consideration]);

  const printPage = () => window.print();

  return (
    <div
      className="tx-container"
      style={{ maxWidth: 1100, margin: "0 auto", padding: 20, fontFamily: "Arial, sans-serif", textAlign: "left" }}
    >
      {/* PRINT + SCREEN STYLES */}
      <style>{`
        @page {
          size: Letter;
          margin: 0.5in;
        }

        .tx-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        .no-print { display: inline-flex; }

        @media print {
          html, body {
            background: white !important;
            text-align: left !important;
          }
          .tx-container {
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            text-align: left !important;
          }
          .tx-grid {
            display: block !important;
            grid-template-columns: 1fr !important;
            gap: 0 !important;
            width: 100% !important;
          }
          .form-pane {
            display: none !important;
          }
          .preview-pane {
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            text-align: left !important;
          }
          #print-area {
            box-sizing: border-box !important;
            width: 100% !important;
            padding: 0 !important;
            font-size: 11.5pt !important;
            line-height: 1.28 !important;
            text-align: left !important;
          }
          #print-area h1, #print-area h2, #print-area h3 {
            margin: 6px 0 4px 0 !important;
            line-height: 1.2 !important;
            text-align: left !important;
          }
          #print-area p { margin: 6px 0 !important; text-align: left !important; }
          #print-area .tight-block { margin: 8px 0 !important; padding: 8px !important; text-align: left !important; }
        }
      `}</style>

      <h1 style={{ marginBottom: 10, textAlign: "left" }}>Texas General Warranty Deed</h1>
      <p style={{ marginTop: 0, color: "#555", textAlign: "left" }}>Enter all deed details below.</p>

      <div className="tx-grid">
        {/* LEFT: FORM */}
        <section
          className="form-pane"
          style={{
            border: "1px solid #e0e0e0",
            borderRadius: 10,
            padding: 16,
            background: "#fafafa",
            textAlign: "left",
          }}
        >
          <h2 style={{ marginTop: 0, textAlign: "left" }}>Deed Info</h2>

          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12, textAlign: "left" }}>
            <label>
              <div>Date of Deed</div>
              <input type="date" name="deedDate" value={form.deedDate} onChange={handleChange} style={inp} />
            </label>

            <fieldset style={fs}>
              <legend style={lg}>Grantor (Seller)</legend>
              <label>
                <div>Name</div>
                <input name="grantorName" value={form.grantorName} onChange={handleChange} style={inp} />
              </label>
              <label>
                <div>Address</div>
                <input name="grantorAddress" value={form.grantorAddress} onChange={handleChange} style={inp} />
              </label>
              <label>
                <div>City/State/ZIP</div>
                <input
                  name="grantorCityStateZip"
                  value={form.grantorCityStateZip}
                  onChange={handleChange}
                  style={inp}
                />
              </label>
            </fieldset>

            <fieldset style={fs}>
              <legend style={lg}>Grantee (Buyer)</legend>
              <label>
                <div>Name</div>
                <input name="granteeName" value={form.granteeName} onChange={handleChange} style={inp} />
              </label>
              <label>
                <div>Address</div>
                <input name="granteeAddress" value={form.granteeAddress} onChange={handleChange} style={inp} />
              </label>
              <label>
                <div>City/State/ZIP</div>
                <input
                  name="granteeCityStateZip"
                  value={form.granteeCityStateZip}
                  onChange={handleChange}
                  style={inp}
                />
              </label>
            </fieldset>

            <label>
              <div>County (Texas)</div>
              <input name="county" value={form.county} onChange={handleChange} style={inp} />
            </label>

            <label>
              <div>Consideration (Purchase Price, USD)</div>
              <input
                type="number"
                min="0"
                step="0.01"
                name="consideration"
                value={form.consideration}
                onChange={handleChange}
                style={inp}
              />
            </label>

            <label>
              <div>Street Address of Property (if applicable)</div>
              <input name="streetAddress" value={form.streetAddress} onChange={handleChange} style={inp} />
            </label>

            <label>
              <div>Legal Description of Property</div>
              <textarea
                name="legalDescription"
                value={form.legalDescription}
                onChange={handleChange}
                rows={6}
                style={ta}
                placeholder="Insert complete property description from prior deed or survey."
              />
            </label>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap", textAlign: "left" }}>
            <button type="button" onClick={printPage} className="no-print" style={btn}>
              Print Preview
            </button>
            <button
              type="button"
              className="no-print"
              onClick={() => {
                setForm({
                  deedDate: "",
                  grantorName: "",
                  grantorAddress: "",
                  grantorCityStateZip: "",
                  granteeName: "",
                  granteeAddress: "",
                  granteeCityStateZip: "",
                  county: "",
                  consideration: "",
                  legalDescription: "",
                  streetAddress: "",
                });
              }}
              style={btnGhost}
            >
              Clear
            </button>

            <button
              type="button"
              className="no-print"
              onClick={() => navigate("/")}
              style={{
                padding: "10px 14px",
                borderRadius: 8,
                background: "#28a745",
                color: "white",
                border: "none",
                cursor: "pointer",
              }}
            >
              Back to Home
            </button>
          </div>
        </section>

        {/* RIGHT: PREVIEW */}
        <section
          className="preview-pane"
          style={{
            border: "1px solid #d8d8d8",
            borderRadius: 10,
            padding: 24,
            background: "white",
            textAlign: "left",
          }}
        >
          <div id="print-area" style={{ color: "#222", textAlign: "left" }}>
            <h2 style={{ margin: 0, textTransform: "uppercase", letterSpacing: 0.5, textAlign: "left" }} />

            <p style={{ marginTop: 12, textAlign: "left" }}>
              <strong>Date of Deed:</strong> {formatDateLong(form.deedDate)}
            </p>

            <div className="avoid-break">
              <h3>Grantor (Seller)</h3>
              <p style={p}>
                <strong>Name:</strong> {form.grantorName || "__________________"}
                <br />
                <strong>Address:</strong> {form.grantorAddress || "__________________"}
                <br />
                <strong>City/State/ZIP:</strong> {form.grantorCityStateZip || "__________________"}
              </p>
            </div>

            <div className="avoid-break">
              <h3>Grantee (Buyer)</h3>
              <p style={p}>
                <strong>Name:</strong> {form.granteeName || "__________________"}
                <br />
                <strong>Address:</strong> {form.granteeAddress || "__________________"}
                <br />
                <strong>City/State/ZIP:</strong> {form.granteeCityStateZip || "__________________"}
              </p>
            </div>

            <div className="avoid-break">
              <p style={p}>
                <strong>County:</strong> {form.county || "__________________"}
                <br />
                <strong>Consideration:</strong> {money}
                <br />
                <strong>Street Address (if any):</strong> {form.streetAddress || "__________________"}
              </p>
            </div>

            <div className="avoid-break">
              <h3>Legal Description</h3>
              <div
                className="tight-block"
                style={{
                  whiteSpace: "pre-wrap",
                  minHeight: 80,
                  border: "1px dashed #bbb",
                  padding: 10,
                  borderRadius: 6,
                  textAlign: "left",
                }}
              >
                {form.legalDescription || "Insert complete property description from prior deed or survey."}
              </div>
            </div>

            <hr />

            <div className="avoid-break">
              <h3>Conveyance Clause</h3>
              <p style={p}>
                That I, the undersigned <strong>Grantor</strong>, for and in consideration of the sum above paid by{" "}
                <strong>Grantee</strong>, have GRANTED, SOLD, and CONVEYED, and by these presents do GRANT, SELL, and
                CONVEY unto the said <strong>Grantee</strong>, all that certain real property situated in the County of{" "}
                <em>{form.county || "__________"}</em>, State of Texas, described above.
              </p>
              <p style={p}>
                TO HAVE AND TO HOLD the premises, together with all and singular the rights and appurtenances thereto,
                unto the said <strong>Grantee</strong>, heirs, and assigns forever. And I do hereby bind myself, my heirs,
                executors, and administrators to WARRANT AND FOREVER DEFEND the premises unto the said{" "}
                <strong>Grantee</strong>, heirs, and assigns, against every person lawfully claiming or to claim the same
                or any part thereof.
              </p>
            </div>

            <hr />

            <div className="avoid-break">
              <h3>Signatures</h3>
              <div className="sig-wrap" style={{ marginTop: 8 }}>
                <div>Seller (Grantor) Signature:</div>
                <div style={{ height: 6 }} />
                <div className="sig-line" style={sigLine} />
                <div style={{ height: 4 }} />
                <div>Date:</div>
                <div style={{ height: 6 }} />
                <div className="sig-line" style={sigLineShort} />
              </div>

              <div className="sig-wrap">
                <div>Buyer (Grantee) Signature:</div>
                <div style={{ height: 6 }} />
                <div className="sig-line" style={sigLine} />
                <div style={{ height: 4 }} />
                <div>Date:</div>
                <div style={{ height: 6 }} />
                <div className="sig-line" style={sigLineShort} />
              </div>
            </div>

            <hr />

            <div className="avoid-break">
              <h3>Notary Acknowledgment</h3>
              <p style={{ marginBottom: 6 }}>
                <strong>STATE OF TEXAS</strong>
              </p>
              <p style={{ marginTop: 0 }}>
                <strong>COUNTY OF __________________</strong>
              </p>

              <div
                className="tight-block"
                style={{ border: "1px dashed #bbb", padding: 10, borderRadius: 6, minHeight: 100, textAlign: "left" }}
              >
                <em>
                  Notary section reserved. Complete upon execution: appearance, identity proof, acknowledgment, date,
                  notary signature, seal, and commission expiration.
                </em>
                <div style={{ marginTop: 10 }}>
                  <div className="sig-line" style={sigLine} />
                  <div>Notary Public, State of Texas</div>
                  <div style={{ height: 6 }} />
                  <div className="sig-line" style={sigLineShort} />
                  <div>Commission Expires</div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

/* Inline styles */
const inp = { width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #ccc" };
const ta = { ...inp, resize: "vertical" };
const fs = { border: "1px solid #e0e0e0", borderRadius: 8, padding: "10px 12px" };
const lg = { padding: "0 6px", fontWeight: 600 };
const p = { lineHeight: 1.5, marginTop: 6, marginBottom: 0, textAlign: "left" };
const sigLine = { borderBottom: "1px solid #222", width: "100%", height: 0, marginBottom: 4 };
const sigLineShort = { borderBottom: "1px solid #222", width: 220, height: 0, marginBottom: 4 };
const btn = {
  padding: "10px 14px",
  borderRadius: 8,
  background: "#1f6feb",
  color: "white",
  border: "none",
  cursor: "pointer",
};
const btnGhost = {
  padding: "10px 14px",
  borderRadius: 8,
  background: "white",
  color: "#1f6feb",
  border: "1px solid #1f6feb",
  cursor: "pointer",
};
