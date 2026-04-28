import {
  AlertTriangle,
  ArrowDownToLine,
  Building2,
  Calculator,
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
  Plus,
  RefreshCcw,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  Server,
  SquareArrowOutUpRight,
  Trash2,
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
  refreshInvoiceDraft,
  reprocessInvoice,
  ruleSetVersion,
} from "./domain/invoiceEngine";
import { parseImportedFile } from "./domain/importers";
import { countLearnedRules } from "./domain/learningRules";
import { buildNeutralBookingRecord } from "./domain/posting";
import { exportAdapters } from "./domain/referenceData";
import { loadInvoices, saveInvoices } from "./domain/storage";
import { ExportAdapter, Invoice, InvoiceStatus, LineItem, PaymentMethod, SignalState, UserRole } from "./domain/types";
import { applyUidVerification, checkUidAutomatically, financeAtUidUrl } from "./domain/uidCheckApi";
import { downloadText, formatDate, moneyFormatter, nowLabel, roundMoney } from "./domain/utils";

type ImportNotice = {
  id: string;
  state: SignalState;
  title: string;
  detail: string;
};

type WorkflowStep = {
  label: string;
  state: SignalState;
};

function App() {
  const [invoices, setInvoices] = useState<Invoice[]>(() => loadInvoices(initialInvoices));
  const [selectedId, setSelectedId] = useState(() => loadInvoices(initialInvoices)[0]?.id ?? initialInvoices[0].id);
  const [adapter, setAdapter] = useState<ExportAdapter>("Universal CSV");
  const [role, setRole] = useState<UserRole>("bookkeeper");
  const [learnedRules, setLearnedRules] = useState(countLearnedRules());
  const [query, setQuery] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isCheckingUid, setIsCheckingUid] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showEmailImport, setShowEmailImport] = useState(false);
  const [emailText, setEmailText] = useState("");
  const [importNotices, setImportNotices] = useState<ImportNotice[]>([]);
  const [apiStatus, setApiStatus] = useState<"checking" | "online" | "offline">("checking");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    saveInvoices(invoices);
  }, [invoices]);

  useEffect(() => {
    const baseUrl = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
    fetch(`${baseUrl}/api/health`)
      .then((response) => setApiStatus(response.ok ? "online" : "offline"))
      .catch(() => setApiStatus("offline"));
  }, []);

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

  const workflowSteps = useMemo(() => buildWorkflowSteps(selectedInvoice), [selectedInvoice]);

  const updateInvoice = (nextInvoice: Invoice) => {
    setInvoices((current) =>
      current.map((invoice) => (invoice.id === nextInvoice.id ? nextInvoice : invoice)),
    );
  };

  const mutateSelectedInvoice = (mutator: (invoice: Invoice) => Invoice, recalculateTotals = false) => {
    if (!selectedInvoice || !canEdit) return;
    setInvoices((current) =>
      current.map((invoice) => {
        if (invoice.id !== selectedInvoice.id) return invoice;
        const mutated = mutator(invoice);
        return refreshInvoiceDraft(mutated, current, recalculateTotals);
      }),
    );
  };

  const updateField = (field: keyof Invoice, value: string) => {
    if (!selectedInvoice || !canEdit) return;
    const numericFields: Array<keyof Invoice> = ["net", "vatRate", "vat", "gross", "qualityScore", "extractionConfidence"];
    const parsedValue = numericFields.includes(field) ? Number(value) : value;
    mutateSelectedInvoice((invoice) => ({ ...invoice, [field]: parsedValue } as Invoice));
  };

  const updatePaymentMethod = (paymentMethod: PaymentMethod) => {
    mutateSelectedInvoice((invoice) => ({ ...invoice, paymentMethod }));
  };

  const updateLineItem = (index: number, field: keyof LineItem, value: string) => {
    mutateSelectedInvoice((invoice) => {
      const lineItems = invoice.lineItems.map((item, itemIndex) => {
        if (itemIndex !== index) return item;
        const numericFields: Array<keyof LineItem> = ["amount", "taxRate", "quantity", "unitPrice"];
        return {
          ...item,
          [field]: numericFields.includes(field) ? Number(value) : value,
        };
      });
      return withLineItemTotals({ ...invoice, lineItems });
    });
  };

  const addLineItem = () => {
    mutateSelectedInvoice((invoice) => ({
      ...invoice,
      lineItems: [
        ...invoice.lineItems,
        {
          description: "",
          amount: 0,
          taxRate: invoice.vatRate || 20,
          quantity: 1,
          unit: "Stk",
          unitPrice: 0,
        },
      ],
    }));
  };

  const removeLineItem = (index: number) => {
    mutateSelectedInvoice((invoice) => withLineItemTotals({
      ...invoice,
      lineItems: invoice.lineItems.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const recalculateSelectedFromLines = () => {
    mutateSelectedInvoice((invoice) => ({
      ...withLineItemTotals(invoice),
      audit: [...invoice.audit, { time: nowLabel(), label: "Beträge aus Positionszeilen neu berechnet" }],
    }));
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
    setIsImporting(true);
    const acceptedInvoices: Invoice[] = [];
    const notices: ImportNotice[] = [];

    for (const file of files) {
      try {
        const input = await parseImportedFile(file);
        const context = createRiskContext([...acceptedInvoices, ...invoices]);
        const invoice = createInvoiceRecord(input, context);
        if (invoice.scanReport.status === "risk") {
          notices.push({
            id: `${file.name}-${Date.now()}-rejected`,
            state: "risk",
            title: `${file.name} abgewiesen`,
            detail: invoice.scanReport.hints.join(" "),
          });
          continue;
        }

        const checkedInvoice = await verifyUidIfPossible(invoice);
        acceptedInvoices.push(checkedInvoice);
        notices.push({
          id: `${file.name}-${Date.now()}-accepted`,
          state: getInvoiceState(checkedInvoice),
          title: `${file.name} importiert`,
          detail: `${checkedInvoice.invoiceNumber || "ohne Rechnungsnummer"} · ${checkedInvoice.supplier || "Lieferant offen"}`,
        });
      } catch (error) {
        notices.push({
          id: `${file.name}-${Date.now()}-failed`,
          state: "risk",
          title: `${file.name} nicht importiert`,
          detail: error instanceof Error ? error.message : "Import fehlgeschlagen.",
        });
      }
    }

    if (acceptedInvoices.length > 0) {
      setInvoices((current) => [...acceptedInvoices, ...current]);
      setSelectedId(acceptedInvoices[0].id);
    }
    setImportNotices((current) => [...notices, ...current].slice(0, 6));
    setIsImporting(false);
  };

  const importEmailInvoice = async () => {
    const content = emailText.trim();
    if (!content) return;
    const file = new File([content], `email-import-${Date.now()}.eml`, { type: "message/rfc822" });
    await importFiles([file]);
    setEmailText("");
    setShowEmailImport(false);
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
    } catch (error) {
      setImportNotices((current) => [
        {
          id: `uid-${selectedInvoice.id}-${Date.now()}`,
          state: "risk" as const,
          title: "UID-Prüfung fehlgeschlagen",
          detail: error instanceof Error ? error.message : "Der UID-Dienst hat nicht geantwortet.",
        },
        ...current,
      ].slice(0, 6));
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
    updateInvoice({
      ...selectedInvoice,
      audit: [...selectedInvoice.audit, { time: nowLabel(), label: `${adapter}-Export heruntergeladen` }],
    });
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
          <span className={`system-status ${apiStatus}`}>
            <Server size={14} />
            {apiStatus === "online" ? "API aktiv" : apiStatus === "checking" ? "API prüft" : "Lokale Prüfung"}
          </span>
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
              accept=".pdf,.xml,.txt,.eml,.ubl,.jpg,.jpeg,.png,.webp"
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
            disabled={isImporting}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            <Upload size={20} />
            <span>{isImporting ? "Import läuft" : "Datei importieren"}</span>
            <small>PDF, JPG, PNG, XML, UBL, E-Mail</small>
          </button>

          <button className="camera-zone" onClick={() => cameraInputRef.current?.click()} disabled={isImporting}>
            <Camera size={18} />
            <span>Scan mit Kamera</span>
          </button>

          <button className="camera-zone" onClick={() => setShowEmailImport((current) => !current)}>
            <Mail size={18} />
            <span>E-Mail-Text importieren</span>
          </button>

          {showEmailImport && (
            <div className="email-import">
              <textarea
                value={emailText}
                onChange={(event) => setEmailText(event.target.value)}
                placeholder="Rechnungsmail oder Text einfügen"
                aria-label="E-Mail-Rechnungstext"
              />
              <button className="primary-action" onClick={importEmailInvoice} disabled={!emailText.trim() || isImporting}>
                <Upload size={16} />
                Importieren
              </button>
            </div>
          )}

          {importNotices.length > 0 && (
            <div className="import-events" aria-label="Importprotokoll">
              {importNotices.map((notice) => (
                <div key={notice.id} className={`import-event ${notice.state}`}>
                  <SignalIcon state={notice.state} />
                  <div>
                    <strong>{notice.title}</strong>
                    <span>{notice.detail}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

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
            <details className="extracted-text">
              <summary>Extrahierter Dokumenttext</summary>
              <pre>{selectedInvoice.extractedText || "Kein Dokumenttext gespeichert."}</pre>
            </details>
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

          <WorkflowStrip steps={workflowSteps} />

          <div className="field-grid">
            <Field disabled={!canEdit} label="Lieferant" value={selectedInvoice.supplier} onChange={(value) => updateField("supplier", value)} />
            <Field disabled={!canEdit} label="Adresse Lieferant" value={selectedInvoice.supplierAddress} onChange={(value) => updateField("supplierAddress", value)} />
            <Field disabled={!canEdit} label="UID Lieferant" value={selectedInvoice.supplierUid} onChange={(value) => updateField("supplierUid", value)} />
            <Field disabled={!canEdit} label="Empfänger" value={selectedInvoice.recipient} onChange={(value) => updateField("recipient", value)} />
            <Field disabled={!canEdit} label="Adresse Empfänger" value={selectedInvoice.recipientAddress} onChange={(value) => updateField("recipientAddress", value)} />
            <Field disabled={!canEdit} label="UID Empfänger" value={selectedInvoice.recipientUid} onChange={(value) => updateField("recipientUid", value)} />
            <Field disabled={!canEdit} label="Rechnungsnummer" value={selectedInvoice.invoiceNumber} onChange={(value) => updateField("invoiceNumber", value)} />
            <Field disabled={!canEdit} label="Rechnungsdatum" value={selectedInvoice.issueDate} type="date" onChange={(value) => updateField("issueDate", value)} />
            <Field disabled={!canEdit} label="Leistungsdatum" value={selectedInvoice.serviceDate} type="date" onChange={(value) => updateField("serviceDate", value)} />
            <Field disabled={!canEdit} label="Fälligkeitsdatum" value={selectedInvoice.dueDate} type="date" onChange={(value) => updateField("dueDate", value)} />
            <Field disabled={!canEdit} label="IBAN" value={selectedInvoice.iban} onChange={(value) => updateField("iban", value)} />
            <Field disabled={!canEdit} label="BIC" value={selectedInvoice.bic} onChange={(value) => updateField("bic", value)} />
            <Field disabled={!canEdit} label="Währung" value={selectedInvoice.currency} onChange={(value) => updateField("currency", value)} />
            <Field disabled={!canEdit} label="Quelle" value={selectedInvoice.source} onChange={(value) => updateField("source", value)} />
            <Field disabled={!canEdit} label="Dokumenttyp" value={selectedInvoice.documentType} onChange={(value) => updateField("documentType", value)} />
            <Field disabled={!canEdit} label="Netto" value={String(selectedInvoice.net)} type="number" onChange={(value) => updateField("net", value)} />
            <Field disabled={!canEdit} label="USt. %" value={String(selectedInvoice.vatRate)} type="number" onChange={(value) => updateField("vatRate", value)} />
            <Field disabled={!canEdit} label="Steuer" value={String(selectedInvoice.vat)} type="number" onChange={(value) => updateField("vat", value)} />
            <Field disabled={!canEdit} label="Brutto" value={String(selectedInvoice.gross)} type="number" onChange={(value) => updateField("gross", value)} />
            <SelectField
              disabled={!canEdit}
              label="Zahlungsart"
              value={selectedInvoice.paymentMethod}
              options={[
                { value: "open", label: "Offen" },
                { value: "bank", label: "Bank bezahlt" },
                { value: "cash", label: "Bar/Kassa bezahlt" },
              ]}
              onChange={(value) => updatePaymentMethod(value as PaymentMethod)}
            />
            <Field disabled={!canEdit} label="Reverse-Charge-/Sonderhinweis" value={selectedInvoice.reverseChargeNote} onChange={(value) => updateField("reverseChargeNote", value)} />
          </div>

          <section className="line-editor" aria-label="Positionszeilen">
            <div className="section-title">
              <Calculator size={17} />
              <span>Positionszeilen</span>
            </div>
            <div className="line-table">
              {selectedInvoice.lineItems.map((item, index) => (
                <div className="line-edit-row" key={`${selectedInvoice.id}-line-${index}`}>
                  <Field disabled={!canEdit} label="Beschreibung" value={item.description} onChange={(value) => updateLineItem(index, "description", value)} />
                  <Field disabled={!canEdit} label="Menge" value={String(item.quantity ?? 1)} type="number" onChange={(value) => updateLineItem(index, "quantity", value)} />
                  <Field disabled={!canEdit} label="Einheit" value={item.unit ?? ""} onChange={(value) => updateLineItem(index, "unit", value)} />
                  <Field disabled={!canEdit} label="Betrag netto" value={String(item.amount)} type="number" onChange={(value) => updateLineItem(index, "amount", value)} />
                  <Field disabled={!canEdit} label="USt. %" value={String(item.taxRate)} type="number" onChange={(value) => updateLineItem(index, "taxRate", value)} />
                  <button className="icon-button danger" title="Position entfernen" aria-label="Position entfernen" onClick={() => removeLineItem(index)} disabled={!canEdit || selectedInvoice.lineItems.length <= 1}>
                    <Trash2 size={17} />
                  </button>
                </div>
              ))}
            </div>
            <div className="line-actions">
              <button className="secondary-action" onClick={addLineItem} disabled={!canEdit}>
                <Plus size={17} />
                Position
              </button>
              <button className="secondary-action" onClick={recalculateSelectedFromLines} disabled={!canEdit}>
                <Calculator size={17} />
                Summen berechnen
              </button>
            </div>
          </section>

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
  type?: "text" | "number" | "date";
  onChange: (value: string) => void;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input disabled={disabled} type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
  disabled = false,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <select disabled={disabled} value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
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

function WorkflowStrip({ steps }: { steps: WorkflowStep[] }) {
  return (
    <div className="workflow-strip" aria-label="Workflowstatus">
      {steps.map((step) => (
        <div key={step.label} className={`workflow-step ${step.state}`}>
          <SignalIcon state={step.state} />
          <span>{step.label}</span>
        </div>
      ))}
    </div>
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

function withLineItemTotals(invoice: Invoice): Invoice {
  const net = roundMoney(invoice.lineItems.reduce((sum, item) => sum + Number(item.amount || 0), 0));
  const vat = roundMoney(invoice.lineItems.reduce((sum, item) => sum + (Number(item.amount || 0) * Number(item.taxRate || 0)) / 100, 0));
  const gross = roundMoney(net + vat);
  const rates = Array.from(new Set(invoice.lineItems.map((item) => Number(item.taxRate || 0))));
  const vatRate = rates.length === 1 ? rates[0] : 0;
  const taxCode = invoice.reverseChargeNote.trim() ? "RC" : rates.length === 1 ? `V${vatRate}` : "MIX";

  return {
    ...invoice,
    net,
    vat,
    gross,
    vatRate,
    taxCode,
  };
}

function buildWorkflowSteps(invoice: Invoice): WorkflowStep[] {
  const complianceState = invoice.checks.some((check) => check.state === "risk")
    ? "risk"
    : invoice.checks.some((check) => check.state === "warn")
      ? "warn"
      : "ok";
  const riskState = invoice.risks.some((risk) => risk.state === "risk")
    ? "risk"
    : invoice.risks.some((risk) => risk.state === "warn")
      ? "warn"
      : "ok";
  const bookingState: SignalState = invoice.category && invoice.debitAccount && invoice.creditAccount && invoice.taxCode ? "ok" : "warn";
  const exportState: SignalState = invoice.status === "approved" ? "ok" : invoice.status === "blocked" ? "risk" : "warn";

  return [
    { label: "Import", state: invoice.source ? "ok" : "warn" },
    { label: "Scan", state: invoice.scanReport.status },
    { label: "§ 11", state: complianceState },
    { label: "Risiko", state: riskState },
    { label: "Buchung", state: bookingState },
    { label: "Export", state: exportState },
  ];
}

export default App;
