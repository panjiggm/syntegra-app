import { Card, CardContent } from "~/components/ui/card";
import { FileText, Users, Calendar, BarChart3 } from "lucide-react";

interface EmptyDetailViewProps {
  activeTab: string;
}

export function EmptyDetailView({ activeTab }: EmptyDetailViewProps) {
  const getTabInfo = () => {
    switch (activeTab) {
      case "individual":
        return {
          icon: Users,
          title: "Pilih Individual",
          description:
            "Pilih salah satu pengguna dari daftar di sebelah kiri untuk melihat detail laporan individual mereka.",
        };
      case "session":
        return {
          icon: Calendar,
          title: "Pilih Sesi",
          description:
            "Pilih salah satu sesi dari daftar di sebelah kiri untuk melihat ringkasan dan statistik sesi tersebut.",
        };
      case "comparative":
        return {
          icon: BarChart3,
          title: "Analisis Komparatif",
          description:
            "Bandingkan performa antar peserta dalam satu sesi untuk analisis yang lebih mendalam.",
        };
      default:
        return {
          icon: FileText,
          title: "Pilih Laporan",
          description:
            "Pilih salah satu item dari daftar untuk melihat detail laporan.",
        };
    }
  };

  const { icon: Icon, title, description } = getTabInfo();

  return (
    <Card className="h-full">
      <CardContent className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
          <Icon className="h-8 w-8 text-muted-foreground" />
        </div>

        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-muted-foreground text-sm mb-6 max-w-md leading-relaxed">
          {description}
        </p>
      </CardContent>
    </Card>
  );
}
