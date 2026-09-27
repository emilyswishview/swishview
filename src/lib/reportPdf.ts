import jsPDF from "jspdf";
import JSZip from "jszip";
import html2canvas from "html2canvas";
import { ensureChannelReport } from "./channelReport";

export interface ReportLead {
  channelLink: string;
  channelName?: string;
  extra?: Record<string, any>;
}

const safeName = (value: string) => value.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").slice(0, 50) || "channel";

const waitForReport = (frame: HTMLIFrameElement) => new Promise<Document>((resolve, reject) => {
  const timeout = window.setTimeout(() => reject(new Error("Report preview timed out")), 45_000);
  const check = () => {
    const doc = frame.contentDocument;
    const report = doc?.querySelector<HTMLElement>("[data-report-document]");
    if (doc?.body.dataset.reportCaptureReady === "true" && report) {
      window.clearTimeout(timeout);
      resolve(doc);
      return;
    }
    window.setTimeout(check, 150);
  };
  check();
});

/** Captures the actual report page so the downloaded PDF matches its web link. */
async function buildChannelPdf(lead: ReportLead): Promise<{ name: string; blob: Blob }> {
  const slug = await ensureChannelReport(lead.channelLink.trim());
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  Object.assign(frame.style, {
    position: "fixed", left: "-10000px", top: "0", width: "900px", height: "1400px",
    border: "0", opacity: "0", pointerEvents: "none",
  });
  frame.src = `${window.location.origin}/report/${slug}?capture=1`;
  document.body.appendChild(frame);

  try {
    await new Promise<void>((resolve, reject) => {
      frame.onload = () => resolve();
      frame.onerror = () => reject(new Error("Report preview could not load"));
    });
    const frameDoc = await waitForReport(frame);
    const report = frameDoc.querySelector<HTMLElement>("[data-report-document]");
    if (!report) throw new Error("Report content was not found");

    const canvas = await html2canvas(report, {
      backgroundColor: "#ffffff",
      scale: 2,
      useCORS: true,
      logging: false,
      windowWidth: 900,
      onclone: (doc) => doc.body.classList.add("report-pdf-capture"),
    });

    const pdf = new jsPDF({ unit: "pt", format: "a4", compress: true });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const sourcePageHeight = Math.floor(canvas.width * (pageHeight / pageWidth));
    const reportRect = report.getBoundingClientRect();
    const scale = canvas.width / reportRect.width;
    const boundaries = Array.from(report.querySelectorAll<HTMLElement>("[data-pdf-section]"))
      .map(el => Math.round((el.getBoundingClientRect().bottom - reportRect.top) * scale))
      .filter(y => y > 0 && y < canvas.height)
      .sort((a, b) => a - b);
    boundaries.push(canvas.height);

    let sourceY = 0;
    let page = 0;
    while (sourceY < canvas.height) {
      const idealEnd = Math.min(canvas.height, sourceY + sourcePageHeight);
      const safeEnd = boundaries.filter(y => y > sourceY + sourcePageHeight * 0.45 && y <= idealEnd).pop();
      const sourceEnd = safeEnd ?? idealEnd;
      const slice = document.createElement("canvas");
      slice.width = canvas.width;
      slice.height = sourceEnd - sourceY;
      const context = slice.getContext("2d");
      if (!context) throw new Error("PDF image could not be prepared");
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, slice.width, slice.height);
      context.drawImage(canvas, 0, sourceY, canvas.width, slice.height, 0, 0, slice.width, slice.height);
      if (page > 0) pdf.addPage();
      const renderedHeight = pageWidth * (slice.height / slice.width);
      pdf.addImage(slice.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, pageWidth, renderedHeight, undefined, "FAST");
      sourceY = sourceEnd;
      page += 1;
    }
    return { name: `${safeName(lead.channelName || slug)}-report.pdf`, blob: pdf.output("blob") };
  } finally {
    frame.remove();
  }
}

const escapeCsv = (v: any) => {
  const s = v === null || v === undefined ? "" : String(v).replace(/\r?\n/g, " ");
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};

function downloadBlob(blob: Blob, filename: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

/**
 * Generates real PDF reports for the given leads, downloads them as a ZIP,
 * plus a CSV sheet whose "Report PDF" column names the attached PDF file.
 * Also saves each report to the database (via ensureChannelReport).
 */
export async function downloadLeadReportsZip(
  leads: ReportLead[],
  sheetColumns: { header: string; value: (l: ReportLead) => any }[],
  baseName: string,
  onProgress?: (msg: string) => void,
) {
  const zip = new JSZip();
  const pdfNames = new Map<string, string>();
  let done = 0, failed = 0;
  // Capture sequentially: each report temporarily renders a full chart page.
  for (const lead of leads) {
    const link = lead.channelLink.trim();
    if (!link) { failed++; continue; }
    try {
      const pdf = await buildChannelPdf(lead);
      let name = pdf.name, n = 1;
      while (zip.file(name)) name = pdf.name.replace(/\.pdf$/, `-${++n}.pdf`);
      zip.file(name, pdf.blob);
      pdfNames.set(link, name);
    } catch (error) {
      console.error("Report capture failed", link, error);
      failed++;
    }
    onProgress?.(`PDF ${++done}/${leads.length}`);
  }

  if (pdfNames.size === 0) throw new Error("No PDF reports could be generated");

  onProgress?.("Zipping…");
  const zipBlob = await zip.generateAsync({ type: "blob" });
  const date = new Date().toISOString().slice(0, 10);
  downloadBlob(zipBlob, `${baseName}-reports-${date}.zip`);

  const header = [...sheetColumns.map(c => c.header), "Report PDF"];
  const lines = [header, ...leads.map(l => [
    ...sheetColumns.map(c => c.value(l)),
    pdfNames.get(l.channelLink.trim()) || "",
  ])].map(r => r.map(escapeCsv).join(","));
  downloadBlob(new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" }), `${baseName}-reports-${date}.csv`);

  return { made: pdfNames.size, failed };
}
