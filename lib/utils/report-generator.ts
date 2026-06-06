export const generatePDFReport = async (elementId: string, fileName: string) => {
  const element = document.getElementById(elementId)
  if (!element) {
    console.error(`Element with id ${elementId} not found in the DOM. Full document structure:`, document.body.innerHTML.substring(0, 500))
    throw new Error(`Element with id ${elementId} not found. Please try again.`)
  }

  try {
    const [jsPDF, html2canvas] = await Promise.all([
      import('jspdf').then(mod => mod.jsPDF),
      import('html2canvas').then(mod => mod.default)
    ])

    const images = Array.from(element.getElementsByTagName('img'))
    const imageLoadTimeout = 5000 // 5 seconds timeout

    // Wait for images to load, but don't block forever
    await Promise.race([
      Promise.all(
        images.map(img => {
          if (img.complete) return Promise.resolve()
          return new Promise((resolve) => {
            img.onload = resolve
            img.onerror = resolve // Continue even if one image fails
            // Force a check after a small delay for data URLs
            if (img.src.startsWith('data:')) setTimeout(resolve, 500)
          })
        })
      ),
      new Promise(resolve => setTimeout(resolve, imageLoadTimeout))
    ])

    const canvas = await html2canvas(element, {
      scale: 1, // Keep scale low for performance on large reports
      useCORS: true,
      logging: false,
      allowTaint: true,
      backgroundColor: '#ffffff',
      imageTimeout: 10000,
      onclone: (clonedDoc) => {
        // Ensure the cloned element is visible for html2canvas
        const clonedElement = clonedDoc.getElementById(elementId)
        if (clonedElement) {
          clonedElement.style.position = 'static'
          clonedElement.style.left = '0'
          clonedElement.style.visibility = 'visible'
        }
      }
    })

    const imgData = canvas.toDataURL('image/jpeg', 0.6)
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

    // Add first page
    pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, scaledHeight)
    heightLeft -= pdfHeight

    // Add subsequent pages if content overflows
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
