import { jsPDF } from 'jspdf'

const BLUE = [68, 86, 244]
const BLUE_DARK = [30, 58, 138]
const CYAN = [14, 165, 233]
const INK = [15, 23, 42]
const MUTED = [100, 116, 139]
const LINE = [226, 232, 240]

function text(doc, value, x, y, options = {}) {
  doc.text(String(value ?? 'No registrado'), x, y, options)
}

function money(value) {
  return `Q${Number(value || 0).toFixed(2)}`
}

function drawDecor(doc) {
  doc.setFillColor(...BLUE_DARK)
  doc.rect(12, 12, 186, 28, 'F')
  doc.setFillColor(...BLUE)
  doc.circle(42, 12, 28, 'F')
  doc.setFillColor(...CYAN)
  doc.circle(88, 12, 24, 'F')
  doc.setFillColor(255, 255, 255)
  doc.circle(72, 36, 22, 'F')

  doc.setFillColor(...BLUE)
  doc.triangle(132, 285, 186, 285, 186, 260, 'F')
  doc.setFillColor(...CYAN)
  doc.circle(184, 272, 26, 'F')
  doc.setFillColor(...BLUE_DARK)
  doc.triangle(132, 285, 164, 263, 198, 285, 'F')
}

function drawHeader(doc, title, subtitle, generatedAt) {
  drawDecor(doc)

  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  text(doc, 'BIBLIOTECA MUNICIPAL', 20, 26)

  doc.setTextColor(...BLUE_DARK)
  doc.setFontSize(23)
  text(doc, title, 196, 30, { align: 'right' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...MUTED)
  text(doc, subtitle, 196, 39, { align: 'right' })
  text(doc, `Generado: ${generatedAt}`, 196, 45, { align: 'right' })
}

function drawSectionTitle(doc, title, x, y) {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...BLUE_DARK)
  text(doc, title, x, y)
}

function drawRows(doc, rows, x, y) {
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  rows.forEach(row => {
    doc.setTextColor(...MUTED)
    text(doc, `${row.label}:`, x, y)
    doc.setTextColor(...INK)
    const valueLines = doc.splitTextToSize(String(row.value ?? 'No registrado'), 62)
    text(doc, valueLines, x + 25, y)
    y += Math.max(5.5, valueLines.length * 4.2)
  })
  return y
}

function drawInfo(doc, leftTitle, leftRows, rightTitle, rightRows, y) {
  drawSectionTitle(doc, leftTitle, 18, y)
  drawSectionTitle(doc, rightTitle, 112, y)
  y += 7
  const leftEnd = drawRows(doc, leftRows, 18, y)
  const rightEnd = drawRows(doc, rightRows, 112, y)
  return Math.max(leftEnd, rightEnd) + 7
}

function drawTable(doc, rows, y) {
  const x = 18
  const widths = [12, 70, 58, 32]
  const headers = ['No', 'Concepto', 'Detalle', 'Monto']

  doc.setFillColor(...BLUE_DARK)
  doc.rect(x, y, 172, 9, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(255, 255, 255)
  let cx = x
  headers.forEach((header, index) => {
    text(doc, header, cx + 3, y + 6)
    cx += widths[index]
  })

  y += 9
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  rows.forEach((row, index) => {
    const fill = index % 2 === 0 ? [248, 250, 252] : [239, 246, 255]
    doc.setFillColor(...fill)
    doc.rect(x, y, 172, 9, 'F')
    doc.setTextColor(...INK)
    text(doc, index + 1, x + 3, y + 6)
    text(doc, doc.splitTextToSize(row.concepto || '-', 62), x + widths[0] + 3, y + 6)
    text(doc, doc.splitTextToSize(row.detalle || '-', 50), x + widths[0] + widths[1] + 3, y + 6)
    text(doc, row.monto || money(0), x + widths[0] + widths[1] + widths[2] + 3, y + 6)
    y += 9
  })

  doc.setDrawColor(...LINE)
  doc.line(x, y, x + 172, y)
  return y + 8
}

function drawTotal(doc, label, total, y) {
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...MUTED)
  text(doc, 'TOTAL', 132, y)

  doc.setFillColor(...BLUE_DARK)
  doc.rect(148, y - 6, 42, 9, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  text(doc, `${label}: ${money(total)}`, 169, y, { align: 'center' })
  return y + 18
}

function drawFooter(doc, generatedAt) {
  doc.setDrawColor(...LINE)
  doc.line(18, 248, 82, 248)
  doc.line(128, 248, 190, 248)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...INK)
  text(doc, 'Observaciones', 18, 255)
  text(doc, 'Firma / sello', 146, 255)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...MUTED)
  text(doc, 'Documento generado por el sistema de Gestion de Biblioteca.', 18, 262)
  text(doc, generatedAt, 18, 267)
}

export function crearPdfBiblioteca({
  title,
  subtitle,
  generatedAt,
  leftTitle,
  leftRows,
  rightTitle,
  rightRows,
  charges,
  totalLabel = 'TOTAL',
  total,
  fileName,
}) {
  const doc = new jsPDF()
  const rows = charges?.length ? charges : [{ concepto: 'Sin cargos', detalle: 'Sin multa', monto: money(0) }]

  drawHeader(doc, title, subtitle, generatedAt)
  let y = drawInfo(doc, leftTitle, leftRows, rightTitle, rightRows, 62)
  y = drawTable(doc, rows, Math.max(y, 118))
  drawTotal(doc, totalLabel, total, y)
  drawFooter(doc, generatedAt)

  doc.save(fileName)
}

export { money }
