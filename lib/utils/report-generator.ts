import { jsPDF } from 'jspdf';
import { AIMessage } from '@/lib/types';
import { MapData } from '@/components/map/map-data-context';
import markdownToTxt from 'markdown-to-txt';

export interface ReportData {
  messages: AIMessage[];
  drawnFeatures: MapData['drawnFeatures'];
  mapSnapshot: string;
  chatTitle: string;
}

export async function generateReport({
  messages,
  drawnFeatures,
  mapSnapshot,
  chatTitle
}: ReportData) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;
  let yOffset = margin;

  const checkPageBreak = (neededHeight: number) => {
    if (yOffset + neededHeight > pageHeight - margin) {
      doc.addPage();
      yOffset = margin;
      return true;
    }
    return false;
  };

  const addTextWithAutoPageBreak = (text: string, fontSize: number, style: 'normal' | 'bold' = 'normal', color: [number, number, number] = [0, 0, 0]) => {
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', style);
    doc.setTextColor(color[0], color[1], color[2]);

    const lines: string[] = doc.splitTextToSize(text, contentWidth);
    for (const line of lines) {
        if (yOffset + 7 > pageHeight - margin) {
            doc.addPage();
            yOffset = margin;
        }
        doc.text(line, margin, yOffset);
        yOffset += 7;
    }
    yOffset += 3; // Small gap after text blocks
  };

  // --- Cover Page ---
  doc.setFontSize(24);
  doc.setTextColor(40, 40, 40);
  doc.text('QCX Analysis Report', margin, yOffset);
  yOffset += 15;

  doc.setFontSize(18);
  doc.text(chatTitle || 'Untitled Chat', margin, yOffset);
  yOffset += 10;

  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, margin, yOffset);
  yOffset += 20;

  if (mapSnapshot) {
    try {
      const imgHeight = (contentWidth * 9) / 16;
      checkPageBreak(imgHeight);
      doc.addImage(mapSnapshot, 'PNG', margin, yOffset, contentWidth, imgHeight);
      yOffset += imgHeight + 20;
    } catch (e) {
      console.error('Error adding map snapshot to PDF:', e);
    }
  }

  // --- Q&A Section ---
  doc.setFontSize(16);
  doc.setTextColor(40, 40, 40);
  checkPageBreak(10);
  doc.text('Conversation History', margin, yOffset);
  yOffset += 10;

  const userMessages = messages.filter(m => m.type === 'input' || m.type === 'input_related');

  for (const userMsg of userMessages) {
    let userContent = '';
    try {
        const json = JSON.parse(userMsg.content as string);
        userContent = userMsg.type === 'input' ? json.input : json.related_query;
    } catch (e) {
        userContent = userMsg.content as string;
    }

    addTextWithAutoPageBreak(`User: ${userContent}`, 12, 'bold', [60, 60, 60]);

    const userIdx = messages.indexOf(userMsg);
    const nextUserIdx = messages.findIndex((m, i) => i > userIdx && (m.type === 'input' || m.type === 'input_related'));
    const turnMessages = messages.slice(userIdx + 1, nextUserIdx === -1 ? undefined : nextUserIdx);

    const aiResponse = turnMessages.find(m => m.type === 'response');
    if (aiResponse) {
      // Render markdown as plain text
      const plainTextAI = markdownToTxt(aiResponse.content as string);
      addTextWithAutoPageBreak(`QCX: ${plainTextAI}`, 12, 'normal', [80, 80, 80]);
    }

    const searchResult = turnMessages.find(m => m.type === 'resolution_search_result');
    if (searchResult) {
      try {
        const data = JSON.parse(searchResult.content as string);

        // GeoJSON Summary
        if (data.summary) {
            addTextWithAutoPageBreak(`Analysis Summary: ${data.summary}`, 11, 'normal', [80, 80, 80]);
        }

        const images = [data.mapboxImage, data.googleImage, data.image].filter(Boolean);
        if (images.length > 0) {
            const imgWidth = (contentWidth - 10) / 2;
            const imgHeight = (imgWidth * 3) / 4;

            checkPageBreak(imgHeight + 10);

            for (let i = 0; i < Math.min(images.length, 2); i++) {
                doc.addImage(images[i], 'JPEG', margin + (i * (imgWidth + 10)), yOffset, imgWidth, imgHeight);
            }
            yOffset += imgHeight + 10;
        }
      } catch (e) {
        console.error('Error parsing resolution search result for PDF:', e);
      }
    }

    yOffset += 5;
  }

  // --- Drawings Appendix ---
  if (drawnFeatures && drawnFeatures.length > 0) {
    doc.addPage();
    yOffset = margin;

    doc.setFontSize(16);
    doc.setTextColor(40, 40, 40);
    doc.setFont('helvetica', 'bold');
    doc.text('Drawings & Measurements', margin, yOffset);
    yOffset += 15;

    drawnFeatures.forEach((feature, index) => {
      checkPageBreak(25);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`${index + 1}. ${feature.type}`, margin, yOffset);
      yOffset += 7;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Measurement: ${feature.measurement}`, margin + 5, yOffset);
      yOffset += 7;

      const coords = JSON.stringify(feature.geometry.coordinates).substring(0, 100) + '...';
      doc.text(`Coordinates: ${coords}`, margin + 5, yOffset);
      yOffset += 10;
    });
  }

  doc.save(`${chatTitle || 'QCX-Report'}.pdf`);
}
