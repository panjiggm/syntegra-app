import { useState, useEffect } from "react";
import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { useLoaderData, useNavigate, useParams } from "react-router";
import { useQuestions } from "~/hooks/use-questions";
import { useSessions } from "~/hooks/use-sessions";
import { Clock, CheckCircle, ArrowLeft, LogOut } from "lucide-react";
import { formatDistanceToNow, parseISO, isAfter } from "date-fns";
import { id } from "date-fns/locale";

export const meta: MetaFunction = () => {
  return [
    { title: "Mengerjakan Soal - Syntegra Psikotes" },
    { name: "description", content: "Halaman mengerjakan soal psikotes" },
  ];
};

export async function loader({ params }: LoaderFunctionArgs) {
  const { sessionCode, testId, questionId } = params;

  if (!sessionCode || !testId || !questionId) {
    throw new Response("Missing required parameters", { status: 400 });
  }

  return {
    sessionCode,
    testId,
    questionId,
  };
}

export default function QuestionPage() {
  const { sessionCode, testId, questionId } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [selectedAnswer, setSelectedAnswer] = useState<string>("");
  const [answers, setAnswers] = useState<Record<string, string>>({});

  // Load answers from localStorage on mount
  useEffect(() => {
    const storageKey = `psikotes_answers_${sessionCode}_${testId}`;
    const savedAnswers = localStorage.getItem(storageKey);
    if (savedAnswers) {
      try {
        const parsedAnswers = JSON.parse(savedAnswers);
        setAnswers(parsedAnswers);
      } catch (error) {
        console.error("Error parsing saved answers:", error);
      }
    }
  }, [sessionCode, testId]);

  // Load current question's answer when question changes
  useEffect(() => {
    if (answers[questionId]) {
      setSelectedAnswer(answers[questionId]);
    } else {
      setSelectedAnswer("");
    }
  }, [questionId, answers]);

  // Get session data
  const { useGetPublicSessionByCode } = useSessions();
  const sessionQuery = useGetPublicSessionByCode(sessionCode);

  // Get questions data
  const { useGetQuestions, useGetQuestionById } = useQuestions();
  const questionsQuery = useGetQuestions(testId, {
    sort_by: "sequence",
    sort_order: "asc",
    limit: 1000, // Get all questions for navigation
  });

  const currentQuestionQuery = useGetQuestionById(testId, questionId);

  // Handle loading states
  if (
    sessionQuery.isLoading ||
    questionsQuery.isLoading ||
    currentQuestionQuery.isLoading
  ) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Handle errors
  if (
    sessionQuery.error ||
    questionsQuery.error ||
    currentQuestionQuery.error
  ) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-2">
            Terjadi Kesalahan
          </h2>
          <p className="text-gray-600 mb-4">
            {sessionQuery.error?.message ||
              questionsQuery.error?.message ||
              currentQuestionQuery.error?.message}
          </p>
          <button
            onClick={() => navigate(`/psikotes/${sessionCode}`)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Kembali ke Sesi
          </button>
        </div>
      </div>
    );
  }

  const sessionData = sessionQuery.data;
  const questions = questionsQuery.data?.data || [];
  const currentQuestion = currentQuestionQuery.data?.data;

  // Handle case where questionId doesn't exist (redirect to first question)
  useEffect(() => {
    if (
      questions.length > 0 &&
      !currentQuestion &&
      !currentQuestionQuery.isLoading
    ) {
      const firstQuestion = questions[0];
      navigate(
        `/psikotes/${sessionCode}/test/${testId}/question/${firstQuestion.id}`,
        { replace: true }
      );
      return;
    }
  }, [
    questions,
    currentQuestion,
    currentQuestionQuery.isLoading,
    navigate,
    sessionCode,
    testId,
  ]);

  if (!sessionData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Data sesi tidak ditemukan
          </h2>
          <p className="text-gray-600 mb-4">
            Sesi tidak ditemukan atau tidak valid
          </p>
          <button
            onClick={() => navigate(`/psikotes/${sessionCode}`)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Kembali ke Sesi
          </button>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Find current question index
  const currentIndex = questions.findIndex((q) => q.id === questionId);
  const currentQuestionNumber = currentIndex + 1;
  const totalQuestions = questions.length;
  const answeredCount = Object.keys(answers).length;

  // Navigation handlers
  const handlePrevious = () => {
    if (currentIndex > 0) {
      const prevQuestion = questions[currentIndex - 1];
      navigate(
        `/psikotes/${sessionCode}/test/${testId}/question/${prevQuestion.id}`
      );
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      const nextQuestion = questions[currentIndex + 1];
      navigate(
        `/psikotes/${sessionCode}/test/${testId}/question/${nextQuestion.id}`
      );
    }
  };

  const handleQuestionSelect = (questionId: string) => {
    navigate(`/psikotes/${sessionCode}/test/${testId}/question/${questionId}`);
  };

  const handleAnswerChange = (value: string) => {
    setSelectedAnswer(value);
    const newAnswers = {
      ...answers,
      [questionId]: value,
    };
    setAnswers(newAnswers);

    // Save to localStorage
    const storageKey = `psikotes_answers_${sessionCode}_${testId}`;
    localStorage.setItem(storageKey, JSON.stringify(newAnswers));
  };

  const handleLogout = () => {
    navigate(`/psikotes/${sessionCode}`);
  };

  // Calculate session timing
  const timeRemaining = sessionData.end_time
    ? formatDistanceToNow(parseISO(sessionData.end_time), {
        addSuffix: true,
        locale: id,
      })
    : "Tidak terbatas";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <button
              onClick={() =>
                navigate(`/psikotes/${sessionCode}/test/${testId}`)
              }
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Kembali</span>
            </button>

            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                {sessionData.session_name}
              </h1>
              <p className="text-sm text-gray-600">
                Pertanyaan {currentQuestionNumber} dari {totalQuestions}
              </p>
            </div>

            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-1">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>
                  {answeredCount}/{totalQuestions} terjawab
                </span>
              </div>

              <div className="flex items-center space-x-1">
                <Clock className="h-4 w-4 text-blue-500" />
                <span>{timeRemaining}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-48 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${(answeredCount / totalQuestions) * 100}%`,
                  }}
                ></div>
              </div>
              <span className="text-sm text-gray-600">
                {Math.round((answeredCount / totalQuestions) * 100)}%
              </span>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center space-x-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <LogOut className="h-4 w-4" />
              <span>Keluar</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-1">
        {/* Left Panel - Navigation */}
        <div className="w-80 bg-white border-r border-gray-200 h-[calc(100vh-80px)] overflow-y-auto">
          <div className="p-4">
            <h3 className="font-medium text-gray-900 mb-4">Navigasi Soal</h3>

            <div className="grid grid-cols-5 gap-2">
              {questions.map((question, index) => {
                const isAnswered = answers[question.id];
                const isActive = question.id === questionId;

                return (
                  <button
                    key={question.id}
                    onClick={() => handleQuestionSelect(question.id)}
                    className={`
                      w-10 h-10 rounded-lg text-sm font-medium border-2 transition-all
                      ${
                        isActive
                          ? "bg-blue-600 text-white border-blue-600"
                          : isAnswered
                            ? "bg-green-100 text-green-700 border-green-300 hover:bg-green-200"
                            : "bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100"
                      }
                    `}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>

            <div className="mt-6 space-y-2 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-blue-600 rounded"></div>
                <span>Soal Aktif</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-green-100 border-2 border-green-300 rounded"></div>
                <span>Sudah Dijawab</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-gray-50 border-2 border-gray-300 rounded"></div>
                <span>Belum Dijawab</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Question Content */}
        <div className="flex-1 p-6">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              {/* Question */}
              <div className="mb-6">
                <div className="flex items-start space-x-2 mb-4">
                  <span className="inline-block bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded">
                    {currentQuestion.question_type
                      .replace("_", " ")
                      .toUpperCase()}
                  </span>
                  {currentQuestion.is_required && (
                    <span className="inline-block bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded">
                      WAJIB
                    </span>
                  )}
                </div>

                <h2 className="text-lg font-medium text-gray-900 mb-4">
                  {currentQuestion.question}
                </h2>

                {currentQuestion.image_url && (
                  <div className="mb-4">
                    <img
                      src={currentQuestion.image_url}
                      alt="Question illustration"
                      className="max-w-full h-auto rounded-lg border border-gray-200"
                    />
                  </div>
                )}

                {currentQuestion.audio_url && (
                  <div className="mb-4">
                    <audio controls className="w-full">
                      <source
                        src={currentQuestion.audio_url}
                        type="audio/mpeg"
                      />
                      Browser Anda tidak mendukung audio.
                    </audio>
                  </div>
                )}
              </div>

              {/* Answer Options */}
              <div className="mb-8">
                {currentQuestion.question_type === "multiple_choice" &&
                  currentQuestion.options && (
                    <div className="space-y-3">
                      {currentQuestion.options.map((option, index) => (
                        <label
                          key={index}
                          className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                        >
                          <input
                            type="radio"
                            name="answer"
                            value={option.value}
                            checked={selectedAnswer === option.value}
                            onChange={(e) => handleAnswerChange(e.target.value)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                          />
                          <span className="text-gray-900">{option.label}</span>
                        </label>
                      ))}
                    </div>
                  )}

                {currentQuestion.question_type === "true_false" && (
                  <div className="space-y-3">
                    <label className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="radio"
                        name="answer"
                        value="true"
                        checked={selectedAnswer === "true"}
                        onChange={(e) => handleAnswerChange(e.target.value)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <span className="text-gray-900">Benar</span>
                    </label>
                    <label className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="radio"
                        name="answer"
                        value="false"
                        checked={selectedAnswer === "false"}
                        onChange={(e) => handleAnswerChange(e.target.value)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <span className="text-gray-900">Salah</span>
                    </label>
                  </div>
                )}

                {currentQuestion.question_type === "text" && (
                  <textarea
                    value={selectedAnswer}
                    onChange={(e) => handleAnswerChange(e.target.value)}
                    placeholder="Tulis jawaban Anda di sini..."
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    rows={4}
                  />
                )}

                {currentQuestion.question_type === "rating_scale" && (
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <span className="text-sm text-gray-600">
                      Sangat Tidak Setuju
                    </span>
                    <div className="flex space-x-2">
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <label key={rating} className="cursor-pointer">
                          <input
                            type="radio"
                            name="answer"
                            value={rating.toString()}
                            checked={selectedAnswer === rating.toString()}
                            onChange={(e) => handleAnswerChange(e.target.value)}
                            className="sr-only"
                          />
                          <div
                            className={`
                            w-10 h-10 rounded-full border-2 flex items-center justify-center text-sm font-medium
                            ${
                              selectedAnswer === rating.toString()
                                ? "bg-blue-600 text-white border-blue-600"
                                : "bg-white text-gray-700 border-gray-300 hover:border-blue-300"
                            }
                          `}
                          >
                            {rating}
                          </div>
                        </label>
                      ))}
                    </div>
                    <span className="text-sm text-gray-600">Sangat Setuju</span>
                  </div>
                )}

                {currentQuestion.question_type === "sequence" && (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600">
                      Pilih urutan yang benar untuk melengkapi pola:
                    </p>
                    {currentQuestion.options && (
                      <div className="grid grid-cols-2 gap-3">
                        {currentQuestion.options.map((option, index) => (
                          <label
                            key={index}
                            className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                          >
                            <input
                              type="radio"
                              name="answer"
                              value={option.value}
                              checked={selectedAnswer === option.value}
                              onChange={(e) =>
                                handleAnswerChange(e.target.value)
                              }
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                            />
                            <span className="text-gray-900 font-mono">
                              {option.label}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {currentQuestion.question_type === "matrix" && (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600">
                      Pilih jawaban yang melengkapi pola matriks:
                    </p>
                    {currentQuestion.options && (
                      <div className="grid grid-cols-3 gap-3">
                        {currentQuestion.options.map((option, index) => (
                          <label
                            key={index}
                            className="flex flex-col items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                          >
                            <input
                              type="radio"
                              name="answer"
                              value={option.value}
                              checked={selectedAnswer === option.value}
                              onChange={(e) =>
                                handleAnswerChange(e.target.value)
                              }
                              className="mb-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                            />
                            <span className="text-gray-900 text-center">
                              {option.label}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {currentQuestion.question_type === "drawing" && (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600">
                      Gambar jawaban Anda di area di bawah ini:
                    </p>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50">
                      <p className="text-gray-500">
                        Fitur menggambar akan tersedia segera
                      </p>
                      <textarea
                        value={selectedAnswer}
                        onChange={(e) => handleAnswerChange(e.target.value)}
                        placeholder="Atau deskripsikan jawaban Anda dengan teks..."
                        className="w-full mt-4 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                        rows={3}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between">
                <button
                  onClick={handlePrevious}
                  disabled={currentIndex === 0}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Sebelumnya
                </button>

                <span className="text-sm text-gray-600">
                  {currentQuestionNumber} dari {totalQuestions}
                </span>

                <button
                  onClick={handleNext}
                  disabled={currentIndex === questions.length - 1}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Selanjutnya
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
