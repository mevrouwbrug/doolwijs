"use client";

interface QuestionModalProps {
  isOpen: boolean;
  onAnswer: (correct: boolean) => void;
}

const DUMMY_QUESTION = "Welke zin is juist?";
const OPTIONS = [
  { id: "A", text: "De hond loop in de tuin.", correct: false },
  { id: "B", text: "De hond loopt in de tuin.", correct: true },
  { id: "C", text: "De hond lopen in de tuin.", correct: false },
  { id: "D", text: "De hond loopt in de tuin", correct: false },
];

export function QuestionModal({ isOpen, onAnswer }: QuestionModalProps) {
  if (!isOpen) return null;

  function handleClick(correct: boolean) {
    onAnswer(correct);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 font-opendyslexic"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="mx-4 max-w-md rounded-2xl bg-slate-100 p-8 shadow-xl">
        <h2
          id="modal-title"
          className="mb-6 text-xl font-bold text-slate-800"
        >
          {DUMMY_QUESTION}
        </h2>
        <div className="flex flex-col gap-4">
          {OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => handleClick(opt.correct)}
              className="rounded-xl border-2 border-slate-300 bg-white px-6 py-4 text-left text-slate-800 transition hover:border-blue-400 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <span className="mr-3 font-bold text-blue-600">{opt.id}.</span>
              {opt.text}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
