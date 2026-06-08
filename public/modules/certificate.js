/* ==========================================================================
   LITCRACK CERTIFICATE GENERATOR (jsPDF CANVAS-BASED VECTOR PDF)
   ========================================================================== */

(function() {
  // Expose function globally
  window.generatePDFCertificate = function(studentName, scorePercentage) {
    if (!window.jspdf) {
      alert("PDF library failed to load. Please check your internet connection.");
      return;
    }

    const { jsPDF } = window.jspdf;
    
    // Create new A4 Landscape PDF Document
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const width = doc.internal.pageSize.getWidth();  // 297mm
    const height = doc.internal.pageSize.getHeight(); // 210mm
    const today = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // 1. Draw Background & Outer Borders
    doc.setFillColor(253, 253, 251); // Soft vintage ivory
    doc.rect(0, 0, width, height, 'F');

    // Thin elegant border
    doc.setDrawColor(99, 102, 241); // Electric Indigo
    doc.setLineWidth(1.5);
    doc.rect(10, 10, width - 20, height - 20);

    // Double inner border
    doc.setDrawColor(245, 158, 11); // Amber/Gold
    doc.setLineWidth(0.5);
    doc.rect(13, 13, width - 26, height - 26);

    // Corner decorative details
    const corners = [
      [13, 13], [width - 13, 13], [13, height - 13], [width - 13, height - 13]
    ];
    doc.setDrawColor(245, 158, 11);
    doc.setLineWidth(1);
    corners.forEach(c => {
      // Draw small intersecting corner lines
      doc.line(c[0] - 5, c[1], c[0] + 5, c[1]);
      doc.line(c[0], c[1] - 5, c[0], c[1] + 5);
    });

    // 2. Header Logo & Badge
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(99, 102, 241);
    doc.text("KLE TECHNOLOGICAL UNIVERSITY - KLECET", width / 2, 28, { align: "center" });

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("LITERARY CLUB • TECH WING CREDENTIALS", width / 2, 33, { align: "center" });

    // Decorative Separator Line
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(70, 38, width - 70, 38);

    // 3. Certificate Title
    doc.setFont("Times", "bold");
    doc.setFontSize(26);
    doc.setTextColor(30, 41, 59); // Deep Slate
    doc.text("CERTIFICATE OF MERIT", width / 2, 52, { align: "center" });

    doc.setFont("Helvetica", "italic");
    doc.setFontSize(12);
    doc.setTextColor(71, 85, 105);
    doc.text("This is proudly presented to", width / 2, 65, { align: "center" });

    // 4. Recipient Name (Large, styled)
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(24);
    doc.setTextColor(79, 70, 229); // Royal Indigo
    doc.text(studentName.toUpperCase(), width / 2, 80, { align: "center" });

    // Elegant line under name
    doc.setDrawColor(99, 102, 241);
    doc.setLineWidth(0.75);
    doc.line(80, 85, width - 80, 85);

    // 5. Merit statement
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(71, 85, 105);
    doc.text(
      "for outstanding performance and securing a meritorious benchmark score in the",
      width / 2, 98, { align: "center" }
    );
    
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text("LIVE SYNCHRONIZED APTITUDE sprint", width / 2, 106, { align: "center" });

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(71, 85, 105);
    doc.text(
      `Conducted on ${today} with a record score of ${scorePercentage}%.`,
      width / 2, 114, { align: "center" }
    );

    // 6. Placement seal (Geometric vector seal drawing)
    const centerX = width / 2;
    const centerY = 145;
    
    // Outer seal star shape
    doc.setDrawColor(245, 158, 11);
    doc.setFillColor(245, 158, 11);
    doc.setLineWidth(0.5);
    doc.circle(centerX, centerY, 12, 'FD');
    
    doc.setDrawColor(253, 253, 251);
    doc.setFillColor(253, 253, 251);
    doc.circle(centerX, centerY, 10, 'FD');

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(6);
    doc.setTextColor(245, 158, 11);
    doc.text("LITERARY", centerX, centerY - 2, { align: "center" });
    doc.text("PASSED", centerX, centerY + 1.5, { align: "center" });
    doc.text("KLECET", centerX, centerY + 5, { align: "center" });

    // 7. Signatures
    // Left Signature
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text("Dr. Sandeep K.", width / 5, 172);
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("Dean Placement Cell, KLECET", width / 5, 177);
    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.25);
    doc.line(width / 5 - 5, 167, width / 5 + 45, 167); // Signature line
    // Decorative fake signature
    doc.setFont("Courier", "italic");
    doc.setFontSize(10);
    doc.text("SandeepK", width / 5 + 8, 163);

    // Right Signature
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text("Prof. Anita Patil", (width / 5) * 3.5, 172);
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("Literary Club Coordinator", (width / 5) * 3.5, 177);
    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.25);
    doc.line((width / 5) * 3.5 - 5, 167, (width / 5) * 3.5 + 45, 167); // Signature line
    // Decorative fake signature
    doc.setFont("Courier", "italic");
    doc.setFontSize(10);
    doc.text("APatil", (width / 5) * 3.5 + 10, 163);

    // Center Developer Credit (Sajid Desai)
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(6);
    doc.setTextColor(148, 163, 184);
    doc.text("System Engineered & Designed by Sajid Desai", width / 2, height - 7, { align: "center" });

    // Save PDF
    const filename = `${studentName.replace(/\s+/g, '_')}_KLECET_Literary_Aptitude.pdf`;
    doc.save(filename);
  };
})();
