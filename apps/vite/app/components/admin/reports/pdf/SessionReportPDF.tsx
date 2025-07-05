import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: "#ffffff",
    padding: 20,
    fontFamily: "Helvetica",
    fontSize: 8,
  },
  header: {
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  logo: {
    width: 100,
    height: 30,
  },
  company: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1f2937",
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#111827",
    textAlign: "center",
    marginBottom: 8,
  },
  reportSubtitle: {
    fontSize: 10,
    color: "#6b7280",
    textAlign: "center",
  },
  reportInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    padding: 10,
    backgroundColor: "#f9fafb",
    borderRadius: 4,
  },
  infoBlock: {
    flexDirection: "column",
  },
  infoLabel: {
    fontSize: 7,
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginBottom: 1,
  },
  infoValue: {
    fontSize: 8,
    color: "#1f2937",
    fontWeight: "bold",
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 10,
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  table: {
    width: "100%",
    marginBottom: 15,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    padding: 6,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#e5e7eb",
    minHeight: 25,
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  tableRowEven: {
    backgroundColor: "#f9fafb",
  },
  tableHeaderCell: {
    fontSize: 7,
    fontWeight: "bold",
    color: "#374151",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  tableCell: {
    fontSize: 7,
    color: "#1f2937",
  },
  // Responsive column widths for participants
  colName: { width: "25%" },
  colNIK: { width: "18%" },
  colGender: { width: "10%" },
  colAge: { width: "8%" },
  colScore: { width: "12%" },
  colGrade: { width: "10%" },
  colStatus: { width: "17%" },
  // Column widths for sessions
  colSessionCode: { width: "12%" },
  colSessionName: { width: "20%" },
  colDate: { width: "12%" },
  colParticipants: { width: "12%" },
  colCompletion: { width: "12%" },
  colAvgScore: { width: "10%" },
  colDuration: { width: "10%" },
  colModules: { width: "22%" },
  // Column widths for position summary and other tables
  colPosition: { width: "20%" },
  // Statistics cards
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  statCard: {
    backgroundColor: "#f9fafb",
    padding: 8,
    borderRadius: 4,
    width: "23%",
    alignItems: "center",
    borderWidth: 0.5,
    borderColor: "#e5e7eb",
  },
  statNumber: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 3,
  },
  statLabel: {
    fontSize: 7,
    color: "#6b7280",
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  // Status badges
  statusBadge: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  statusCompleted: {
    backgroundColor: "#dcfce7",
    color: "#166534",
  },
  statusInProgress: {
    backgroundColor: "#fef3c7",
    color: "#92400e",
  },
  statusNotStarted: {
    backgroundColor: "#fee2e2",
    color: "#991b1b",
  },
  // Footer
  footer: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: "#e5e7eb",
  },
  footerText: {
    fontSize: 7,
    color: "#6b7280",
  },
  pageNumber: {
    fontSize: 7,
    color: "#6b7280",
  },
});

import type {
  TestResultsReportSession,
  TestResultsReportParticipant,
  TestResultsReportSummary,
  TestResultsReportPositionSummary,
  TestResultsReportModuleSummary,
} from "~/hooks/use-test-results-report";

interface SessionReportPDFProps {
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

const SessionReportPDF: React.FC<SessionReportPDFProps> = ({
  data,
  generatedAt,
  filters,
}) => {
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

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            {/* Logo placeholder - ganti dengan logo perusahaan */}
            <Text style={styles.company}>SYNTEGRA</Text>
            <Text style={styles.footerText}>
              Digenerate pada: {formatDate(generatedAt)}
            </Text>
          </View>

          <Text style={styles.reportTitle}>LAPORAN HASIL PSIKOTES</Text>
          <Text style={styles.reportSubtitle}>{sessionData.session_name}</Text>

          <View style={styles.reportInfo}>
            <View style={styles.infoBlock}>
              <Text style={styles.infoLabel}>Kode Sesi</Text>
              <Text style={styles.infoValue}>{sessionData.session_code}</Text>
            </View>
            <View style={styles.infoBlock}>
              <Text style={styles.infoLabel}>Posisi Target</Text>
              <Text style={styles.infoValue}>
                {sessionData.target_position}
              </Text>
            </View>
            <View style={styles.infoBlock}>
              <Text style={styles.infoLabel}>Periode Tes</Text>
              <Text style={styles.infoValue}>
                {formatDate(sessionData.start_time)} -{" "}
                {formatDate(sessionData.end_time)}
              </Text>
            </View>
            {filters && (
              <View style={styles.infoBlock}>
                <Text style={styles.infoLabel}>Filter Data</Text>
                <Text style={styles.infoValue}>
                  {filters.start_date && filters.end_date
                    ? `${formatDate(filters.start_date)} - ${formatDate(filters.end_date)}`
                    : "Semua Data"}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Statistics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ringkasan Statistik</Text>
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>
                {statisticsData.total_sessions}
              </Text>
              <Text style={styles.statLabel}>Total Sesi</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>
                {statisticsData.total_participants}
              </Text>
              <Text style={styles.statLabel}>Total Peserta</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>
                {statisticsData.total_completed}
              </Text>
              <Text style={styles.statLabel}>Tes Selesai</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>
                {statisticsData.average_score?.toFixed(1) || "0"}
              </Text>
              <Text style={styles.statLabel}>Rata-rata Skor</Text>
            </View>
          </View>
        </View>

        {/* Sessions Table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Daftar Sesi Tes</Text>
          <View style={styles.table}>
            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, styles.colSessionCode]}>
                Kode Sesi
              </Text>
              <Text style={[styles.tableHeaderCell, styles.colSessionName]}>
                Nama Sesi
              </Text>
              <Text style={[styles.tableHeaderCell, styles.colDate]}>
                Tanggal
              </Text>
              <Text style={[styles.tableHeaderCell, styles.colParticipants]}>
                Peserta
              </Text>
              <Text style={[styles.tableHeaderCell, styles.colCompletion]}>
                Total Tes
              </Text>
              <Text style={[styles.tableHeaderCell, styles.colAvgScore]}>
                Rata-rata
              </Text>
              <Text style={[styles.tableHeaderCell, styles.colDuration]}>
                Durasi
              </Text>
            </View>

            {/* Table Rows */}
            {sessionsData.map((session, index) => (
              <View
                key={index}
                style={[
                  styles.tableRow,
                  index % 2 === 0 ? styles.tableRowEven : {},
                ]}
              >
                <Text style={[styles.tableCell, styles.colSessionCode]}>
                  {session.session_code}
                </Text>
                <Text style={[styles.tableCell, styles.colSessionName]}>
                  {session.session_name}
                </Text>
                <Text style={[styles.tableCell, styles.colDate]}>
                  {session.date}
                </Text>
                <Text style={[styles.tableCell, styles.colParticipants]}>
                  {session.total_participants}
                </Text>
                <Text style={[styles.tableCell, styles.colCompletion]}>
                  {session.test_modules ? session.test_modules.split(',').length : 0}
                </Text>
                <Text style={[styles.tableCell, styles.colAvgScore]}>
                  {session.average_score?.toFixed(1) || "0"}
                </Text>
                <Text style={[styles.tableCell, styles.colDuration]}>
                  {session.average_duration_minutes || 0}m
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Participants Table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Daftar Peserta</Text>
          <View style={styles.table}>
            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, styles.colName]}>Nama</Text>
              <Text style={[styles.tableHeaderCell, styles.colNIK]}>NIK</Text>
              <Text style={[styles.tableHeaderCell, styles.colGender]}>
                Gender
              </Text>
              <Text style={[styles.tableHeaderCell, styles.colAge]}>Umur</Text>
              <Text style={[styles.tableHeaderCell, styles.colScore]}>
                Skor
              </Text>
              <Text style={[styles.tableHeaderCell, styles.colGrade]}>
                Grade
              </Text>
              <Text style={[styles.tableHeaderCell, styles.colStatus]}>
                Keterangan
              </Text>
            </View>

            {/* Table Rows */}
            {participantsData.map((participant, index) => (
              <View
                key={index}
                style={[
                  styles.tableRow,
                  index % 2 === 0 ? styles.tableRowEven : {},
                ]}
              >
                <Text style={[styles.tableCell, styles.colName]}>
                  {participant.name}
                </Text>
                <Text style={[styles.tableCell, styles.colNIK]}>
                  {participant.nik || "-"}
                </Text>
                <Text style={[styles.tableCell, styles.colGender]}>
                  {participant.gender === "male"
                    ? "L"
                    : participant.gender === "female"
                      ? "P"
                      : "-"}
                </Text>
                <Text style={[styles.tableCell, styles.colAge]}>
                  {participant.age || "-"}
                </Text>
                <Text style={[styles.tableCell, styles.colScore]}>
                  {participant.total_score?.toFixed(1) || "0"}
                </Text>
                <Text style={[styles.tableCell, styles.colGrade]}>
                  {participant.overall_grade || "-"}
                </Text>
                <Text style={[styles.tableCell, styles.colStatus]}>
                  {getGradeDescription(participant.overall_grade || "")}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Position Summary Table */}
        {positionSummaryData.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Ringkasan Berdasarkan Posisi
            </Text>
            <View style={styles.table}>
              {/* Table Header */}
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { width: "70%" }]}>
                  Posisi Target
                </Text>
                <Text style={[styles.tableHeaderCell, { width: "30%" }]}>
                  Total
                </Text>
              </View>

              {/* Table Rows */}
              {positionSummaryData.map((position, index) => (
                <View
                  key={index}
                  style={[
                    styles.tableRow,
                    index % 2 === 0 ? styles.tableRowEven : {},
                  ]}
                >
                  <Text style={[styles.tableCell, { width: "70%" }]}>
                    {position.target_position}
                  </Text>
                  <Text style={[styles.tableCell, { width: "30%" }]}>
                    {position.total_participants}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Test Module Summary Table */}
        {testModuleSummaryData.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ringkasan Modul Tes</Text>
            <View style={styles.table}>
              {/* Table Header */}
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, styles.colSessionName]}>
                  Nama Tes
                </Text>
                <Text style={[styles.tableHeaderCell, styles.colSessionName]}>
                  Kategori
                </Text>
                <Text style={[styles.tableHeaderCell, styles.colParticipants]}>
                  Percobaan
                </Text>
                <Text style={[styles.tableHeaderCell, styles.colAvgScore]}>
                  Rata-rata
                </Text>
                <Text style={[styles.tableHeaderCell, styles.colCompletion]}>
                  Selesai
                </Text>
              </View>

              {/* Table Rows */}
              {testModuleSummaryData.map((module, index) => (
                <View
                  key={index}
                  style={[
                    styles.tableRow,
                    index % 2 === 0 ? styles.tableRowEven : {},
                  ]}
                >
                  <Text style={[styles.tableCell, styles.colSessionName]}>
                    {module.test_name}
                  </Text>
                  <Text style={[styles.tableCell, styles.colSessionName]}>
                    {module.category}
                  </Text>
                  <Text style={[styles.tableCell, styles.colParticipants]}>
                    {module.total_attempts}
                  </Text>
                  <Text style={[styles.tableCell, styles.colAvgScore]}>
                    {module.average_score?.toFixed(1) || "0"}
                  </Text>
                  <Text style={[styles.tableCell, styles.colCompletion]}>
                    {module.completion_rate?.toFixed(1) || "0"}%
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            © 2025 Syntegra - Sistem Psikotes Online
          </Text>
          <Text
            style={styles.pageNumber}
            render={({ pageNumber, totalPages }) =>
              `Halaman ${pageNumber} dari ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
};

export default SessionReportPDF;
