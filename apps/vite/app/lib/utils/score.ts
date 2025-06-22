export const formatScore = (score: number | null | undefined): string => {
  if (score === null || score === undefined) return "0";
  if (score === 0) return "0"; // Handle valid zero scores
  return score % 1 === 0 ? score.toString() : score.toFixed(1);
};

export const formatTime = (minutes: number | null | undefined): string => {
  if (minutes === null || minutes === undefined) return "0";
  if (minutes === 0) return "0m";
  return minutes < 1
    ? `${Math.round(minutes * 60)} detik`
    : `${Math.round(minutes)} menit`;
};

export const getGradeColor = (grade: string | null | undefined): string => {
  const gradeColors: Record<string, string> = {
    A: "text-green-800",
    B: "text-blue-800",
    C: "text-yellow-800",
    D: "text-orange-800",
    E: "text-red-800",
  };
  return (
    gradeColors[grade || ""] || "bg-gray-100 text-gray-800 border-gray-600"
  );
};

export const formatDuration = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours} jam ${mins} menit`;
  }
  return `${mins} menit`;
};

export const formatDateTime = (dateStr: string | null) => {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const getGradeLabel = (grade: string | null | undefined): string => {
  const gradeLabels: Record<string, string> = {
    A: "Sangat Baik",
    B: "Baik",
    C: "Cukup",
    D: "Kurang",
    E: "Sangat Kurang",
  };
  return gradeLabels[grade || ""] || "N/A";
};
