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
    const imageLoadTimeout = 10000 // 10 seconds timeout for high-res images

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
      scale: 3, // Increased scale for ultra-sharp text and images
      useCORS: true,
      logging: false,
      allowTaint: true,
      backgroundColor: '#ffffff',
      imageTimeout: 15000,
      onclone: (clonedDoc) => {
        // Ensure the cloned element is visible for html2canvas
        const clonedElement = clonedDoc.getElementById(elementId)
        if (clonedElement) {
          clonedElement.style.position = 'static'
          clonedElement.style.left = '0'
          clonedElement.style.visibility = 'visible'
          clonedElement.style.width = '800px' // Fix width for consistent scaling
        }
      }
    })

    const imgData = canvas.toDataURL('image/png') // Use PNG for lossless quality and sharper text

    // A4 dimensions in px at 72 DPI are roughly 595 x 842
    // But we use the internal pageSize values for flexibility
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
    pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, scaledHeight, undefined, 'FAST')
    heightLeft -= pdfHeight

    // Add subsequent pages if content overflows
    while (heightLeft > 0) {
      position = heightLeft - scaledHeight
      pdf.addPage()
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, scaledHeight, undefined, 'FAST')
      heightLeft -= pdfHeight
    }

    pdf.save(`${fileName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_report.pdf`)
  } catch (error) {
    console.error('Error generating PDF:', error)
    throw error
  }
}
