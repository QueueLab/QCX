import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'

export const generatePDFReport = async (elementId: string, fileName: string) => {
  const element = document.getElementById(elementId)
  if (!element) {
    throw new Error(`Element with id ${elementId} not found`)
  }

  try {
    const canvas = await html2canvas(element, {
      scale: 2, // Higher scale for better quality
      useCORS: true, // Allow loading images from different domains
      logging: false,
      allowTaint: true
    })

    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'px',
      format: 'a4'
    })

    const imgProps = pdf.getImageProperties(imgData)
    const pdfWidth = pdf.internal.pageSize.getWidth()
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width

    // Handle multi-page if necessary (though html2canvas captures the whole element)
    // For simplicity in this implementation, we'll scale it to one page or use multiple pages if it's very long

    let heightLeft = pdfHeight
    let position = 0
    const pageHeight = pdf.internal.pageSize.getHeight()

    pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight)
    heightLeft -= pageHeight

    while (heightLeft >= 0) {
      position = heightLeft - pdfHeight
      pdf.addPage()
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight)
      heightLeft -= pageHeight
    }

    pdf.save(`${fileName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_report.pdf`)
  } catch (error) {
    console.error('Error generating PDF:', error)
    throw error
  }
}
