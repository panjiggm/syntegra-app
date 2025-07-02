import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

// Register fonts (opsional untuk font yang lebih bagus)
Font.register({
  family: "Inter",
  fonts: [
    { src: "/fonts/Inter-Regular.ttf" },
    { src: "/fonts/Inter-Bold.ttf", fontWeight: "bold" },
  ],
});

const styles = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: "#ffffff",
    padding: 30,
    fontFamily: "Inter",
  },
  header: {
    marginBottom: 30,
    paddingBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: "#e5e7eb",
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  logo: {
    width: 120,
    height: 40,
  },
  company: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
  },
  reportTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#111827",
    textAlign: "center",
    marginBottom: 10,
  },
  reportSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
  },
  reportInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 15,
    padding: 15,
    backgroundColor: "#f9fafb",
    borderRadius: 8,
  },
  infoBlock: {
    flexDirection: "column",
  },
  infoLabel: {
    fontSize: 10,
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 12,
    color: "#1f2937",
    fontWeight: "bold",
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 15,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  table: {
    width: "100%",
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    padding: 10,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    minHeight: 40,
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  tableRowEven: {
    backgroundColor: "#f9fafb",
  },
  tableHeaderCell: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#374151",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tableCell: {
    fontSize: 10,
    color: "#1f2937",
  },
  // Responsive column widths
  colName: { width: "25%" },
  colEmail: { width: "25%" },
  colPosition: { width: "20%" },
  colScore: { width: "15%" },
  colStatus: { width: "15%" },
  // Statistics cards
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: "#f9fafb",
    padding: 15,
    borderRadius: 8,
    width: "22%",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 10,
    color: "#6b7280",
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  // Status badges
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
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
    bottom: 30,
    left: 30,
    right: 30,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  footerText: {
    fontSize: 10,
    color: "#6b7280",
  },
  pageNumber: {
    fontSize: 10,
    color: "#6b7280",
  },
});

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
    participants: Array<{
      name: string;
      email: string;
      nik: string;
      overall_score: number;
      completion_rate: number;
      status: "completed" | "in_progress" | "not_started";
      last_test_date: string;
    }>;
    statistics: {
      total_participants: number;
      completed_tests: number;
      average_score: number;
      completion_rate: number;
    };
  };
  generatedAt: string;
  filters?: {
    dateFrom?: string;
    dateTo?: string;
    status?: string;
  };
}

const SessionReportPDF: React.FC<SessionReportPDFProps> = ({
  data,
  generatedAt,
  filters,
}) => {
  // Provide fallback data if not available
  const sessionData = data?.session || {
    session_name: "Session Report",
    session_code: "N/A",
    start_time: new Date().toISOString(),
    end_time: new Date().toISOString(),
    target_position: "N/A",
    total_participants: 0,
  };

  const participantsData = data?.participants || [];
  const statisticsData = data?.statistics || {
    total_participants: 0,
    completed_tests: 0,
    average_score: 0,
    completion_rate: 0,
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

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "completed":
        return [styles.statusBadge, styles.statusCompleted];
      case "in_progress":
        return [styles.statusBadge, styles.statusInProgress];
      default:
        return [styles.statusBadge, styles.statusNotStarted];
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "completed":
        return "Selesai";
      case "in_progress":
        return "Dalam Proses";
      default:
        return "Belum Mulai";
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
          <Text style={styles.reportSubtitle}>
            Sesi: {sessionData.session_name}
          </Text>

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
                  {filters.dateFrom && filters.dateTo
                    ? `${formatDate(filters.dateFrom)} - ${formatDate(filters.dateTo)}`
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
                {statisticsData.total_participants}
              </Text>
              <Text style={styles.statLabel}>Total Peserta</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>
                {statisticsData.completed_tests}
              </Text>
              <Text style={styles.statLabel}>Tes Selesai</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>
                {statisticsData.average_score.toFixed(1)}
              </Text>
              <Text style={styles.statLabel}>Rata-rata Skor</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>
                {statisticsData.completion_rate.toFixed(1)}%
              </Text>
              <Text style={styles.statLabel}>Tingkat Penyelesaian</Text>
            </View>
          </View>
        </View>

        {/* Participants Table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Daftar Peserta</Text>
          <View style={styles.table}>
            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, styles.colName]}>Nama</Text>
              <Text style={[styles.tableHeaderCell, styles.colEmail]}>
                Email
              </Text>
              <Text style={[styles.tableHeaderCell, styles.colPosition]}>
                NIK
              </Text>
              <Text style={[styles.tableHeaderCell, styles.colScore]}>
                Skor
              </Text>
              <Text style={[styles.tableHeaderCell, styles.colStatus]}>
                Status
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
                <Text style={[styles.tableCell, styles.colEmail]}>
                  {participant.email}
                </Text>
                <Text style={[styles.tableCell, styles.colPosition]}>
                  {participant.nik}
                </Text>
                <Text style={[styles.tableCell, styles.colScore]}>
                  {participant.overall_score && typeof participant.overall_score === 'number'
                    ? participant.overall_score.toFixed(1)
                    : "-"}
                </Text>
                <View style={[styles.tableCell, styles.colStatus]}>
                  <Text style={getStatusStyle(participant.status || "not_started")}>
                    {getStatusText(participant.status || "not_started")}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

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
