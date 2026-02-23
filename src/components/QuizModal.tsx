"use client";

import type { CurrentQuestion } from "@/lib/types";

interface QuizModalProps {
  isOpen: boolean;
  question: CurrentQuestion | null;
  questionLoading?: boolean;
  feedback: string;
  onAnswer: (correct: boolean) => void;
}

export function QuizModal({
  isOpen,
  question,
  questionLoading = false,
  feedback,
  onAnswer,
}: QuizModalProps) {
  if (!isOpen) return null;

  const showFeedback = feedback.length > 0;

  function handleClick(correct: boolean) {
    if (showFeedback) return;
    onAnswer(correct);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 font-opendyslexic"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quiz-modal-title"
    >
      <div className="mx-4 max-w-lg rounded-2xl bg-white p-10 shadow-xl">
        {questionLoading && !question && (
          <p className="text-xl text-slate-600">Vraag laden...</p>
        )}
        {question && !showFeedback && !questionLoading && (
          <>
            <h2
              id="quiz-modal-title"
              className="mb-8 text-2xl font-bold text-slate-800"
            >
              {question.vraag}
            </h2>
            <div className="flex flex-col gap-4">
              {question.opties.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleClick(opt.correct)}
                  className="rounded-xl border-2 border-slate-300 bg-slate-50 px-8 py-5 text-left text-2xl text-slate-800 transition hover:border-blue-400 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  <span className="mr-4 font-bold text-blue-600">{opt.id}.</span>
                  {opt.text}
                </button>
              ))}
            </div>
          </>
        )}
        {showFeedback && (
          <p className="text-2xl font-medium text-red-600" role="status">
            {feedback}
          </p>
        )}
      </div>
    </div>
  );
}
