import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

// Register fonts
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
  // Column widths
  colTrait: { width: "40%" },
  colScore: { width: "30%" },
  colGrade: { width: "30%" },
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
    width: "30%",
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

interface IndividualReportPDFProps {
  data: {
    individual_profile: {
      name: string;
      email: string;
      nik?: string;
    };
    overall_score: number;
    completion_rate: number;
    trait_scores?: Record<string, number>;
    test_sessions?: Array<{
      session_name: string;
      score: number;
      completed_at: string;
    }>;
  };
  generatedAt: string;
  filters?: {
    dateFrom?: string;
    dateTo?: string;
    sessionFilter?: string;
  };
}

const IndividualReportPDF: React.FC<IndividualReportPDFProps> = ({
  data,
  generatedAt,
  filters,
}) => {
  // Provide fallback data if not available
  const individualData = data?.individual_profile || {
    name: "Individual Report",
    email: "N/A",
    nik: "N/A",
  };

  const overallScore = data?.overall_score || 0;
  const completionRate = data?.completion_rate || 0;
  const traitScores = data?.trait_scores || {};
  const testSessions = data?.test_sessions || [];

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

  const getScoreGrade = (score: number) => {
    if (score >= 90) return "Excellent";
    if (score >= 80) return "Very Good";
    if (score >= 70) return "Good";
    if (score >= 60) return "Fair";
    return "Needs Improvement";
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.company}>SYNTEGRA</Text>
            <Text style={styles.footerText}>
              Digenerate pada: {formatDate(generatedAt)}
            </Text>
          </View>

          <Text style={styles.reportTitle}>LAPORAN INDIVIDUAL PSIKOTES</Text>
          <Text style={styles.reportSubtitle}>
            Peserta: {individualData.name}
          </Text>

          <View style={styles.reportInfo}>
            <View style={styles.infoBlock}>
              <Text style={styles.infoLabel}>Nama Lengkap</Text>
              <Text style={styles.infoValue}>{individualData.name}</Text>
            </View>
            <View style={styles.infoBlock}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{individualData.email}</Text>
            </View>
            <View style={styles.infoBlock}>
              <Text style={styles.infoLabel}>NIK</Text>
              <Text style={styles.infoValue}>
                {individualData.nik || "N/A"}
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

        {/* Overall Statistics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ringkasan Hasil</Text>
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>
                {overallScore.toFixed(1)}
              </Text>
              <Text style={styles.statLabel}>Skor Keseluruhan</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>
                {completionRate.toFixed(1)}%
              </Text>
              <Text style={styles.statLabel}>Tingkat Penyelesaian</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>
                {getScoreGrade(overallScore)}
              </Text>
              <Text style={styles.statLabel}>Grade</Text>
            </View>
          </View>
        </View>

        {/* Trait Scores Table */}
        {Object.keys(traitScores).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Skor Per Trait</Text>
            <View style={styles.table}>
              {/* Table Header */}
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, styles.colTrait]}>
                  Trait
                </Text>
                <Text style={[styles.tableHeaderCell, styles.colScore]}>
                  Skor
                </Text>
                <Text style={[styles.tableHeaderCell, styles.colGrade]}>
                  Grade
                </Text>
              </View>

              {/* Table Rows */}
              {Object.entries(traitScores).map(([trait, score], index) => (
                <View
                  key={index}
                  style={[
                    styles.tableRow,
                    index % 2 === 0 ? styles.tableRowEven : {},
                  ]}
                >
                  <Text style={[styles.tableCell, styles.colTrait]}>
                    {trait}
                  </Text>
                  <Text style={[styles.tableCell, styles.colScore]}>
                    {typeof score === 'number' ? score.toFixed(1) : "N/A"}
                  </Text>
                  <Text style={[styles.tableCell, styles.colGrade]}>
                    {typeof score === 'number' ? getScoreGrade(score) : "N/A"}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Test Sessions Table */}
        {testSessions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Riwayat Tes</Text>
            <View style={styles.table}>
              {/* Table Header */}
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, styles.colTrait]}>
                  Sesi Tes
                </Text>
                <Text style={[styles.tableHeaderCell, styles.colScore]}>
                  Skor
                </Text>
                <Text style={[styles.tableHeaderCell, styles.colGrade]}>
                  Tanggal
                </Text>
              </View>

              {/* Table Rows */}
              {testSessions.map((session, index) => (
                <View
                  key={index}
                  style={[
                    styles.tableRow,
                    index % 2 === 0 ? styles.tableRowEven : {},
                  ]}
                >
                  <Text style={[styles.tableCell, styles.colTrait]}>
                    {session.session_name}
                  </Text>
                  <Text style={[styles.tableCell, styles.colScore]}>
                    {typeof session.score === 'number' ? session.score.toFixed(1) : "N/A"}
                  </Text>
                  <Text style={[styles.tableCell, styles.colGrade]}>
                    {session.completed_at ? formatDate(session.completed_at) : "N/A"}
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

export default IndividualReportPDF;