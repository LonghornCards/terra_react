// src/pages/LandPurchaseAgreementTX.jsx 
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom"; // ✅ for navigation

export default function LandPurchaseAgreementTX() {
  const navigate = useNavigate();

  // ---------- Inline styles (legal document look & layout) ----------
  const styles = {
    root: {
      background: "#f3f4f6",
      padding: "24px",
      boxSizing: "border-box",
    },
    layout: {
      display: "flex",
      gap: 24,
      alignItems: "flex-start",
      flexWrap: "wrap",
    },
    form: {
      flex: "0 0 380px",
      maxWidth: 420,
      width: "100%",
      background: "#ffffff",
      border: "1px solid #e5e7eb",
      borderRadius: 10,
      padding: 16,
      boxShadow: "0 3px 10px rgba(0,0,0,0.06)",
      boxSizing: "border-box",
      fontFamily:
        'system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial, "Noto Sans", "Apple Color Emoji", "Segoe UI Emoji"',
    },
    formTitle: {
      margin: "0 0 8px",
      fontSize: 18,
      fontWeight: 700,
      color: "#111827",
    },
    disclaimer: {
      margin: "0 0 14px",
      fontSize: 13,
      color: "#6b7280",
      background: "#F9FAFB",
      border: "1px dashed #e5e7eb",
      borderRadius: 8,
      padding: "8px 10px",
      lineHeight: 1.45,
    },
    grid: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 12,
    },
    span2: { gridColumn: "1 / -1" },
    label: {
      display: "flex",
      flexDirection: "column",
      fontSize: 13,
      color: "#374151",
      gap: 6,
    },
    input: {
      fontSize: 14,
      padding: "10px 12px",
      border: "1px solid #d1d5db",
      borderRadius: 8,
      outline: "none",
      boxSizing: "border-box",
      background: "#fff",
    },
    textarea: {
      fontSize: 14,
      padding: "10px 12px",
      border: "1px solid #d1d5db",
      borderRadius: 8,
      outline: "none",
      resize: "vertical",
      minHeight: 64,
      boxSizing: "border-box",
      background: "#fff",
    },

    // Document "page"
    document: {
      flex: "1 1 680px",
      background: "#fff",
      border: "1px solid #e5e7eb",
      borderRadius: 12,
      padding: "40px 48px",
      boxShadow: "0 12px 30px rgba(0,0,0,0.08)",
      boxSizing: "border-box",
      maxWidth: 900,
      margin: "0 auto",
      fontFamily: 'Georgia, "Times New Roman", Times, serif',
      color: "#111",
      lineHeight: 1.6,
      fontSize: 16,
    },
    docHeader: {
      textAlign: "center",
      marginBottom: 24,
      paddingBottom: 12,
      borderBottom: "2px solid #111",
    },
    docTitle: {
      margin: 0,
      fontSize: 22,
      letterSpacing: "0.04em",
    },
    jurisdiction: {
      marginTop: 6,
      fontSize: 14,
      fontStyle: "italic",
      color: "#374151",
    },
    paragraph: {
      margin: "12px 0",
      textAlign: "left",
    },
    parties: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 20,
      margin: "10px 0 18px",
      fontSize: 15,
    },
    blank: {
      display: "inline-block",
      minWidth: 120,
      borderBottom: "1px solid #6b7280",
      height: 18,
      verticalAlign: "bottom",
    },
    clauses: {
      margin: "12px 0 24px",
      paddingLeft: 24,
      listStyleType: "decimal",
      listStylePosition: "outside",
    },
    clauseItem: {
      margin: "8px 0",
      textAlign: "left",
    },
    indent: {
      marginTop: 6,
      paddingLeft: 14,
    },
    signatureSection: {
      marginTop: 28,
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 24,
    },
    signatureBox: {
      borderTop: "2px solid #111",
      paddingTop: 12,
      minHeight: 120,
    },
    signatureHeading: {
      fontWeight: 700,
      marginBottom: 10,
      fontSize: 14,
      letterSpacing: "0.02em",
    },
    sigLine: {
      display: "block",
      marginBottom: 6,
    },
    sigInput: {
      width: "100%",
      fontSize: 22,
      padding: "10px 12px",
      border: "1px solid #cbd5e1",
      borderRadius: 8,
      outline: "none",
      boxSizing: "border-box",
      background: "#fff",
      fontFamily: '"Brush Script MT", "Lucida Handwriting", cursive',
      fontStyle: "italic",
      textAlign: "center",
    },
    dateLine: {
      display: "block",
      marginTop: 6,
    },
    dateInput: {
      width: "100%",
      fontSize: 14,
      padding: "10px 12px",
      border: "1px solid #cbd5e1",
      borderRadius: 8,
      outline: "none",
      boxSizing: "border-box",
      background: "#fff",
      fontFamily: 'Georgia, "Times New Roman", Times, serif',
    },
    signatureLabel: {
      fontSize: 12,
      color: "#6b7280",
      marginBottom: 8,
    },
  };
  // ------------------------------------------------------------------

  const [form, setForm] = useState({
    agreementDate: "",
    sellerName: "",
    sellerAddress: "",
    buyerName: "",
    buyerAddress: "",
    propertyDescription: "",
    purchasePrice: "",
    closingDate: "",
    closingLocation: "",
    sellerSignature: "",
    sellerSignatureDate: "",
    buyerSignature: "",
    buyerSignatureDate: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  };

  const formatDate = (iso) => {
    if (!iso) return "___";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "___";
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatPriceDisplay = (val) => {
    const n = Number(String(val).replace(/[^0-9.]/g, ""));
    if (!isFinite(n) || String(val).trim() === "") return "____________";
    return n.toLocaleString(undefined, {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    });
  };

  const onPriceBlur = () => {
    const raw = String(form.purchasePrice).replace(/[^0-9.]/g, "");
    if (raw === "") return;
    const n = Number(raw);
    if (isFinite(n)) {
      setForm((s) => ({ ...s, purchasePrice: n.toFixed(2) }));
    }
  };

  const plainTextAgreement = useMemo(() => {
    const sellerSig = form.sellerSignature || "___________________________";
    const buyerSig = form.buyerSignature || "___________________________";
    const sellerSigDate = form.sellerSignatureDate
      ? formatDate(form.sellerSignatureDate)
      : "__________";
    const buyerSigDate = form.buyerSignatureDate
      ? formatDate(form.buyerSignatureDate)
      : "__________";

    return [
      "LAND PURCHASE AGREEMENT - State of Texas",
      "",
      `Date: ${formatDate(form.agreementDate)}`,
      "",
      `Seller: ${form.sellerName || "________________"}`,
      `Address: ${form.sellerAddress || "________________"}`,
      "",
      `Buyer: ${form.buyerName || "________________"}`,
      `Address: ${form.buyerAddress || "________________"}`,
      "",
      "1. Property",
      "The Seller agrees to sell and the Buyer agrees to buy the following real property located in the State of Texas:",
      `Property Description: ${form.propertyDescription || "________________"}`,
      "",
      "2. Purchase Price",
      `The total purchase price for the property shall be ${formatPriceDisplay(
        form.purchasePrice
      )}, payable in full at closing.`,
      "",
      "3. Closing",
      `The closing of this transaction shall take place on or before ${formatDate(form.closingDate)}${
        form.closingLocation ? ` at ${form.closingLocation}` : ""
      }. At closing, Seller shall deliver a warranty deed conveying good and marketable title to Buyer.`,
      "",
      "4. Taxes",
      "Property taxes shall be prorated as of the date of closing. Buyer shall be responsible for property taxes due after closing.",
      "",
      "5. Condition of Property (“AS IS”)",
      "Buyer accepts the property in its present condition, “AS IS,” with all faults, and acknowledges that Seller makes no warranties, express or implied, regarding the condition, suitability, or future development of the property.",
      "",
      "6. Governing Law",
      "This Agreement shall be governed by and construed in accordance with the laws of the State of Texas.",
      "",
      "7. Entire Agreement",
      "This Agreement contains the entire understanding between the parties and supersedes all prior agreements, written or oral.",
      "",
      `SELLER: ${sellerSig} (Date: ${sellerSigDate})`,
      `BUYER:  ${buyerSig} (Date: ${buyerSigDate})`,
    ].join("\n");
  }, [form]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(plainTextAgreement);
      alert("Agreement text copied to clipboard.");
    } catch {
      alert("Copy failed. Your browser may block clipboard access.");
    }
  };

  const printAgreement = () => {
    const node = document.getElementById("contract-preview");
    if (!node) {
      window.print();
      return;
    }
    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Land Purchase Agreement</title>
          <style>
            @page { margin: 1in; }
            body {
              font-family: Georgia, "Times New Roman", Times, serif;
              color: #111;
              line-height: 1.6;
              font-size: 16px;
            }
            h1 { text-align: center; margin: 0 0 8px; }
            .jurisdiction { text-align: center; font-style: italic; margin-bottom: 16px; color: #374151; }
            ol { padding-left: 24px; list-style-position: outside; }
            li { margin: 8px 0; text-align: left; }
          </style>
        </head>
        <body>
          ${node.outerHTML}
        </body>
      </html>
    `;
    const w = window.open("", "", "width=900,height=650");
    if (w) {
      w.document.open();
      w.document.write(html);
      w.document.close();
      w.focus();
      w.onload = () => {
        w.print();
        w.close();
      };
    }
  };

  return (
    <div className="contract-root" style={styles.root}>
      <div className="contract-layout" style={styles.layout}>
        {/* Left: Form */}
        <section className="contract-form" style={styles.form}>
          <h2 style={styles.formTitle}>Texas Land Purchase Agreement — Fillable Form</h2>
          <p className="contract-disclaimer" style={styles.disclaimer}>
            <strong>Notice:</strong> This template is provided for convenience and does not
            constitute legal advice. For specific situations, consult a Texas real estate attorney
            or title company.
          </p>

          <div className="contract-grid" style={styles.grid}>
            <label style={styles.label}>
              Agreement Date
              <input
                type="date"
                name="agreementDate"
                value={form.agreementDate}
                onChange={handleChange}
                style={styles.input}
              />
            </label>

            <label style={styles.label}>
              Seller Name
              <input
                type="text"
                name="sellerName"
                value={form.sellerName}
                onChange={handleChange}
                placeholder="Full legal name"
                style={styles.input}
              />
            </label>

            <label className="span-2" style={{ ...styles.label, ...styles.span2 }}>
              Seller Address
              <textarea
                name="sellerAddress"
                value={form.sellerAddress}
                onChange={handleChange}
                placeholder="Street, City, State, ZIP"
                rows={2}
                style={styles.textarea}
              />
            </label>

            <label style={styles.label}>
              Buyer Name
              <input
                type="text"
                name="buyerName"
                value={form.buyerName}
                onChange={handleChange}
                placeholder="Full legal name"
                style={styles.input}
              />
            </label>

            <label className="span-2" style={{ ...styles.label, ...styles.span2 }}>
              Buyer Address
              <textarea
                name="buyerAddress"
                value={form.buyerAddress}
                onChange={handleChange}
                placeholder="Street, City, State, ZIP"
                rows={2}
                style={styles.textarea}
              />
            </label>

            <label className="span-2" style={{ ...styles.label, ...styles.span2 }}>
              Property Description (Legal or Parcel Info)
              <textarea
                name="propertyDescription"
                value={form.propertyDescription}
                onChange={handleChange}
                placeholder="Lot, Block, Survey, Abstract, County, or full legal description"
                rows={4}
                style={styles.textarea}
              />
            </label>

            <label style={styles.label}>
              Purchase Price (USD)
              <input
                type="text"
                name="purchasePrice"
                value={form.purchasePrice}
                onChange={handleChange}
                onBlur={onPriceBlur}
                placeholder="e.g., 150000"
                inputMode="decimal"
                style={styles.input}
              />
            </label>

            <label style={styles.label}>
              Closing Date
              <input
                type="date"
                name="closingDate"
                value={form.closingDate}
                onChange={handleChange}
                style={styles.input}
              />
            </label>

            <label className="span-2" style={{ ...styles.label, ...styles.span2 }}>
              Closing Location (Optional)
              <input
                type="text"
                name="closingLocation"
                value={form.closingLocation}
                onChange={handleChange}
                placeholder="e.g., Title company office in Travis County, Texas"
                style={styles.input}
              />
            </label>
          </div>
        </section>

        {/* Right: Document Preview */}
        <section id="contract-preview" className="contract-document" style={styles.document}>
          <header className="doc-header" style={styles.docHeader}>
            <h1 style={styles.docTitle}>LAND PURCHASE AGREEMENT</h1>
            <div className="jurisdiction" style={styles.jurisdiction}>State of Texas</div>
          </header>

          <p style={styles.paragraph}>
            This Land Purchase Agreement (“Agreement”) is made on this{" "}
            <strong>{formatDate(form.agreementDate)}</strong>, by and between:
          </p>

          <div className="parties" style={styles.parties}>
            <div>
              <strong>Seller:</strong>{" "}
              {form.sellerName || <span className="blank" style={styles.blank}>__________________________</span>}
              <br />
              <strong>Address:</strong>{" "}
              {form.sellerAddress ? (
                form.sellerAddress.split("\n").map((line, i) => (
                  <span key={i}>
                    {line}
                    <br />
                  </span>
                ))
              ) : (
                <span className="blank" style={styles.blank}>__________________________</span>
              )}
            </div>

            <div>
              <strong>Buyer:</strong>{" "}
              {form.buyerName || <span className="blank" style={styles.blank}>__________________________</span>}
              <br />
              <strong>Address:</strong>{" "}
              {form.buyerAddress ? (
                form.buyerAddress.split("\n").map((line, i) => (
                  <span key={i}>
                    {line}
                    <br />
                  </span>
                ))
              ) : (
                <span className="blank" style={styles.blank}>__________________________</span>
              )}
            </div>
          </div>

          <ol className="clauses" style={styles.clauses}>
            <li style={styles.clauseItem}>
              <strong>Property.</strong> The Seller agrees to sell and the Buyer agrees to buy the
              following real property located in the State of Texas:
              <div className="indent" style={styles.indent}>
                <em>Property Description:</em>{" "}
                {form.propertyDescription ? (
                  <span>{form.propertyDescription}</span>
                ) : (
                  <span className="blank" style={styles.blank}>______________________________________________</span>
                )}
              </div>
            </li>

            <li style={styles.clauseItem}>
              <strong>Purchase Price.</strong> The total purchase price for the property shall be{" "}
              <strong>{formatPriceDisplay(form.purchasePrice)}</strong>, payable in full at closing.
            </li>

            <li style={styles.clauseItem}>
              <strong>Closing.</strong> The closing of this transaction shall take place on or
              before <strong>{formatDate(form.closingDate)}</strong>
              {form.closingLocation ? (
                <>
                  {" "}
                  at <strong>{form.closingLocation}</strong>
                </>
              ) : null}
              . At closing, Seller shall deliver a warranty deed conveying good and marketable title
              to Buyer.
            </li>

            <li style={styles.clauseItem}>
              <strong>Taxes.</strong> Property taxes shall be prorated as of the date of closing.
              Buyer shall be responsible for property taxes due after closing.
            </li>

            <li style={styles.clauseItem}>
              <strong>Condition of Property (“AS IS”).</strong> Buyer accepts the property in its
              present condition, “AS IS,” with all faults, and acknowledges that Seller makes no
              warranties, express or implied, regarding the condition, suitability, or future
              development of the property.
            </li>

            <li style={styles.clauseItem}>
              <strong>Governing Law.</strong> This Agreement shall be governed by and construed in
              accordance with the laws of the State of Texas.
            </li>

            <li style={styles.clauseItem}>
              <strong>Entire Agreement.</strong> This Agreement contains the entire understanding
              between the parties and supersedes all prior agreements, written or oral.
            </li>
          </ol>

          {/* Signatures */}
          <div className="signature-section" style={styles.signatureSection}>
            <div className="signature-box" style={styles.signatureBox}>
              <div className="signature-heading" style={styles.signatureHeading}>SELLER (Signature &amp; Date)</div>
              <label className="sig-line" style={styles.sigLine}>
                <input
                  className="sig-input"
                  type="text"
                  name="sellerSignature"
                  value={form.sellerSignature}
                  onChange={handleChange}
                  placeholder="Seller signature — type full legal name"
                  aria-label="Seller signature"
                  style={styles.sigInput}
                />
              </label>
              <div className="signature-label" style={styles.signatureLabel}>Signature</div>
              <label className="date-line" style={styles.dateLine}>
                <input
                  className="date-input"
                  type="date"
                  name="sellerSignatureDate"
                  value={form.sellerSignatureDate}
                  onChange={handleChange}
                  aria-label="Seller signing date"
                  style={styles.dateInput}
                />
              </label>
              <div className="signature-label" style={styles.signatureLabel}>Date</div>
            </div>

            <div className="signature-box" style={styles.signatureBox}>
              <div className="signature-heading" style={styles.signatureHeading}>BUYER (Signature &amp; Date)</div>
              <label className="sig-line" style={styles.sigLine}>
                <input
                  className="sig-input"
                  type="text"
                  name="buyerSignature"
                  value={form.buyerSignature}
                  onChange={handleChange}
                  placeholder="Buyer signature — type full legal name"
                  aria-label="Buyer signature"
                  style={styles.sigInput}
                />
              </label>
              <div className="signature-label" style={styles.signatureLabel}>Signature</div>
              <label className="date-line" style={styles.dateLine}>
                <input
                  className="date-input"
                  type="date"
                  name="buyerSignatureDate"
                  value={form.buyerSignatureDate}
                  onChange={handleChange}
                  aria-label="Buyer signing date"
                  style={styles.dateInput}
                />
              </label>
              <div className="signature-label" style={styles.signatureLabel}>Date</div>
            </div>
          </div>
        </section>
      </div>

      {/* ✅ Single bottom bar with ALL actions, consistent styling */}
      <div
        className="contract-actions"
        style={{
          marginTop: 16,
          gap: 12,
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        <button type="button" className="action-btn" onClick={copyToClipboard}>
          Copy Agreement Text
        </button>
        <button type="button" className="action-btn" onClick={printAgreement}>
          Print Agreement
        </button>
        <button type="button" className="action-btn" onClick={() => navigate("/")}>
          Back to Home
        </button>
      </div>
    </div>
  );
}
