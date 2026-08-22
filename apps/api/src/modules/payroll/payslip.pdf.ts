/**
 * Renders a `PayrollRecord` as a downloadable payslip PDF (differentiator #5).
 * Pure rendering — takes plain data, returns a `Buffer`; the controller sets the
 * `Content-Type: application/pdf` header and streams it to the response.
 */
import PDFDocument from 'pdfkit';

/** Everything the payslip layout needs — the caller assembles this from Prisma rows. */
export interface PayslipData {
  companyName: string;
  employeeName: string;
  employeeCode: string;
  designation?: string | null;
  month: number;
  year: number;
  workingDays: number;
  payableDays: number;
  earnings: {
    basic: number;
    hra: number;
    standardAllowance: number;
    performanceBonus: number;
    lta: number;
    fixedAllowance: number;
    gross: number;
  };
  deductions: {
    pfEmployee: number;
    professionalTax: number;
    total: number;
  };
  monthlyNet: number;
  netSalary: number;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const inr = (amount: number): string =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount);

/** Renders a deterministic, single-page payslip PDF and resolves the full buffer. */
export function renderPayslipPdf(data: PayslipData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(18).text(data.companyName, { align: 'left' });
    doc.fontSize(12).fillColor('#555').text('Payslip', { align: 'left' });
    doc.moveDown(0.5);
    doc
      .fontSize(10)
      .fillColor('#000')
      .text(`Pay period: ${MONTH_NAMES[data.month - 1]} ${data.year}`);
    doc.moveDown(1);

    doc.fontSize(11).text(`Employee: ${data.employeeName} (${data.employeeCode})`);
    if (data.designation) doc.text(`Designation: ${data.designation}`);
    doc.text(`Payable days: ${data.payableDays} / ${data.workingDays} working days`);
    doc.moveDown(1);

    const row = (label: string, amount: number): void => {
      const y = doc.y;
      doc.fontSize(10).text(label, 60, y);
      doc.text(inr(amount), 400, y, { width: 140, align: 'right' });
    };

    doc.fontSize(12).text('Earnings', { underline: true });
    doc.moveDown(0.3);
    row('Basic Salary', data.earnings.basic);
    row('House Rent Allowance', data.earnings.hra);
    row('Standard Allowance', data.earnings.standardAllowance);
    row('Performance Bonus', data.earnings.performanceBonus);
    row('Leave Travel Allowance', data.earnings.lta);
    row('Fixed Allowance', data.earnings.fixedAllowance);
    doc.moveDown(0.3);
    row('Gross Earnings', data.earnings.gross);
    doc.moveDown(1);

    doc.fontSize(12).text('Deductions', { underline: true });
    doc.moveDown(0.3);
    row('Provident Fund (Employee)', data.deductions.pfEmployee);
    row('Professional Tax', data.deductions.professionalTax);
    doc.moveDown(0.3);
    row('Total Deductions', data.deductions.total);
    doc.moveDown(1);

    row('Monthly Net (before proration)', data.monthlyNet);
    doc.moveDown(0.3);
    doc.fontSize(13).text('Net Salary', 60, doc.y);
    doc.fontSize(13).text(inr(data.netSalary), 400, doc.y - doc.currentLineHeight(), {
      width: 140,
      align: 'right',
    });

    doc.moveDown(2);
    doc
      .fontSize(8)
      .fillColor('#888')
      .text('This is a system-generated payslip.', { align: 'center' });

    doc.end();
  });
}
