import ExcelJS from 'exceljs';
import type {
  TestResultsReportSession,
  TestResultsReportParticipant,
  TestResultsReportSummary,
  TestResultsReportPositionSummary,
  TestResultsReportModuleSummary,
} from "~/hooks/use-test-results-report";

interface SessionReportExcelProps {
  data: {
    session: {
      session_name: string;
      session_code: string;
      start_time: string;
      end_time: string;
      target_position: string;
      total_participants: number;
    };
    participants: TestResultsReportParticipant[];
    statistics: TestResultsReportSummary;
    sessions: TestResultsReportSession[];
    position_summary: TestResultsReportPositionSummary[];
    test_module_summary: TestResultsReportModuleSummary[];
  };
  generatedAt: string;
  filters?: {
    period_type?: string;
    start_date?: string;
    end_date?: string;
    session_id?: string;
  };
}

export async function generateSessionReportExcel(props: SessionReportExcelProps): Promise<ArrayBuffer> {
  const { data, generatedAt, filters } = props;
  
  // Provide fallback data if not available
  const sessionData = data?.session || {
    session_name: "Test Results Report",
    session_code: "N/A",
    start_time: new Date().toISOString(),
    end_time: new Date().toISOString(),
    target_position: "N/A",
    total_participants: 0,
  };

  const participantsData = data?.participants || [];
  const sessionsData = data?.sessions || [];
  const positionSummaryData = data?.position_summary || [];
  const testModuleSummaryData = data?.test_module_summary || [];
  const statisticsData = data?.statistics || {
    total_sessions: 0,
    total_participants: 0,
    total_completed: 0,
    completion_rate: 0,
    average_score: 0,
    grade_distribution: {},
  };

  // Helper functions
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("id-ID", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      return "N/A";
    }
  };

  const getGradeDescription = (grade: string) => {
    switch (grade) {
      case "A":
        return "Baik Sekali";
      case "B":
        return "Baik";
      case "C":
        return "Cukup";
      case "D":
        return "Kurang";
      case "E":
        return "Sangat Kurang";
      default:
        return "-";
    }
  };

  // Create workbook and worksheet
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Laporan Hasil Psikotes');

  // Set page setup
  worksheet.pageSetup = {
    paperSize: 9, // A4
    orientation: 'portrait',
    margins: {
      left: 0.7,
      right: 0.7,
      top: 0.75,
      bottom: 0.75,
      header: 0.3,
      footer: 0.3,
    },
  };

  let currentRow = 1;

  // ===============================
  // HEADER SECTION
  // ===============================
  
  // Company header
  worksheet.mergeCells(currentRow, 1, currentRow, 7);
  const companyCell = worksheet.getCell(currentRow, 1);
  companyCell.value = 'SYNTEGRA';
  companyCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FF1F2937' } };
  companyCell.alignment = { vertical: 'middle', horizontal: 'left' };
  currentRow++;

  // Generated date (right aligned)
  worksheet.mergeCells(currentRow, 1, currentRow, 7);
  const dateCell = worksheet.getCell(currentRow, 1);
  dateCell.value = `Digenerate pada: ${formatDate(generatedAt)}`;
  dateCell.font = { name: 'Arial', size: 10, color: { argb: 'FF6B7280' } };
  dateCell.alignment = { vertical: 'middle', horizontal: 'right' };
  currentRow += 2;

  // Report title
  worksheet.mergeCells(currentRow, 1, currentRow, 7);
  const titleCell = worksheet.getCell(currentRow, 1);
  titleCell.value = 'LAPORAN HASIL PSIKOTES';
  titleCell.font = { name: 'Arial', size: 18, bold: true, color: { argb: 'FF111827' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  currentRow++;

  // Report subtitle
  worksheet.mergeCells(currentRow, 1, currentRow, 7);
  const subtitleCell = worksheet.getCell(currentRow, 1);
  subtitleCell.value = sessionData.session_name;
  subtitleCell.font = { name: 'Arial', size: 12, color: { argb: 'FF6B7280' } };
  subtitleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  currentRow += 2;

  // Report info section
  const infoStartRow = currentRow;
  
  // Kode Sesi
  worksheet.getCell(currentRow, 1).value = 'KODE SESI';
  worksheet.getCell(currentRow, 1).font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF6B7280' } };
  worksheet.getCell(currentRow + 1, 1).value = sessionData.session_code;
  worksheet.getCell(currentRow + 1, 1).font = { name: 'Arial', size: 10, bold: true };

  // Posisi Target
  worksheet.getCell(currentRow, 3).value = 'POSISI TARGET';
  worksheet.getCell(currentRow, 3).font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF6B7280' } };
  worksheet.getCell(currentRow + 1, 3).value = sessionData.target_position;
  worksheet.getCell(currentRow + 1, 3).font = { name: 'Arial', size: 10, bold: true };

  // Periode Tes
  worksheet.getCell(currentRow, 5).value = 'PERIODE TES';
  worksheet.getCell(currentRow, 5).font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF6B7280' } };
  worksheet.getCell(currentRow + 1, 5).value = `${formatDate(sessionData.start_time)} - ${formatDate(sessionData.end_time)}`;
  worksheet.getCell(currentRow + 1, 5).font = { name: 'Arial', size: 10, bold: true };

  // Filter Data (if exists)
  if (filters) {
    worksheet.getCell(currentRow, 7).value = 'FILTER DATA';
    worksheet.getCell(currentRow, 7).font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF6B7280' } };
    const filterText = filters.start_date && filters.end_date
      ? `${formatDate(filters.start_date)} - ${formatDate(filters.end_date)}`
      : "Semua Data";
    worksheet.getCell(currentRow + 1, 7).value = filterText;
    worksheet.getCell(currentRow + 1, 7).font = { name: 'Arial', size: 10, bold: true };
  }

  currentRow += 4;

  // ===============================
  // STATISTICS SECTION
  // ===============================
  
  worksheet.mergeCells(currentRow, 1, currentRow, 7);
  const statsTitle = worksheet.getCell(currentRow, 1);
  statsTitle.value = 'RINGKASAN STATISTIK';
  statsTitle.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF1F2937' } };
  statsTitle.alignment = { vertical: 'middle', horizontal: 'left' };
  currentRow += 2;

  // Statistics data in 4 columns
  const statsLabels = ['Total Sesi', 'Total Peserta', 'Tes Selesai', 'Rata-rata Skor'];
  const statsValues = [
    statisticsData.total_sessions,
    statisticsData.total_participants,
    statisticsData.total_completed,
    statisticsData.average_score?.toFixed(1) || "0"
  ];

  // Stats labels
  for (let i = 0; i < 4; i++) {
    const col = i * 2 + 1; // Columns 1, 3, 5, 7
    worksheet.getCell(currentRow, col).value = statsLabels[i].toUpperCase();
    worksheet.getCell(currentRow, col).font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF6B7280' } };
    worksheet.getCell(currentRow, col).alignment = { horizontal: 'center' };
  }

  // Stats values
  currentRow++;
  for (let i = 0; i < 4; i++) {
    const col = i * 2 + 1; // Columns 1, 3, 5, 7
    worksheet.getCell(currentRow, col).value = statsValues[i];
    worksheet.getCell(currentRow, col).font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FF1F2937' } };
    worksheet.getCell(currentRow, col).alignment = { horizontal: 'center' };
  }

  currentRow += 3;

  // ===============================
  // SESSIONS TABLE
  // ===============================
  
  worksheet.mergeCells(currentRow, 1, currentRow, 7);
  const sessionsTitle = worksheet.getCell(currentRow, 1);
  sessionsTitle.value = 'DAFTAR SESI TES';
  sessionsTitle.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF1F2937' } };
  sessionsTitle.alignment = { vertical: 'middle', horizontal: 'left' };
  currentRow += 2;

  // Sessions table headers
  const sessionHeaders = ['Kode Sesi', 'Nama Sesi', 'Tanggal', 'Peserta', 'Total Tes', 'Rata-rata', 'Durasi'];
  for (let i = 0; i < sessionHeaders.length; i++) {
    const cell = worksheet.getCell(currentRow, i + 1);
    cell.value = sessionHeaders[i];
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF374151' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  }
  currentRow++;

  // Sessions table data
  sessionsData.forEach((session, index) => {
    const rowData = [
      session.session_code,
      session.session_name,
      session.date,
      session.total_participants,
      session.test_modules ? session.test_modules.split(',').length : 0,
      session.average_score?.toFixed(1) || "0",
      `${session.average_duration_minutes || 0}m`
    ];

    for (let i = 0; i < rowData.length; i++) {
      const cell = worksheet.getCell(currentRow, i + 1);
      cell.value = rowData[i];
      cell.font = { name: 'Arial', size: 9 };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
      
      // Zebra striping
      if (index % 2 === 0) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
      }
    }
    currentRow++;
  });

  currentRow += 2;

  // ===============================
  // PARTICIPANTS TABLE
  // ===============================
  
  worksheet.mergeCells(currentRow, 1, currentRow, 7);
  const participantsTitle = worksheet.getCell(currentRow, 1);
  participantsTitle.value = 'DAFTAR PESERTA';
  participantsTitle.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF1F2937' } };
  participantsTitle.alignment = { vertical: 'middle', horizontal: 'left' };
  currentRow += 2;

  // Participants table headers
  const participantHeaders = ['Nama', 'NIK', 'Gender', 'Umur', 'Skor', 'Grade', 'Keterangan'];
  for (let i = 0; i < participantHeaders.length; i++) {
    const cell = worksheet.getCell(currentRow, i + 1);
    cell.value = participantHeaders[i];
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF374151' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  }
  currentRow++;

  // Participants table data
  participantsData.forEach((participant, index) => {
    const rowData = [
      participant.name,
      participant.nik || "-",
      participant.gender === "male" ? "L" : participant.gender === "female" ? "P" : "-",
      participant.age || "-",
      participant.total_score?.toFixed(1) || "0",
      participant.overall_grade || "-",
      getGradeDescription(participant.overall_grade || "")
    ];

    for (let i = 0; i < rowData.length; i++) {
      const cell = worksheet.getCell(currentRow, i + 1);
      cell.value = rowData[i];
      cell.font = { name: 'Arial', size: 9 };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
      
      // Zebra striping
      if (index % 2 === 0) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
      }
    }
    currentRow++;
  });

  currentRow += 2;

  // ===============================
  // POSITION SUMMARY TABLE
  // ===============================
  
  if (positionSummaryData.length > 0) {
    worksheet.mergeCells(currentRow, 1, currentRow, 7);
    const positionTitle = worksheet.getCell(currentRow, 1);
    positionTitle.value = 'RINGKASAN BERDASARKAN POSISI';
    positionTitle.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF1F2937' } };
    positionTitle.alignment = { vertical: 'middle', horizontal: 'left' };
    currentRow += 2;

    // Position table headers (only 2 columns as requested)
    const positionHeaders = ['Posisi Target', 'Total'];
    for (let i = 0; i < positionHeaders.length; i++) {
      const cell = worksheet.getCell(currentRow, i + 1);
      cell.value = positionHeaders[i];
      cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF374151' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    }
    currentRow++;

    // Position table data
    positionSummaryData.forEach((position, index) => {
      const rowData = [
        position.target_position,
        position.total_participants
      ];

      for (let i = 0; i < rowData.length; i++) {
        const cell = worksheet.getCell(currentRow, i + 1);
        cell.value = rowData[i];
        cell.font = { name: 'Arial', size: 9 };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        
        // Zebra striping
        if (index % 2 === 0) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
        }
      }
      currentRow++;
    });

    currentRow += 2;
  }

  // ===============================
  // TEST MODULE SUMMARY TABLE
  // ===============================
  
  if (testModuleSummaryData.length > 0) {
    worksheet.mergeCells(currentRow, 1, currentRow, 7);
    const moduleTitle = worksheet.getCell(currentRow, 1);
    moduleTitle.value = 'RINGKASAN MODUL TES';
    moduleTitle.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF1F2937' } };
    moduleTitle.alignment = { vertical: 'middle', horizontal: 'left' };
    currentRow += 2;

    // Module table headers
    const moduleHeaders = ['Nama Tes', 'Kategori', 'Percobaan', 'Rata-rata', 'Selesai'];
    for (let i = 0; i < moduleHeaders.length; i++) {
      const cell = worksheet.getCell(currentRow, i + 1);
      cell.value = moduleHeaders[i];
      cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF374151' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    }
    currentRow++;

    // Module table data
    testModuleSummaryData.forEach((module, index) => {
      const rowData = [
        module.test_name,
        module.category,
        module.total_attempts,
        module.average_score?.toFixed(1) || "0",
        `${module.completion_rate?.toFixed(1) || "0"}%`
      ];

      for (let i = 0; i < rowData.length; i++) {
        const cell = worksheet.getCell(currentRow, i + 1);
        cell.value = rowData[i];
        cell.font = { name: 'Arial', size: 9 };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        
        // Zebra striping
        if (index % 2 === 0) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
        }
      }
      currentRow++;
    });
  }

  // ===============================
  // FOOTER
  // ===============================
  
  currentRow += 3;
  worksheet.mergeCells(currentRow, 1, currentRow, 7);
  const footerCell = worksheet.getCell(currentRow, 1);
  footerCell.value = '© 2025 Syntegra - Sistem Psikotes Online';
  footerCell.font = { name: 'Arial', size: 9, color: { argb: 'FF6B7280' } };
  footerCell.alignment = { vertical: 'middle', horizontal: 'center' };

  // Set column widths
  worksheet.getColumn(1).width = 20; // Nama / Kode Sesi
  worksheet.getColumn(2).width = 15; // NIK / Nama Sesi  
  worksheet.getColumn(3).width = 10; // Gender / Tanggal
  worksheet.getColumn(4).width = 8;  // Umur / Peserta
  worksheet.getColumn(5).width = 12; // Skor / Selesai
  worksheet.getColumn(6).width = 10; // Grade / Rata-rata
  worksheet.getColumn(7).width = 17; // Keterangan / Durasi

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer as ArrayBuffer;
}