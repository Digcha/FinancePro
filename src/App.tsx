import {
  AlertTriangle,
  ArrowDownToLine,
  Building2,
  Camera,
  Check,
  CheckCircle,
  ClipboardCheck,
  Database,
  Download,
  Eye,
  FileText,
  History,
  Inbox,
  Landmark,
  Lock,
  Mail,
  RefreshCcw,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  SquareArrowOutUpRight,
  Upload,
  UserRound,
  XCircle,
} from "lucide-react";
import { ChangeEvent, DragEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { initialInvoices } from "./data/demoInvoices";
import { buildAuditPackage, getAuditFileName } from "./domain/audit";
import { canApproveInvoice, canExportInvoice, getExportBlockReason } from "./domain/exportPolicy";
import { getExportFileName, getExportMimeType, getExportPayload } from "./domain/exporters";
import {
  approveInvoice,
  createInvoiceRecord,
  createRiskContext,
  getInvoiceState,
  reprocessInvoice,
  ruleSetVersion,
} from "./domain/invoiceEngine";
import { parseImportedFile } from "./domain/importers";
import { countLearnedRules } from "./domain/learningRules";
import { buildNeutralBookingRecord } from "./domain/posting";
import { exportAdapters } from "./domain/referenceData";
import { loadInvoices, saveInvoices } from "./domain/storage";
import { ExportAdapter, Invoice, InvoiceStatus, SignalState, UserRole } from "./domain/types";
import { applyUidVerification, checkUidAutomatically, financeAtUidUrl } from "./domain/uidCheckApi";
import { downloadText, formatDate, moneyFormatter } from "./domain/utils";

function App() {
  const [invoices, setInvoices] = useState<Invoice[]>(() => loadInvoices(initialInvoices));
  const [selectedId, setSelectedId] = useState(() => loadInvoices(initialInvoices)[0]?.id ?? initialInvoices[0].id);
  const [adapter, setAdapter] = useState<ExportAdapter>("Universal CSV");
  const [role, setRole] = useState<UserRole>("bookkeeper");
  const [learnedRules, setLearnedRules] = useState(countLearnedRules());
  const [query, setQuery] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isCheckingUid, setIsCheckingUid] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    saveInvoices(invoices);
  }, [invoices]);

  const selectedInvoice = invoices.find((invoice) => invoice.id === selectedId) ?? invoices[0];
  const neutralBooking = useMemo(() => buildNeutralBookingRecord(selectedInvoice), [selectedInvoice]);
  const exportAllowed = canExportInvoice(selectedInvoice);
  const canEdit = role !== "readonly";
  const approveAllowed = canApproveInvoice(selectedInvoice) && role !== "readonly";

  const filteredInvoices = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return invoices;
    return invoices.filter((invoice) =>
      [
        invoice.supplier,
        invoice.invoiceNumber,
        invoice.supplierUid,
        invoice.status,
        invoice.documentType,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [invoices, query]);

  const inboxStats = useMemo(() => {
    const blocked = invoices.filter((invoice) => invoice.status === "blocked").length;
    const review = invoices.filter((invoice) => invoice.status === "review" || invoice.status === "new").length;
    const approved = invoices.filter((invoice) => invoice.status === "approved").length;
    return { blocked, review, approved };
  }, [invoices]);

  const updateInvoice = (nextInvoice: Invoice) => {
    setInvoices((current) =>
      current.map((invoice) => (invoice.id === nextInvoice.id ? nextInvoice : invoice)),
    );
  };

  const updateField = (field: keyof Invoice, value: string) => {
    if (!selectedInvoice || !canEdit) return;
    const numericFields: Array<keyof Invoice> = ["net", "vatRate", "vat", "gross", "qualityScore", "extractionConfidence"];
    const parsedValue = numericFields.includes(field) ? Number(value) : value;
    updateInvoice({ ...selectedInvoice, [field]: parsedValue });
  };

  const approveSelected = () => {
    if (!selectedInvoice) return;
    updateInvoice(approveInvoice(selectedInvoice));
    setLearnedRules(countLearnedRules());
  };

  const recheckSelected = () => {
    if (!selectedInvoice) return;
    updateInvoice(reprocessInvoice(selectedInvoice, invoices, true));
  };

  const handleFileInput = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    await importFiles(files);
    event.target.value = "";
  };

  const handleDrop = async (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setIsDragging(false);
    await importFiles(Array.from(event.dataTransfer.files));
  };

  const importFiles = async (files: File[]) => {
    if (!files.length) return;
    const importedInputs = await Promise.all(files.map(parseImportedFile));
    const importedInvoices = importedInputs.reduce<Invoice[]>((records, input) => {
      const context = createRiskContext([...records, ...invoices]);
      return [...records, createInvoiceRecord(input, context)];
    }, []);

    const checkedInvoices = await Promise.all(importedInvoices.map(verifyUidIfPossible));
    setInvoices((current) => [...checkedInvoices, ...current]);
    setSelectedId(checkedInvoices[0].id);
  };

  const verifyUidIfPossible = async (invoice: Invoice) => {
    if (!invoice.supplierUid.trim()) return invoice;
    if (import.meta.env.VITE_USE_AZURE_API !== "true") return invoice;
    try {
      return applyUidVerification(invoice, await checkUidAutomatically(invoice.supplierUid));
    } catch {
      return invoice;
    }
  };

  const checkSelectedUid = async () => {
    if (!selectedInvoice?.supplierUid.trim()) return;
    setIsCheckingUid(true);
    try {
      updateInvoice(applyUidVerification(selectedInvoice, await checkUidAutomatically(selectedInvoice.supplierUid)));
    } finally {
      setIsCheckingUid(false);
    }
  };

  const downloadCurrentExport = () => {
    if (!selectedInvoice || !exportAllowed) return;
    downloadText(
      getExportFileName(selectedInvoice, adapter),
      getExportPayload(selectedInvoice, adapter),
      getExportMimeType(adapter),
    );
  };

  const downloadAuditPackage = () => {
    if (!selectedInvoice) return;
    downloadText(getAuditFileName(selectedInvoice), buildAuditPackage(selectedInvoice), "application/json");
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true">
            <ShieldCheck size={22} />
          </div>
          <div>
            <p className="eyebrow">FinancePro</p>
            <h1>Rechnungsagent Österreich</h1>
          </div>
        </div>

        <div className="tenant-controls" aria-label="Mandant und Rolle">
          <label className="select-control">
            <Building2 size={15} />
            <select value="FinancePro Demo GmbH" aria-label="Mandant">
              <option>FinancePro Demo GmbH</option>
            </select>
          </label>
          <label className="select-control">
            <UserRound size={15} />
            <select value={role} onChange={(event) => setRole(event.target.value as UserRole)} aria-label="Rolle">
              <option value="admin">Admin</option>
              <option value="bookkeeper">Buchhalter</option>
              <option value="reviewer">Prüfer</option>
              <option value="readonly">Nur Lesen</option>
            </select>
          </label>
        </div>

        <div className="topbar-actions" aria-label="Arbeitsstatus">
          <span className="rule-version">{ruleSetVersion}</span>
          <span className="rule-version">{learnedRules} Regeln</span>
          <StatusPill label={`${inboxStats.review} im Review`} state="warn" />
          <StatusPill label={`${inboxStats.blocked} gesperrt`} state="risk" />
          <StatusPill label={`${inboxStats.approved} freigegeben`} state="ok" />
        </div>
      </header>

      <section className="workspace">
        <aside className="sidebar" aria-label="Rechnungseingang">
          <div className="toolbar-row">
            <div className="sidebar-heading">
              <Inbox size={18} />
              <span>Eingang</span>
            </div>
            <button
              className="icon-button"
              title="Datei importieren"
              aria-label="Datei importieren"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={18} />
            </button>
            <input
              ref={fileInputRef}
              className="visually-hidden"
              type="file"
              accept=".pdf,.xml,.txt,.ubl,.jpg,.jpeg,.png"
              multiple
              onChange={handleFileInput}
            />
            <input
              ref={cameraInputRef}
              className="visually-hidden"
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileInput}
            />
          </div>

          <label className="search-box">
            <Search size={16} aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Suche"
              aria-label="Rechnungen suchen"
            />
          </label>

          <button
            className={`drop-zone ${isDragging ? "is-dragging" : ""}`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            <Upload size={20} />
            <span>Datei importieren</span>
            <small>PDF, XML, UBL, JPG</small>
          </button>

          <button className="camera-zone" onClick={() => cameraInputRef.current?.click()}>
            <Camera size={18} />
            <span>Scan mit Kamera</span>
          </button>

          <div className="invoice-list">
            {filteredInvoices.map((invoice) => (
              <button
                key={invoice.id}
                className={`invoice-card ${invoice.id === selectedId ? "is-selected" : ""}`}
                onClick={() => setSelectedId(invoice.id)}
              >
                <span className="invoice-card-top">
                  <span className="invoice-supplier">{invoice.supplier}</span>
                  <SignalIcon state={getInvoiceState(invoice)} />
                </span>
                <span className="invoice-meta">
                  {invoice.invoiceNumber} · {invoice.documentType} · {moneyFormatter.format(invoice.gross)}
                </span>
                <span className="invoice-progress">
                  <span style={{ width: `${invoice.extractionConfidence}%` }} />
                </span>
              </button>
            ))}
          </div>
        </aside>

        <section className="document-panel" aria-label="Dokumentvorschau">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Dokument</p>
              <h2>{selectedInvoice.invoiceNumber}</h2>
            </div>
            <div className="quality-stack">
              <Metric label="Scanqualität" value={`${selectedInvoice.qualityScore}%`} />
              <Metric label="Extraktion" value={`${selectedInvoice.extractionConfidence}%`} />
            </div>
          </div>

          <div className="document-preview">
            <div className="paper">
              <div className="paper-header">
                <div>
                  <p>{selectedInvoice.supplier}</p>
                  <strong>{selectedInvoice.invoiceNumber}</strong>
                </div>
                <FileText size={28} />
              </div>

              <div className="paper-grid">
                <span>Empfänger</span>
                <strong>{selectedInvoice.recipient}</strong>
                <span>Ausgestellt</span>
                <strong>{formatDate(selectedInvoice.issueDate)}</strong>
                <span>Leistung</span>
                <strong>{formatDate(selectedInvoice.serviceDate)}</strong>
                <span>Fällig</span>
                <strong>{formatDate(selectedInvoice.dueDate)}</strong>
              </div>

              <div className="line-items">
                {selectedInvoice.lineItems.map((item) => (
                  <div key={item.description} className="line-item">
                    <span>{item.description}</span>
                    <strong>{moneyFormatter.format(item.amount)}</strong>
                  </div>
                ))}
              </div>

              <div className="paper-total">
                <span>Netto</span>
                <strong>{moneyFormatter.format(selectedInvoice.net)}</strong>
                <span>USt. {selectedInvoice.vatRate}%</span>
                <strong>{moneyFormatter.format(selectedInvoice.vat)}</strong>
                <span>Brutto</span>
                <strong>{moneyFormatter.format(selectedInvoice.gross)}</strong>
              </div>
            </div>
          </div>

          <section className="scan-section" aria-label="Scanprüfung">
            <SignalGroup
              title="Scanprüfung"
              icon={<Camera size={17} />}
              items={selectedInvoice.scanReport.checks.map((check) => ({
                label: check.label,
                state: check.state,
                detail: check.detail,
              }))}
            />
            <div className={`scan-hints ${selectedInvoice.scanReport.status}`}>
              <strong>Live-Hinweis</strong>
              {selectedInvoice.scanReport.hints.map((hint) => (
                <span key={hint}>{hint}</span>
              ))}
            </div>
          </section>
        </section>

        <section className="review-panel" aria-label="Review und Export">
          <div className="review-header">
            <div>
              <p className="eyebrow">Review</p>
              <h2>{selectedInvoice.supplier}</h2>
            </div>
            <StatusBadge status={selectedInvoice.status} />
          </div>

          <div className="field-grid">
            <Field disabled={!canEdit} label="Lieferant" value={selectedInvoice.supplier} onChange={(value) => updateField("supplier", value)} />
            <Field disabled={!canEdit} label="Adresse Lieferant" value={selectedInvoice.supplierAddress} onChange={(value) => updateField("supplierAddress", value)} />
            <Field disabled={!canEdit} label="UID Lieferant" value={selectedInvoice.supplierUid} onChange={(value) => updateField("supplierUid", value)} />
            <Field disabled={!canEdit} label="Empfänger" value={selectedInvoice.recipient} onChange={(value) => updateField("recipient", value)} />
            <Field disabled={!canEdit} label="Adresse Empfänger" value={selectedInvoice.recipientAddress} onChange={(value) => updateField("recipientAddress", value)} />
            <Field disabled={!canEdit} label="UID Empfänger" value={selectedInvoice.recipientUid} onChange={(value) => updateField("recipientUid", value)} />
            <Field disabled={!canEdit} label="Rechnungsnummer" value={selectedInvoice.invoiceNumber} onChange={(value) => updateField("invoiceNumber", value)} />
            <Field disabled={!canEdit} label="IBAN" value={selectedInvoice.iban} onChange={(value) => updateField("iban", value)} />
            <Field disabled={!canEdit} label="Netto" value={String(selectedInvoice.net)} type="number" onChange={(value) => updateField("net", value)} />
            <Field disabled={!canEdit} label="USt. %" value={String(selectedInvoice.vatRate)} type="number" onChange={(value) => updateField("vatRate", value)} />
            <Field disabled={!canEdit} label="Steuer" value={String(selectedInvoice.vat)} type="number" onChange={(value) => updateField("vat", value)} />
            <Field disabled={!canEdit} label="Brutto" value={String(selectedInvoice.gross)} type="number" onChange={(value) => updateField("gross", value)} />
          </div>

          <div className="uid-actions">
            <button className="secondary-action" onClick={checkSelectedUid} disabled={!selectedInvoice.supplierUid || isCheckingUid}>
              <ShieldCheck size={17} />
              {isCheckingUid ? "Prüft..." : "UID automatisch prüfen"}
            </button>
            <a className="link-action" href={financeAtUidUrl(selectedInvoice.supplierUid)} target="_blank" rel="noreferrer">
              <SquareArrowOutUpRight size={16} />
              Finanz.at öffnen
            </a>
          </div>

          <div className="split-section">
            <SignalGroup
              title="§ 11 UStG"
              icon={<ClipboardCheck size={17} />}
              items={selectedInvoice.checks.map((check) => ({
                label: check.label,
                state: check.state,
                detail: check.detail,
              }))}
            />
            <SignalGroup
              title="Risiko"
              icon={<ShieldAlert size={17} />}
              items={selectedInvoice.risks.map((risk) => ({
                label: risk.title,
                state: risk.state,
                detail: risk.detail,
              }))}
            />
          </div>

          <section className="booking-section" aria-label="Buchungsvorschlag">
            <div className="section-title">
              <Landmark size={17} />
              <span>Buchungsvorschlag</span>
            </div>
            <div className="booking-grid">
              <Field disabled={!canEdit} label="Kategorie" value={selectedInvoice.category} onChange={(value) => updateField("category", value)} />
              <Field disabled={!canEdit} label="Konto" value={selectedInvoice.account} onChange={(value) => updateField("account", value)} />
              <Field disabled={!canEdit} label="Sollkonto" value={selectedInvoice.debitAccount} onChange={(value) => updateField("debitAccount", value)} />
              <Field disabled={!canEdit} label="Habenkonto" value={selectedInvoice.creditAccount} onChange={(value) => updateField("creditAccount", value)} />
              <Field disabled={!canEdit} label="Steuercode" value={selectedInvoice.taxCode} onChange={(value) => updateField("taxCode", value)} />
              <Field disabled={!canEdit} label="Kostenstelle" value={selectedInvoice.costCenter} onChange={(value) => updateField("costCenter", value)} />
              <Field disabled={!canEdit} label="Objekt/Objektnummer" value={selectedInvoice.objectNumber} onChange={(value) => updateField("objectNumber", value)} />
              <Field disabled={!canEdit} label="Buchungstext" value={selectedInvoice.bookingText} onChange={(value) => updateField("bookingText", value)} />
            </div>
          </section>

          <section className="neutral-section" aria-label="Neutraler Buchungssatz">
            <div className="section-title">
              <ClipboardCheck size={17} />
              <span>Neutraler Buchungssatz</span>
            </div>
            <pre className="neutral-preview">{JSON.stringify(neutralBooking, null, 2)}</pre>
          </section>

          <section className="export-section" aria-label="Export">
            <div className="section-title">
              <Database size={17} />
              <span>Export</span>
            </div>
            <div className="adapter-tabs" role="tablist" aria-label="Exportziel">
              {exportAdapters.map((nextAdapter) => (
                <button
                  key={nextAdapter}
                  className={adapter === nextAdapter ? "is-active" : ""}
                  onClick={() => setAdapter(nextAdapter)}
                >
                  {nextAdapter}
                </button>
              ))}
            </div>
            {!exportAllowed && <p className="export-guard">{getExportBlockReason(selectedInvoice)}</p>}
            <pre className="export-preview">{getExportPayload(selectedInvoice, adapter)}</pre>
          </section>

          <section className="audit-section" aria-label="Audit Trail">
            <div className="section-title">
              <History size={17} />
              <span>Audit Trail</span>
            </div>
            <div className="audit-list">
              {selectedInvoice.audit.map((entry) => (
                <div key={`${entry.time}-${entry.label}`} className="audit-row">
                  <span>{entry.time}</span>
                  <strong>{entry.label}</strong>
                </div>
              ))}
            </div>
          </section>

          <div className="action-bar">
            <button className="secondary-action" onClick={recheckSelected}>
              <RefreshCcw size={17} />
              Prüfen
            </button>
            <button className="secondary-action" onClick={downloadAuditPackage}>
              <ArrowDownToLine size={17} />
              Audit
            </button>
            <button className="secondary-action" onClick={downloadCurrentExport} disabled={!exportAllowed}>
              <Download size={17} />
              Export
            </button>
            <button className="primary-action" onClick={approveSelected} disabled={!approveAllowed}>
              <Send size={17} />
              Freigeben
            </button>
          </div>
        </section>
      </section>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  disabled = false,
  type = "text",
}: {
  label: string;
  value: string;
  disabled?: boolean;
  type?: "text" | "number";
  onChange: (value: string) => void;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input disabled={disabled} type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function StatusPill({ label, state }: { label: string; state: SignalState }) {
  return <span className={`status-pill ${state}`}>{label}</span>;
}

function SignalIcon({ state }: { state: SignalState }) {
  if (state === "ok") return <CheckCircle className="signal-icon ok" size={18} aria-label="OK" />;
  if (state === "warn") return <AlertTriangle className="signal-icon warn" size={18} aria-label="Warnung" />;
  return <XCircle className="signal-icon risk" size={18} aria-label="Risiko" />;
}

function StatusBadge({ status }: { status: InvoiceStatus }) {
  const config: Record<InvoiceStatus, { label: string; icon: ReactNode }> = {
    new: { label: "Neu", icon: <Mail size={15} /> },
    review: { label: "Review", icon: <Eye size={15} /> },
    approved: { label: "Freigegeben", icon: <Check size={15} /> },
    blocked: { label: "Gesperrt", icon: <Lock size={15} /> },
  };
  return (
    <span className={`status-badge ${status}`}>
      {config[status].icon}
      {config[status].label}
    </span>
  );
}

function SignalGroup({
  title,
  icon,
  items,
}: {
  title: string;
  icon: ReactNode;
  items: Array<{ label: string; state: SignalState; detail: string }>;
}) {
  return (
    <section className="signal-group">
      <div className="section-title">
        {icon}
        <span>{title}</span>
      </div>
      <div className="signal-list">
        {items.map((item) => (
          <div className="signal-row" key={`${title}-${item.label}`}>
            <SignalIcon state={item.state} />
            <div>
              <strong>{item.label}</strong>
              <p>{item.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default App;
