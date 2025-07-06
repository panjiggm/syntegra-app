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
  infoItem: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 8,
    color: "#6b7280",
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#1f2937",
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  table: {
    // display: "table",
    width: "auto",
    borderStyle: "solid",
    borderWidth: 1,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderColor: "#e5e7eb",
  },
  tableRow: {
    margin: "auto",
    flexDirection: "row",
  },
  tableColHeader: {
    width: "12.5%",
    borderStyle: "solid",
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderColor: "#e5e7eb",
    backgroundColor: "#f9fafb",
    padding: 4,
  },
  tableCol: {
    width: "12.5%",
    borderStyle: "solid",
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderColor: "#e5e7eb",
    padding: 4,
  },
  tableCellHeader: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#1f2937",
    textAlign: "center",
  },
  tableCell: {
    fontSize: 7,
    color: "#374151",
    textAlign: "center",
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerText: {
    fontSize: 8,
    color: "#6b7280",
  },
  pageNumber: {
    fontSize: 8,
    color: "#6b7280",
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 15,
  },
  summaryCard: {
    width: "50%",
    padding: 8,
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 5,
  },
  summaryCardTitle: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 4,
  },
  summaryCardValue: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#059669",
  },
  roleCount: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  roleLabel: {
    fontSize: 8,
    color: "#6b7280",
  },
  roleValue: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#1f2937",
  },
});

interface UsersBulkExportPDFProps {
  data: {
    users: Array<{
      id: string;
      nik: string;
      name: string;
      email: string;
      role: string;
      gender: string;
      phone: string;
      birth_place: string;
      birth_date: string;
      religion: string;
      education: string;
      address: string;
      province: string;
      regency: string;
      district: string;
      village: string;
      postal_code: string;
      is_active: boolean;
      email_verified: boolean;
      created_at: string;
    }>;
    metadata: {
      total_users: number;
      generated_at: string;
      include_details: boolean;
      format: string;
      filename: string;
      export_title: string;
      export_date: string;
    };
  };
}

export default function UsersBulkExportPDF({ data }: UsersBulkExportPDFProps) {
  // Validate and provide defaults
  const users = data?.users || [];
  const metadata = data?.metadata || {
    total_users: 0,
    generated_at: new Date().toISOString(),
    include_details: false,
    format: "pdf",
    filename: "users_export.pdf",
    export_title: "Export Data Users",
    export_date: new Date().toLocaleDateString("id-ID"),
  };

  // Calculate statistics
  const totalUsers = users.length;
  const activeUsers = users.filter((user) => user?.is_active === true).length;
  const verifiedUsers = users.filter(
    (user) => user?.email_verified === true
  ).length;
  const adminCount = users.filter((user) => user?.role === "admin").length;
  const participantCount = users.filter(
    (user) => user?.role === "participant"
  ).length;

  // Gender distribution
  const maleCount = users.filter((user) => user?.gender === "male").length;
  const femaleCount = users.filter((user) => user?.gender === "female").length;
  const otherGenderCount = users.filter(
    (user) => user?.gender === "other" || !user?.gender
  ).length;

  // Province distribution (top 5)
  const provinceCount = users.reduce(
    (acc, user) => {
      if (user?.province) {
        acc[user.province] = (acc[user.province] || 0) + 1;
      }
      return acc;
    },
    {} as Record<string, number>
  );

  const topProvinces = Object.entries(provinceCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  // Split users into chunks for pagination (20 users per page)
  const usersPerPage = 20;
  const userChunks = [];
  for (let i = 0; i < users.length; i += usersPerPage) {
    userChunks.push(users.slice(i, i + usersPerPage));
  }

  return (
    <Document>
      {/* Summary Page */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.company}>SYNTEGRA</Text>
            <Text style={styles.footerText}>
              {metadata?.generated_at
                ? new Date(metadata.generated_at).toLocaleDateString("id-ID", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : new Date().toLocaleDateString("id-ID")}
            </Text>
          </View>
          <Text style={styles.reportTitle}>
            {metadata?.export_title || "Export Data Users"}
          </Text>
          <Text style={styles.reportSubtitle}>
            Laporan Export Data Users -{" "}
            {metadata?.export_date || new Date().toLocaleDateString("id-ID")}
          </Text>
        </View>

        <View style={styles.content}>
          {/* Summary Statistics */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ringkasan Statistik</Text>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryCardTitle}>Total Users</Text>
                <Text style={styles.summaryCardValue}>{totalUsers}</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryCardTitle}>Users Aktif</Text>
                <Text style={styles.summaryCardValue}>{activeUsers}</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryCardTitle}>Email Terverifikasi</Text>
                <Text style={styles.summaryCardValue}>{verifiedUsers}</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryCardTitle}>Persentase Aktif</Text>
                <Text style={styles.summaryCardValue}>
                  {totalUsers > 0
                    ? Math.round((activeUsers / totalUsers) * 100)
                    : 0}
                  %
                </Text>
              </View>
            </View>
          </View>

          {/* Role Distribution */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Distribusi Role</Text>
            <View style={styles.roleCount}>
              <Text style={styles.roleLabel}>Admin:</Text>
              <Text style={styles.roleValue}>{adminCount} users</Text>
            </View>
            <View style={styles.roleCount}>
              <Text style={styles.roleLabel}>Participant:</Text>
              <Text style={styles.roleValue}>{participantCount} users</Text>
            </View>
          </View>

          {/* Gender Distribution */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Distribusi Gender</Text>
            <View style={styles.roleCount}>
              <Text style={styles.roleLabel}>Laki-laki:</Text>
              <Text style={styles.roleValue}>{maleCount} users</Text>
            </View>
            <View style={styles.roleCount}>
              <Text style={styles.roleLabel}>Perempuan:</Text>
              <Text style={styles.roleValue}>{femaleCount} users</Text>
            </View>
            <View style={styles.roleCount}>
              <Text style={styles.roleLabel}>Lainnya:</Text>
              <Text style={styles.roleValue}>{otherGenderCount} users</Text>
            </View>
          </View>

          {/* Top Provinces */}
          {topProvinces.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Top 5 Provinsi</Text>
              {topProvinces.map(([province, count], index) => (
                <View key={province} style={styles.roleCount}>
                  <Text style={styles.roleLabel}>
                    {index + 1}. {province}:
                  </Text>
                  <Text style={styles.roleValue}>{count} users</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Generated by Syntegra •{" "}
            {metadata?.generated_at
              ? new Date(metadata.generated_at).toLocaleString("id-ID")
              : new Date().toLocaleString("id-ID")}
          </Text>
          <Text style={styles.pageNumber}>Halaman 1</Text>
        </View>
      </Page>

      {/* Data Pages */}
      {userChunks.map((chunk, chunkIndex) => (
        <Page
          key={chunkIndex}
          size="A4"
          orientation="landscape"
          style={styles.page}
        >
          <View style={styles.header}>
            <Text style={styles.reportTitle}>
              Data Users - Halaman {chunkIndex + 2}
            </Text>
            <Text style={styles.reportSubtitle}>
              Menampilkan {chunkIndex * usersPerPage + 1} -{" "}
              {Math.min((chunkIndex + 1) * usersPerPage, totalUsers)} dari{" "}
              {totalUsers} users
            </Text>
          </View>

          <View style={styles.content}>
            <View style={styles.table}>
              {/* Table Header */}
              <View style={styles.tableRow}>
                <View style={styles.tableColHeader}>
                  <Text style={styles.tableCellHeader}>No</Text>
                </View>
                <View style={styles.tableColHeader}>
                  <Text style={styles.tableCellHeader}>NIK</Text>
                </View>
                <View style={styles.tableColHeader}>
                  <Text style={styles.tableCellHeader}>Nama</Text>
                </View>
                <View style={styles.tableColHeader}>
                  <Text style={styles.tableCellHeader}>Email</Text>
                </View>
                <View style={styles.tableColHeader}>
                  <Text style={styles.tableCellHeader}>Gender</Text>
                </View>
                <View style={styles.tableColHeader}>
                  <Text style={styles.tableCellHeader}>Telepon</Text>
                </View>
              </View>

              {/* Table Rows */}
              {chunk.map((user, index) => (
                <View key={user?.id || index} style={styles.tableRow}>
                  <View style={styles.tableCol}>
                    <Text style={styles.tableCell}>
                      {chunkIndex * usersPerPage + index + 1}
                    </Text>
                  </View>
                  <View style={styles.tableCol}>
                    <Text style={styles.tableCell}>{user?.nik || "-"}</Text>
                  </View>
                  <View style={styles.tableCol}>
                    <Text style={styles.tableCell}>{user?.name || "-"}</Text>
                  </View>
                  <View style={styles.tableCol}>
                    <Text style={styles.tableCell}>{user?.email || "-"}</Text>
                  </View>
                  <View style={styles.tableCol}>
                    <Text style={styles.tableCell}>
                      {user?.gender === "male"
                        ? "L"
                        : user?.gender === "female"
                          ? "P"
                          : "-"}
                    </Text>
                  </View>
                  <View style={styles.tableCol}>
                    <Text style={styles.tableCell}>{user?.phone || "-"}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Generated by Syntegra •{" "}
              {metadata?.generated_at
                ? new Date(metadata.generated_at).toLocaleString("id-ID")
                : new Date().toLocaleString("id-ID")}
            </Text>
            <Text style={styles.pageNumber}>Halaman {chunkIndex + 2}</Text>
          </View>
        </Page>
      ))}
    </Document>
  );
}
