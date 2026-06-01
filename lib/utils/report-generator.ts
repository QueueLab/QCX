export const generatePDFReport = async (elementId: string, fileName: string) => {
  const element = document.getElementById(elementId)
  if (!element) {
    console.error(`Element with id ${elementId} not found in the DOM`)
    throw new Error(`Element with id ${elementId} not found`)
  }

  try {
    const [jsPDF, html2canvas] = await Promise.all([
      import('jspdf').then(mod => mod.jsPDF),
      import('html2canvas').then(mod => mod.default)
    ])

    const images = Array.from(element.getElementsByTagName('img'))
    const imageLoadTimeout = 3000 // 3 seconds timeout

    await Promise.race([
      Promise.all(
        images.map(img => {
          if (img.complete) return Promise.resolve()
          return new Promise((resolve) => {
            img.onload = resolve
            img.onerror = resolve
            // Fallback for data URLs which might already be loaded
            if (img.src.startsWith('data:')) setTimeout(resolve, 100)
          })
        })
      ),
      new Promise(resolve => setTimeout(resolve, imageLoadTimeout))
    ])

    const canvas = await html2canvas(element, {
      scale: 1, // Reduced scale for speed
      useCORS: true,
      logging: false,
      allowTaint: true,
      backgroundColor: '#ffffff',
      imageTimeout: 5000,
      removeContainer: true
    })

    const imgData = canvas.toDataURL('image/jpeg', 0.7)
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'px',
      format: 'a4'
    })

    const pdfWidth = pdf.internal.pageSize.getWidth()
    const pdfHeight = pdf.internal.pageSize.getHeight()

    const imgProps = pdf.getImageProperties(imgData)
    const ratio = imgProps.height / imgProps.width
    const scaledHeight = pdfWidth * ratio

    let heightLeft = scaledHeight
    let position = 0

    pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, scaledHeight)
    heightLeft -= pdfHeight

    while (heightLeft >= 0) {
      position = heightLeft - scaledHeight
      pdf.addPage()
      pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, scaledHeight)
      heightLeft -= pdfHeight
    }

    pdf.save(`${fileName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_report.pdf`)
  } catch (error) {
    console.error('Error generating PDF:', error)
    throw error
  }
}
