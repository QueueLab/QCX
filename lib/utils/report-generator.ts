export const generatePDFReport = async (elementId: string, fileName: string) => {
  const element = document.getElementById(elementId)
  if (!element) {
    console.error(`Element with id ${elementId} not found in the DOM.`)
    throw new Error(`Element with id ${elementId} not found.`)
  }

  try {
    const [jsPDF, html2canvas] = await Promise.all([
      import('jspdf').then(mod => mod.jsPDF),
      import('html2canvas').then(mod => mod.default)
    ])

    const images = Array.from(element.getElementsByTagName('img'))
    const imageLoadTimeout = 10000

    await Promise.race([
      Promise.all(
        images.map(img => {
          if (img.complete) return Promise.resolve()
          return new Promise((resolve) => {
            img.onload = resolve
            img.onerror = resolve
            if (img.src.startsWith('data:')) setTimeout(resolve, 500)
          })
        })
      ),
      new Promise(resolve => setTimeout(resolve, imageLoadTimeout))
    ])

    const templateWidth = 800 // The width we force for PDF generation

    // To get accurate positions for the 800px width used in the PDF,
    // we temporarily set the element width.
    const originalStyle = element.getAttribute('style') || ''
    element.style.width = `${templateWidth}px`
    element.style.position = 'relative'

    const templateRect = element.getBoundingClientRect()
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'px',
      format: 'a4'
    })

    const pdfWidth = pdf.internal.pageSize.getWidth()
    const pdfHeight = pdf.internal.pageSize.getHeight()
    const pdfScale = pdfWidth / templateWidth

    const protectedRanges = Array.from(element.querySelectorAll('[data-pdf-nosplit]'))
      .map(el => {
        const rect = el.getBoundingClientRect()
        return {
          top: (rect.top - templateRect.top) * pdfScale,
          bottom: (rect.bottom - templateRect.top) * pdfScale
        }
      })
      .sort((a, b) => a.top - b.top)

    // Restore original style
    element.setAttribute('style', originalStyle)

    const canvas = await html2canvas(element, {
      scale: 3,
      useCORS: true,
      logging: false,
      allowTaint: true,
      backgroundColor: '#ffffff',
      imageTimeout: 15000,
      onclone: (clonedDoc) => {
        const clonedElement = clonedDoc.getElementById(elementId)
        if (clonedElement) {
          clonedElement.style.position = 'static'
          clonedElement.style.left = '0'
          clonedElement.style.visibility = 'visible'
          clonedElement.style.width = `${templateWidth}px`
        }
      }
    })

    const imgData = canvas.toDataURL('image/png')
    const imgProps = pdf.getImageProperties(imgData)
    const scaledHeight = pdfWidth * (imgProps.height / imgProps.width)

    let currentPosition = 0

    while (currentPosition < scaledHeight - 0.5) {
      if (currentPosition > 0) {
        pdf.addPage()
      }

      let nextPossibleCut = currentPosition + pdfHeight
      let effectiveCut = nextPossibleCut

      if (nextPossibleCut < scaledHeight) {
        const straddle = protectedRanges.find(range =>
          nextPossibleCut > range.top && nextPossibleCut < range.bottom
        )

        // Only move the cut if the element starts after our current position (with small buffer)
        // and fits on a single page.
        if (straddle && straddle.top > currentPosition + 10) {
          const elementHeight = straddle.bottom - straddle.top
          if (elementHeight <= pdfHeight) {
            effectiveCut = straddle.top
          }
        }
      } else {
        effectiveCut = scaledHeight
      }

      pdf.addImage(imgData, 'PNG', 0, -currentPosition, pdfWidth, scaledHeight, undefined, 'FAST')
      currentPosition = effectiveCut
    }

    pdf.save(`${fileName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_report.pdf`)
  } catch (error) {
    console.error('Error generating PDF:', error)
    throw error
  }
}
