
import { jsPDF } from "jspdf";

export const generateCertificate = (studentName: string, courseTitle: string, date: string) => {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4"
  });

  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();

  // --- Background & Border ---
  // Background Color (Subtle Cream/White)
  doc.setFillColor(252, 252, 250);
  doc.rect(0, 0, width, height, 'F');

  // Outer Border (Dark Slate)
  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(1.5);
  doc.rect(10, 10, width - 20, height - 20);

  // Inner Ornamental Border (Indigo)
  doc.setDrawColor(79, 70, 229); // Indigo 600
  doc.setLineWidth(0.5);
  doc.rect(15, 15, width - 30, height - 30);
  
  // Corner Accents
  const cornerSize = 15;
  doc.setDrawColor(79, 70, 229);
  doc.setLineWidth(2);
  
  // Top-Left
  doc.line(15, 15 + cornerSize, 15, 15);
  doc.line(15, 15, 15 + cornerSize, 15);
  
  // Top-Right
  doc.line(width - 15 - cornerSize, 15, width - 15, 15);
  doc.line(width - 15, 15, width - 15, 15 + cornerSize);

  // Bottom-Left
  doc.line(15, height - 15 - cornerSize, 15, height - 15);
  doc.line(15, height - 15, 15 + cornerSize, height - 15);

  // Bottom-Right
  doc.line(width - 15 - cornerSize, height - 15, width - 15, height - 15);
  doc.line(width - 15, height - 15, width - 15, height - 15 - cornerSize);

  // --- Header ---
  doc.setFont("times", "bold");
  doc.setFontSize(42);
  doc.setTextColor(30, 41, 59);
  doc.text("CERTIFICADO", width / 2, 55, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(14);
  doc.setTextColor(79, 70, 229);
  doc.text("DE FINALIZACIÓN", width / 2, 65, { align: "center" }); // SPACING

  // --- Recipient ---
  doc.setFontSize(12);
  doc.setTextColor(100, 116, 139); // Slate 500
  doc.text("OTORGADO A", width / 2, 85, { align: "center" });

  doc.setFont("times", "italic");
  doc.setFontSize(36);
  doc.setTextColor(17, 24, 39); // Gray 900
  doc.text(studentName, width / 2, 105, { align: "center" });
  
  // Decorative line under name
  doc.setDrawColor(203, 213, 225); // Slate 300
  doc.setLineWidth(0.5);
  doc.line(width / 2 - 60, 110, width / 2 + 60, 110);

  // --- Course Info ---
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(100, 116, 139);
  doc.text("Por haber completado satisfactoriamente el curso:", width / 2, 125, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(30, 41, 59);
  
  // Handle long course titles
  const splitTitle = doc.splitTextToSize(courseTitle, 180);
  doc.text(splitTitle, width / 2, 140, { align: "center" });

  // --- Footer / Signatures ---
  const signY = 175;
  
  // Simulated Gold Seal
  doc.setFillColor(234, 179, 8); // Gold
  doc.circle(45, 160, 16, 'F');
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(1);
  doc.circle(45, 160, 14, 'S');
  doc.setFontSize(6); // Smaller font for long name
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.text("STUFFACTORY", 45, 160, { align: "center" });
  
  // Date Section
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(71, 85, 105);
  doc.text(`Fecha: ${date}`, 45, 185, { align: "center" });

  // Signature Line
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.5);
  doc.line(200, signY, 260, signY);
  
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text("Director de Capacitación", 230, signY + 6, { align: "center" });
  
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text("STUFFACTORY Corporate", 230, signY + 11, { align: "center" });

  // --- Digital System Stamp ---
  doc.setFont("courier", "normal");
  doc.setFontSize(8);
  doc.setTextColor(156, 163, 175); // Gray 400
  const auditId = crypto.randomUUID().split('-')[0].toUpperCase();
  doc.text(`Digital Certificate ID: ${auditId} | Issued to ${studentName} | Validated by System`, width / 2, height - 8, { align: "center" });

  doc.save(`Certificado_${studentName.replace(/\s+/g, '_')}.pdf`);
};
