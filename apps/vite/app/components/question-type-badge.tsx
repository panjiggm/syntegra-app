import { Badge } from "./ui/badge";

export const QuestionTypeBadge = ({
  questionType,
}: {
  questionType:
    | "multiple_choice"
    | "true_false"
    | "text"
    | "rating_scale"
    | "drawing"
    | "sequence"
    | "matrix"
    | null
    | undefined;
}) => {
  const variants = {
    multiple_choice: "bg-blue-100 text-blue-700",
    true_false: "bg-green-100 text-green-700",
    text: "bg-yellow-100 text-yellow-700",
    rating_scale: "bg-red-100 text-red-700",
    drawing: "bg-purple-100 text-purple-700",
    sequence: "bg-pink-100 text-pink-700",
    matrix: "bg-gray-100 text-gray-700",
  };

  return (
    <Badge
      variant="secondary"
      className={variants[questionType as keyof typeof variants] || ""}
    >
      {questionType === "multiple_choice" && "Pilihan Ganda"}
      {questionType === "true_false" && "Benar/Salah"}
      {questionType === "text" && "Esai"}
      {questionType === "rating_scale" && "Skala Rating"}
      {questionType === "drawing" && "Gambar"}
      {questionType === "sequence" && "Urutan"}
      {questionType === "matrix" && "Matriks"}
    </Badge>
  );
};
