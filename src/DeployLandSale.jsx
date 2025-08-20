// src/DeployLandSale.jsx
import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ethers } from "ethers";

/**
 * Customer-friendly Land Sale — Execute (ETH · USDT · USDC · BTC)
 * - Admin pre-deploys contract; app auto-loads ABI & address per network.
 * - Customer only selects payment, enters postal details, and pays.
 * - This page now collects the SELLER's wallet (to receive funds off-chain / for records).
 */

// ---- Minimal ABIs ----
const SALE_ABI = [
  // Native ETH
  "function executeSale(address buyer, string tokenURI) payable returns (uint256)",
  "function mintDeed(address to, string tokenURI) payable returns (uint256)",
  // ERC-20
  "function executeSaleERC20(address buyer, string tokenURI, address token, uint256 amount) returns (uint256)",
  "function mintDeedERC20(address to, string tokenURI, address token, uint256 amount) returns (uint256)",
];

// ERC-20 interface for approve/decimals
const ERC20_ABI = [
  "function approve(address spender, uint256 value) public returns (bool)",
  "function decimals() view returns (uint8)",
];

// ---- Known token addresses by chain ----
const TOKEN_ADDRESSES = {
  "1": {
    USDT: { address: "0xdAC17F958D2ee523a2206206994597C13D831ec7", decimals: 6 },
    USDC: { address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606EB48", decimals: 6 },
  },
  // "11155111": { USDT: {...}, USDC: {...} } // add your testnet tokens if needed
};

// ---- Predeployed contract addresses by chain (REPLACE with your addresses) ----
const PRESET_CONTRACTS = {
  // Ethereum mainnet
  "1": "0xYourMainnetContractAddressHere",
  // Example testnet:
  // "11155111": "0xYourSepoliaContractAddressHere",
};

export default function DeployLandSale() {
  // ----------- FORM (customer inputs) -----------
  const [form, setForm] = useState({
    legalDescription: "",
    streetAddress: "",
    county: "",

    assetType: "ETH", // "ETH" | "USDT" | "USDC" | "BTC"
    priceEth: "",
    priceUsdt: "",
    priceUsdc: "",
    priceBtc: "",

    // Wallet + metadata
    sellerWallet: "",      // ← renamed & repurposed
    tokenURI: "",
    autoMetadata: true,    // auto-generate tokenURI (on by default)

    // Postal party details
    sellerName: "",
    sellerAddress: "",
    buyerName: "",
    buyerAddressPostal: "",

    // Auto dates (grayed out for customer)
    effectiveDate: "",
    closingDate: "",
  });

  function onChange(e) {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  }

  // ----------- Wallet / Network -----------
  const [account, setAccount] = useState("");
  const [chainId, setChainId] = useState("");
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);

  const [status, setStatus] = useState("");

  async function connectWallet() {
    try {
      if (!window.ethereum) {
        alert("Please install MetaMask or a compatible wallet.");
        return;
      }
      const _provider = new ethers.BrowserProvider(window.ethereum);
      await _provider.send("eth_requestAccounts", []);
      const _signer = await _provider.getSigner();
      const _network = await _provider.getNetwork();
      const addr = await _signer.getAddress();

      setProvider(_provider);
      setSigner(_signer);
      setAccount(addr);
      const cid = _network.chainId.toString();
      setChainId(cid);

      // Auto-attach contract for this network
      const preset = PRESET_CONTRACTS[cid];
      if (preset && ethers.isAddress(preset)) {
        setContractAddress(preset);
        setAbi(SALE_ABI);
        setStatus(`Connected. Contract auto-selected for chainId ${cid}.`);
      } else {
        setStatus(
          `Connected. No preset contract for chainId ${cid}. (Admin can set one in PRESET_CONTRACTS.)`
        );
      }
    } catch (e) {
      setStatus(e?.message || "Wallet connection failed.");
    }
  }

  // ----------- Contract state -----------
  const [abi, setAbi] = useState(SALE_ABI); // default to minimal ABI
  const [contractAddress, setContractAddress] = useState("");
  const [deployTxHash, setDeployTxHash] = useState("");

  // Admin-only toggle: show advanced controls (deploy/paste artifact)
  const [adminMode, setAdminMode] = useState(false);

  // ----------- Auto tokenURI (metadata) -----------
  const autoTokenURI = useMemo(() => {
    // Build a small JSON metadata object from current form values
    const meta = {
      name: `Land Deed — ${form.streetAddress || "Property"}`,
      description:
        "On-chain deed representing a land purchase. This is example metadata; replace with your IPFS workflow as needed.",
      attributes: [
        { trait_type: "County", value: form.county || "N/A" },
        { trait_type: "Seller", value: form.sellerName || "N/A" },
        { trait_type: "Buyer", value: form.buyerName || "N/A" },
        { trait_type: "Seller Wallet", value: form.sellerWallet || "N/A" }, // ← updated label
        { trait_type: "Payment Asset", value: form.assetType },
      ],
    };
    const json = JSON.stringify(meta);
    const base64 =
      typeof window !== "undefined"
        ? window.btoa(unescape(encodeURIComponent(json)))
        : Buffer.from(json, "utf8").toString("base64");
    return `data:application/json;base64,${base64}`;
  }, [
    form.streetAddress,
    form.county,
    form.sellerName,
    form.buyerName,
    form.sellerWallet,
    form.assetType,
  ]);

  const effectiveTokenURI = form.autoMetadata ? autoTokenURI : form.tokenURI;

  // ----------- Execute (mint) -----------
  const [execTxHash, setExecTxHash] = useState("");
  const [btcInvoice, setBtcInvoice] = useState(null);
  const [btcQr, setBtcQr] = useState("");
  const [btcPolling, setBtcPolling] = useState(false);
  const [ethereumTxFromBtc, setEthereumTxFromBtc] = useState("");

  async function executeSaleMint() {
    try {
      if (!signer) throw new Error("Connect wallet first.");
      if (!ethers.isAddress(contractAddress))
        throw new Error("No contract for this network. (Admin must configure PRESET_CONTRACTS.)");
      if (!account || !ethers.isAddress(account))
        throw new Error("Buyer (connected wallet) is not available.");

      if (!effectiveTokenURI) throw new Error("Missing tokenURI.");

      const contract = new ethers.Contract(contractAddress, abi || [], signer);

      // ---- Native ETH ----
      if (form.assetType === "ETH") {
        const price = Number(form.priceEth);
        if (!Number.isFinite(price) || price <= 0) throw new Error("Enter a positive ETH amount.");
        const valueWei = ethers.parseEther(String(price));

        let tx;
        if (typeof contract.executeSale === "function") {
          tx = await contract.executeSale(account, effectiveTokenURI, { value: valueWei });
        } else if (typeof contract.mintDeed === "function") {
          tx = await contract.mintDeed(account, effectiveTokenURI, { value: valueWei });
        } else {
          throw new Error("Contract missing executeSale/mintDeed for native ETH.");
        }

        // Auto-set dates (UI side); authoritative date is block.timestamp on-chain
        const nowIso = new Date().toISOString();
        setForm((s) => ({ ...s, effectiveDate: nowIso, closingDate: nowIso }));

        setStatus("Submitting ETH transaction…");
        const rcpt = await tx.wait();
        setExecTxHash(rcpt.hash);
        setStatus("Sale executed. Deed NFT minted.");
        return;
      }

      // ---- ERC-20 (USDT/USDC) ----
      if (form.assetType === "USDT" || form.assetType === "USDC") {
        const tmap = TOKEN_ADDRESSES[chainId] || {};
        const conf = tmap[form.assetType];
        if (!conf?.address) throw new Error(`${form.assetType} not configured for chainId ${chainId}.`);

        const token = new ethers.Contract(conf.address, ERC20_ABI, signer);
        const decimals = conf.decimals ?? (await token.decimals?.().catch(() => 6)) ?? 6;
        const amountStr = form.assetType === "USDT" ? form.priceUsdt : form.priceUsdc;
        const value = ethers.parseUnits(String(amountStr), decimals);
        if (value <= 0n) throw new Error(`Enter a positive ${form.assetType} amount.`);

        setStatus(`Approving ${form.assetType}…`);
        const approveTx = await token.approve(contractAddress, value);
        await approveTx.wait();

        let tx;
        if (typeof contract.executeSaleERC20 === "function") {
          tx = await contract.executeSaleERC20(account, effectiveTokenURI, conf.address, value);
        } else if (typeof contract.mintDeedERC20 === "function") {
          tx = await contract.mintDeedERC20(account, effectiveTokenURI, conf.address, value);
        } else {
          throw new Error("Contract missing executeSaleERC20/mintDeedERC20.");
        }

        const nowIso = new Date().toISOString();
        setForm((s) => ({ ...s, effectiveDate: nowIso, closingDate: nowIso }));

        setStatus(`Submitting ${form.assetType} transaction…`);
        const rcpt = await tx.wait();
        setExecTxHash(rcpt.hash);
        setStatus("Sale executed. Deed NFT minted.");
        return;
      }

      // ---- BTC rail (via backend) ----
      if (form.assetType === "BTC") {
        setStatus("Use the BTC rail buttons below to create invoice and finalize after confirmation.");
        return;
      }

      throw new Error("Unsupported asset type.");
    } catch (e) {
      setStatus(e?.message || "Execution failed.");
    }
  }

  const invoiceMemo = useMemo(() => {
    const addr = form.streetAddress || "—";
    const county = form.county || "—";
    let price =
      form.assetType === "ETH"
        ? form.priceEth || "—"
        : form.assetType === "USDT"
        ? form.priceUsdt || "—"
        : form.assetType === "USDC"
        ? form.priceUsdc || "—"
        : form.assetType === "BTC"
        ? form.priceBtc || "—"
        : "—";
    return `LandSale: ${addr}, ${county} County | Price: ${price} ${form.assetType}`;
  }, [
    form.streetAddress,
    form.county,
    form.assetType,
    form.priceEth,
    form.priceUsdt,
    form.priceUsdc,
    form.priceBtc,
  ]);

  async function createBtcInvoice() {
    try {
      if (!account || !ethers.isAddress(account))
        throw new Error("Connect a wallet (buyer) before creating BTC invoice.");
      const btcAmt = Number(form.priceBtc);
      if (!Number.isFinite(btcAmt) || btcAmt <= 0) throw new Error("Enter a positive BTC amount.");

      const res = await fetch("/api/btc/create-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountBtc: String(btcAmt),
          buyerAddress: account, // mint recipient handled as connected buyer
          memo: invoiceMemo,
          // You may also send form.sellerWallet to backend if needed for payout routing
          sellerWallet: form.sellerWallet || null,
        }),
      });
      if (!res.ok) throw new Error("Server refused BTC invoice creation.");
      const data = await res.json();
      setBtcInvoice(data);
      const uri = data.uri || `bitcoin:${data.address}`;
      setBtcQr(
        `https://api.qrserver.com/v1/create-qr-code/?qzone=1&size=440x440&data=${encodeURIComponent(
          uri
        )}`
      );
      setStatus("BTC invoice created. Awaiting confirmation…");
    } catch (e) {
      setStatus(e?.message || "Failed to create BTC invoice.");
    }
  }

  async function pollBtcAndFinalize() {
    try {
      if (!btcInvoice?.id) throw new Error("No BTC invoice to poll.");
      if (!ethers.isAddress(contractAddress))
        throw new Error("No contract address set.");
      // In a real flow your backend mints with the correct tokenURI (build it server-side too)
      const fin = await fetch("/api/btc/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: btcInvoice.id,
          buyerAddress: account,         // mint to connected buyer
          tokenURI: effectiveTokenURI,
          contractAddress,
          sellerWallet: form.sellerWallet || null, // optional metadata
        }),
      });
      if (!fin.ok) throw new Error("Finalize failed on backend.");
      const out = await fin.json(); // { ethereumTxHash }
      setEthereumTxFromBtc(out.ethereumTxHash || "");
      const nowIso = new Date().toISOString();
      setForm((s) => ({ ...s, effectiveDate: nowIso, closingDate: nowIso }));
      setStatus("BTC confirmed. Backend minted deed NFT on Ethereum.");
    } catch (e) {
      setStatus(e?.message || "BTC status check/finalize failed.");
    }
  }

  const planSummary = useMemo(() => {
    switch (form.assetType) {
      case "ETH":
        return "Mint deed by paying in ETH (native) — payable contract call.";
      case "USDT":
        return "Mint deed by paying in USDT — approve then contract call (ERC-20).";
      case "USDC":
        return "Mint deed by paying in USDC — approve then contract call (ERC-20).";
      case "BTC":
        return "Mint deed after BTC on-chain confirmation — backend triggers the Ethereum mint.";
      default:
        return "";
    }
  }, [form.assetType]);

  return (
    <div style={styles.container}>
      {/* Toolbar */}
      <div style={styles.toolbar}>
        <Link to="/" style={{ ...styles.btn, ...styles.backBtn }}>← Back to Home</Link>

        <div style={styles.toolRight}>
          <button style={styles.btn} onClick={connectWallet}>
            {account ? `Connected ✓ ${short(account)}` : "Connect Wallet"}
          </button>
          <div style={styles.walletMini}>
            <span><strong>Network:</strong> chainId {chainId || "?"}</span>
            <span><strong>Payment:</strong> {form.assetType}</span>
          </div>
        </div>
      </div>

      <h1 style={styles.h1}>Land Sale — Execute (Customer Mode)</h1>
      <p style={styles.muted}>{planSummary}</p>

      <div style={styles.grid2}>
        {/* LEFT: Customer form */}
        <section style={styles.card}>
          <h2 style={styles.h2}>1) Contract & Payment Details</h2>

          <form onSubmit={(e) => e.preventDefault()} style={styles.form}>
            {/* Property references */}
            <label style={styles.label}>
              <span>Legal Description (reference)</span>
              <textarea
                rows={3}
                name="legalDescription"
                value={form.legalDescription}
                onChange={onChange}
                placeholder="Abstract/lot/block, metes & bounds, subdivision, etc."
                style={styles.textarea}
              />
            </label>

            <label style={styles.label}>
              <span>Street Address (reference)</span>
              <input
                name="streetAddress"
                value={form.streetAddress}
                onChange={onChange}
                placeholder="123 Ranch Rd, Town, TX"
                style={styles.input}
              />
            </label>

            <label style={styles.label}>
              <span>County (reference)</span>
              <input
                name="county"
                value={form.county}
                onChange={onChange}
                placeholder="e.g., Travis"
                style={styles.input}
              />
            </label>

            {/* Parties */}
            <div style={{ display: "grid", gap: 10 }}>
              <label style={styles.label}>
                <span>Seller Name</span>
                <input name="sellerName" value={form.sellerName} onChange={onChange} style={styles.input} />
              </label>

              <label style={styles.label}>
                <span>Seller Address (postal)</span>
                <input name="sellerAddress" value={form.sellerAddress} onChange={onChange} style={styles.input} />
              </label>

              {/* ← NEW POSITION & LABEL */}
              <label style={styles.label}>
                <span>Seller Address (wallet)</span>
                <input
                  name="sellerWallet"
                  value={form.sellerWallet}
                  onChange={onChange}
                  placeholder="0x..."
                  style={styles.input}
                />
                <div style={styles.fieldHint}>Seller’s receiving wallet for funds (record only).</div>
              </label>

              <label style={styles.label}>
                <span>Buyer Name</span>
                <input name="buyerName" value={form.buyerName} onChange={onChange} style={styles.input} />
              </label>

              <label style={styles.label}>
                <span>Buyer Address (postal)</span>
                <input name="buyerAddressPostal" value={form.buyerAddressPostal} onChange={onChange} style={styles.input} />
              </label>

              {/* Auto dates (grayed out) */}
              <label style={styles.label}>
                <span>Effective Date <em style={styles.chipAuto}>auto (block.timestamp)</em></span>
                <input
                  name="effectiveDate"
                  value={form.effectiveDate}
                  onChange={onChange}
                  placeholder="Auto: set at execution"
                  style={{ ...styles.input, ...styles.inputDisabled }}
                  disabled
                />
              </label>

              <label style={styles.label}>
                <span>Closing Date <em style={styles.chipAuto}>auto (execution)</em></span>
                <input
                  name="closingDate"
                  value={form.closingDate}
                  onChange={onChange}
                  placeholder="Auto: same as execution"
                  style={{ ...styles.input, ...styles.inputDisabled }}
                  disabled
                />
              </label>
            </div>

            {/* Payment Method */}
            <label style={styles.label}>
              <span>Payment Method</span>
              <select
                name="assetType"
                value={form.assetType}
                onChange={(e) => setForm((s) => ({ ...s, assetType: e.target.value }))}
                style={styles.input}
              >
                <option value="ETH">ETH (native)</option>
                <option value="USDT">USDT (ERC-20)</option>
                <option value="USDC">USDC (ERC-20)</option>
                <option value="BTC">BTC (on-chain via backend)</option>
              </select>
            </label>

            {/* Price Inputs */}
            {form.assetType === "ETH" && (
              <label style={styles.label}>
                <span>Price (ETH)</span>
                <input
                  name="priceEth"
                  value={form.priceEth}
                  onChange={onChange}
                  inputMode="decimal"
                  placeholder="e.g., 1.25"
                  style={styles.input}
                />
              </label>
            )}
            {form.assetType === "USDT" && (
              <label style={styles.label}>
                <span>Price (USDT)</span>
                <input
                  name="priceUsdt"
                  value={form.priceUsdt}
                  onChange={onChange}
                  inputMode="decimal"
                  placeholder="e.g., 25000"
                  style={styles.input}
                />
              </label>
            )}
            {form.assetType === "USDC" && (
              <label style={styles.label}>
                <span>Price (USDC)</span>
                <input
                  name="priceUsdc"
                  value={form.priceUsdc}
                  onChange={onChange}
                  inputMode="decimal"
                  placeholder="e.g., 25000"
                  style={styles.input}
                />
              </label>
            )}
            {form.assetType === "BTC" && (
              <label style={styles.label}>
                <span>Price (BTC)</span>
                <input
                  name="priceBtc"
                  value={form.priceBtc}
                  onChange={onChange}
                  inputMode="decimal"
                  placeholder="e.g., 0.015"
                  style={styles.input}
                />
              </label>
            )}

            {/* Token metadata (auto) */}
            <div style={{ display: "grid", gap: 6 }}>
              <label style={styles.inlineCheck}>
                <input
                  type="checkbox"
                  checked={form.autoMetadata}
                  onChange={(e) => setForm((s) => ({ ...s, autoMetadata: e.target.checked }))}
                />
                <span>Auto-generate token metadata (tokenURI)</span>
              </label>

              <label style={styles.label}>
                <span>NFT Token URI (deed metadata)</span>
                <input
                  name="tokenURI"
                  value={form.autoMetadata ? effectiveTokenURI : form.tokenURI}
                  onChange={onChange}
                  placeholder="ipfs://... or https://..."
                  style={{ ...styles.input, ...(form.autoMetadata ? styles.inputDisabled : null) }}
                  disabled={form.autoMetadata}
                />
                <div style={styles.fieldHint}>
                  Auto mode builds a <code>data:application/json</code> tokenURI from the form. Replace with IPFS in production.
                </div>
              </label>
            </div>

            {/* Contract section (customer view) */}
            <div style={{ borderTop: "1px solid #e6e6e6", paddingTop: 10, marginTop: 8 }}>
              <h3 style={{ margin: "0 0 8px", fontSize: 16, textAlign: "left" }}>Contract</h3>

              <label style={styles.label}>
                <span>Contract Address (auto)</span>
                <input
                  value={contractAddress || ""}
                  onChange={() => {}}
                  placeholder="Will auto-fill after wallet connect"
                  style={{ ...styles.input, ...styles.inputDisabled }}
                  disabled
                />
                <div style={styles.fieldHint}>
                  Set by the app using your predeployed address for this network.
                </div>
              </label>

              <details style={{ marginTop: 6 }}>
                <summary style={{ cursor: "pointer" }} onClick={() => setAdminMode((v) => !v)}>
                  Admin controls (toggle)
                </summary>

                {adminMode && (
                  <div style={{ marginTop: 8 }}>
                    <AdminControls
                      abi={abi}
                      setAbi={setAbi}
                      setContractAddress={setContractAddress}
                      setDeployTxHash={setDeployTxHash}
                      setStatus={setStatus}
                      provider={provider}
                      signer={signer}
                    />
                  </div>
                )}
              </details>
            </div>

            {/* Execute */}
            <div style={{ borderTop: "1px solid #e6e6e6", paddingTop: 10, marginTop: 8 }}>
              <h3 style={{ margin: "0 0 8px", fontSize: 16, textAlign: "left" }}>
                Execute Sale (Mint with Selected Method)
              </h3>

              {["ETH", "USDT", "USDC"].includes(form.assetType) ? (
                <button
                  type="button"
                  style={{ ...styles.btn, ...styles.btnPrimary }}
                  onClick={executeSaleMint}
                  disabled={!contractAddress || !abi || !signer}
                >
                  Execute & Mint with {form.assetType}
                </button>
              ) : (
                <>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      style={{ ...styles.btn, ...styles.btnPrimary }}
                      onClick={createBtcInvoice}
                      disabled={!form.priceBtc}
                    >
                      Create BTC Invoice (backend)
                    </button>
                    <button
                      type="button"
                      style={styles.btn}
                      onClick={pollBtcAndFinalize}
                      disabled={!btcInvoice || btcPolling}
                    >
                      {btcPolling ? "Checking…" : "Check BTC & Finalize Mint"}
                    </button>
                  </div>

                  {btcInvoice && (
                    <div style={styles.invoiceBox}>
                      <div style={{ fontWeight: 600, marginBottom: 8 }}>BTC Payment Details</div>
                      <div style={styles.monoSmall}>
                        Address: {btcInvoice.address || "—"}
                        <br />
                        Amount (BTC): {btcInvoice.amountBtc || form.priceBtc || "—"}
                      </div>
                      {btcQr && (
                        <div style={{ display: "grid", placeItems: "center", marginTop: 8 }}>
                          <img src={btcQr} alt="BTC Payment QR" style={{ width: 220, height: 220 }} />
                        </div>
                      )}
                    </div>
                  )}

                  {ethereumTxFromBtc && (
                    <div style={styles.noteBox}>
                      <div style={{ fontWeight: 600, marginBottom: 6 }}>On-chain Tx (mint from BTC rail)</div>
                      <div style={styles.monoSmall}>{ethereumTxFromBtc}</div>
                    </div>
                  )}
                </>
              )}
            </div>

            {deployTxHash && (
              <div style={styles.noteBox}>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>Deploy Tx</div>
                <div style={styles.monoSmall}>{deployTxHash}</div>
              </div>
            )}

            {status && (
              <div style={styles.noteBox}>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>Status</div>
                <div style={{ fontSize: 13 }}>{status}</div>
              </div>
            )}
          </form>
        </section>

        {/* RIGHT: Legal-style preview */}
        <section style={styles.card}>
          <h2 style={styles.h2}>2) Legal Contract Preview</h2>
          <div style={styles.legalPage} id="printArea">
            <div style={{ textAlign: "left", marginBottom: 12 }}>
              <div style={styles.docTitle}>LAND PURCHASE AGREEMENT</div>
              <div style={styles.docSubtitle}>
                No Escrow · On-chain Execution {form.assetType === "BTC" ? "· BTC Rail" : ""}
              </div>
            </div>

            <p style={styles.para}>
              This Land Purchase Agreement (“Agreement”) is made effective as of{" "}
              {fmtDate(form.effectiveDate)} (“Effective Date”) by and between{" "}
              <span style={styles.smallCaps}>{form.sellerName || "________"}</span>, with a mailing address of{" "}
              {form.sellerAddress || "________"}, as “Seller,” and{" "}
              <span style={styles.smallCaps}>{form.buyerName || "________"}</span>, with a mailing address of{" "}
              {form.buyerAddressPostal || "________"}, as “Buyer.”
            </p>

            <ol style={styles.clauses}>
              <li>
                <span style={styles.clauseTitle}>Property.</span> Seller agrees to sell and Buyer agrees to purchase the real property commonly known as{" "}
                {form.streetAddress || "________"}, located in {form.county || "________"} County, together with the following legal description:{" "}
                {form.legalDescription || "________"} (the “Property”).
              </li>
              <li>
                <span style={styles.clauseTitle}>Purchase Price & Payment.</span>{" "}
                {form.assetType === "ETH" && (
                  <>Price: {form.priceEth || "________"} ETH. Buyer pays in ETH; the smart contract mints an NFT deed upon execution.</>
                )}
                {form.assetType === "USDT" && (
                  <>Price: {form.priceUsdt || "________"} USDT. Buyer approves USDT to the contract and executes the sale; the contract mints an NFT deed.</>
                )}
                {form.assetType === "USDC" && (
                  <>Price: {form.priceUsdc || "________"} USDC. Buyer approves USDC to the contract and executes the sale; the contract mints an NFT deed.</>
                )}
                {form.assetType === "BTC" && (
                  <>Price: {form.priceBtc || "________"} BTC. After sufficient confirmations, the service triggers a smart contract call on Ethereum to mint the NFT deed to Buyer.</>
                )}
              </li>
              <li>
                <span style={styles.clauseTitle}>No Escrow; No Utilities.</span> There is no escrow, and no obligation relating to utilities or ongoing services is
                included within this Agreement.
              </li>
              <li>
                <span style={styles.clauseTitle}>Closing.</span> Closing shall occur on or before {fmtDate(form.closingDate)} or such other date as the parties may mutually
                agree in writing. Upon receipt of the Price by the designated method above, Buyer is deemed to have tendered payment in full.
              </li>
              <li>
                <span style={styles.clauseTitle}>Title & Deed.</span> Any county recording is handled off-chain by the parties. This sample is not legal advice.
              </li>
              <li>
                <span style={styles.clauseTitle}>As-Is; Risk of Loss.</span> The Property is sold “AS-IS.” Risk of loss passes to Buyer upon Closing.
              </li>
              <li>
                <span style={styles.clauseTitle}>Governing Law.</span> This Agreement is governed by the laws of the State of Texas.
              </li>
              <li>
                <span style={styles.clauseTitle}>Entire Agreement.</span> This Agreement constitutes the entire agreement between the parties.
              </li>
            </ol>

            <div style={styles.sigBlock}>
              <div style={styles.sigCol}>
                <div style={styles.sigLine} />
                <div style={styles.sigLabel}>SELLER: {form.sellerName || "________"}</div>
                <div style={styles.sigDate}>Date: {fmtDate(form.effectiveDate)}</div>
              </div>
              <div style={styles.sigCol}>
                <div style={styles.sigLine} />
                <div style={styles.sigLabel}>BUYER: {form.buyerName || "________"}</div>
                <div style={styles.sigDate}>Date: {fmtDate(form.effectiveDate)}</div>
              </div>
            </div>

            <div style={styles.fineprint}>
              <strong>Notice:</strong> This UI mints the NFT using the selected method (ETH, USDT, USDC) or via BTC rail after confirmation.
              This is not legal advice.
            </div>
          </div>

          <div style={styles.docActions}>
            <button
              style={styles.btn}
              type="button"
              onClick={() => {
                const node = document.getElementById("printArea");
                const win = window.open("", "_blank", "width=800,height=1000");
                win.document.write(
                  `<html><head><title>Land Purchase Agreement</title></head><body>${node.innerHTML}</body></html>`
                );
                win.document.close();
                win.focus();
                win.print();
                win.close();
              }}
            >
              Print Contract
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

/* ---------- Admin Controls (optional) ---------- */
function AdminControls({ abi, setAbi, setContractAddress, setDeployTxHash, setStatus, provider, signer }) {
  const [artifactJSON, setArtifactJSON] = useState("");
  const [bytecode, setBytecode] = useState("");

  function parseArtifact() {
    try {
      const obj = JSON.parse(artifactJSON);
      const _abi = obj.abi || obj.ABI || null;
      const _byte = obj.bytecode || obj.data?.bytecode?.object || null;
      if (!_abi || !_byte) throw new Error("Could not find `abi` and `bytecode`.");
      setAbi(_abi);
      setBytecode(_byte);
      setStatus("Artifact parsed. Ready to deploy.");
    } catch (e) {
      setStatus(e?.message || "Invalid artifact JSON.");
    }
  }

  async function deployContract() {
    try {
      if (!signer) throw new Error("Connect wallet first.");
      if (!abi || !bytecode) throw new Error("Paste and parse an artifact JSON first.");
      const factory = new ethers.ContractFactory(abi, bytecode, signer);
      const contract = await factory.deploy();
      setStatus("Deploying…");
      const receipt = await contract.deploymentTransaction().wait();
      setContractAddress(contract.target);
      setDeployTxHash(receipt.hash);
      setStatus(`Deployed at ${contract.target}`);
    } catch (e) {
      setStatus(e?.message || "Deployment failed.");
    }
  }

  const [existing, setExisting] = useState("");

  return (
    <div>
      <h4 style={{ margin: "8px 0" }}>Admin — Contract Controls</h4>
      <label style={styles.label}>
        <span>Paste Artifact JSON (from Hardhat/Foundry)</span>
        <textarea
          rows={5}
          value={artifactJSON}
          onChange={(e) => setArtifactJSON(e.target.value)}
          placeholder='{"abi":[...],"bytecode":"0x..."}'
          style={styles.textarea}
        />
      </label>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" style={styles.btn} onClick={parseArtifact}>Parse Artifact</button>
        <button type="button" style={{ ...styles.btn, ...styles.btnPrimary }} onClick={deployContract} disabled={!abi || !bytecode || !signer}>
          Deploy Contract
        </button>
      </div>

      <label style={{ ...styles.label, marginTop: 8 }}>
        <span>Or use existing contract address</span>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={existing}
            onChange={(e) => setExisting(e.target.value)}
            placeholder="0x..."
            style={{ ...styles.input, flex: 1 }}
          />
          <button
            type="button"
            style={styles.btn}
            onClick={() => {
              if (!ethers.isAddress(existing)) {
                setStatus("Enter a valid address.");
                return;
              }
              setContractAddress(existing);
              setStatus(`Attached to ${existing}`);
            }}
          >
            Use Address
          </button>
        </div>
      </label>
    </div>
  );
}

/* ---------- helpers ---------- */
function short(addr) {
  return addr ? addr.slice(0, 6) + "…" + addr.slice(-4) : "";
}
function fmtDate(iso) {
  if (!iso) return "________";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "________";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

/* ---------- Styles ---------- */
const styles = {
  container: {
    maxWidth: 1180,
    margin: "32px auto 48px",
    padding: "0 20px",
    color: "#1f2328",
    fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif',
    textAlign: "left",
  },
  toolbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 14,
  },
  toolRight: { display: "flex", alignItems: "center", gap: 10 },
  walletMini: { display: "flex", gap: 10, fontSize: 12, color: "#57606a" },
  h1: { margin: "8px 0 4px", fontSize: 26, textAlign: "left" },
  h2: { margin: "0 0 10px", fontSize: 18, textAlign: "left" },
  muted: { color: "#6a737d", marginBottom: 16, textAlign: "left" },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 },
  card: { background: "#fff", border: "1px solid #d0d7de", borderRadius: 12, padding: 16, textAlign: "left" },
  form: { display: "grid", gridTemplateColumns: "1fr", gap: 12 },
  label: { display: "grid", gap: 6, textAlign: "left" },
  input: {
    width: "100%",
    padding: "10px 12px",
    border: "1px solid #d0d7de",
    borderRadius: 8,
    fontSize: 14,
    textAlign: "left",
    background: "#fff",
    color: "#111",
  },
  inputDisabled: {
    background: "#f3f4f6",
    color: "#6a737d",
    cursor: "not-allowed",
  },
  inlineCheck: { display: "inline-flex", alignItems: "center", gap: 8, fontSize: 14 },
  fieldHint: { fontSize: 12, color: "#6a737d", marginTop: 2 },
  chipAuto: { fontSize: 12, color: "#57606a", paddingLeft: 6 },
  textarea: {
    width: "100%",
    padding: "10px 12px",
    border: "1px solid #d0d7de",
    borderRadius: 8,
    fontSize: 14,
    resize: "vertical",
    textAlign: "left",
  },
  btn: {
    padding: "10px 14px",
    border: "1px solid #d0d7de",
    background: "#fff",
    borderRadius: 8,
    cursor: "pointer",
    textAlign: "left",
  },
  btnPrimary: { background: "#1f6feb", borderColor: "#1f6feb", color: "#fff" },
  backBtn: { textDecoration: "none", display: "inline-flex", alignItems: "center" },

  invoiceBox: {
    background: "#f6f8fa",
    border: "1px solid #d0d7de",
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    textAlign: "left",
  },
  monoSmall: {
    fontFamily:
      "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace",
    fontSize: 12,
    wordBreak: "break-all",
    textAlign: "left",
  },
  noteBox: {
    background: "#fff8e6",
    border: "1px solid #ffe8a3",
    color: "#7a5b00",
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    textAlign: "left",
  },
  helperRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    margin: "4px 0 8px",
  },
  legalPage: {
    background: "#fff",
    border: "1px solid #e6e6e6",
    borderRadius: 10,
    padding: "26px 30px",
    marginTop: 8,
    fontFamily: 'Georgia,"Times New Roman",Times,serif',
    color: "#111",
    lineHeight: 1.45,
    textAlign: "left",
  },
  docTitle: { fontVariantCaps: "small-caps", letterSpacing: 0.5, fontSize: 22, textAlign: "left" },
  docSubtitle: { fontSize: 12, color: "#555", marginTop: 2, textAlign: "left" },
  para: { textAlign: "left", margin: "10px 0 12px" },
  clauses: { paddingLeft: 18, textAlign: "left" },
  clauseTitle: { fontVariantCaps: "small-caps", fontWeight: 600, paddingRight: 6 },
  smallCaps: { fontVariantCaps: "small-caps" },
  sigBlock: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22, marginTop: 20, textAlign: "left" },
  sigCol: { display: "grid", gap: 6 },
  sigLine: { height: 1, background: "#333", marginTop: 24 },
  sigLabel: { fontSize: 14 },
  sigDate: { fontSize: 12, color: "#555" },
  fineprint: { marginTop: 16, fontSize: 12, color: "#555", textAlign: "left" },
  docActions: { marginTop: 12, display: "flex", gap: 8, justifyContent: "flex-start" },
};
