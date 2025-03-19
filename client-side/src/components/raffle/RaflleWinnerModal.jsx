import React, { useEffect, useState } from "react";
import Confetti from "react-confetti";
import { AiOutlineClose } from "react-icons/ai";

const RaffleWinnerModal = ({ studentData, handleCloseModal, handleConfetti, handleRemoveAtendee, handleAddWinnerAttendee,autoClose }) => {
  const [timeLeft, setTimeLeft] = useState(autoClose / 1000); // Convert ms to seconds
  const [progress, setProgress] = useState(100); // Full progress bar
  const [isVisible, setIsVisible] = useState(false);
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    setTimeout(() => setIsVisible(true), 10); // Slight delay for smoother animation

    const intervalTime = 100; 
    const totalIntervals = autoClose / intervalTime;

    const timerInterval = setInterval(() => {
      setTimeLeft((prev) => Math.max(prev - 0.1, 0));
      setProgress((prev) => Math.max(prev - 100 / totalIntervals, 0));
    }, intervalTime);
    


    const closeTimer = setTimeout(() => {
      setIsVisible(false);
      setShowConfetti(false);
      setTimeout(() => {
        handleCloseModal();
        handleConfetti();
      }, 300); // Delay to match fade-out animation
    }, autoClose);

    return () => {
      clearInterval(timerInterval);
      clearTimeout(closeTimer);
    };
  }, [handleCloseModal, autoClose]);

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 transition-opacity duration-300 ${isVisible ? "opacity-100" : "opacity-0"}`}>
      {showConfetti && (
        <Confetti
          width={window.innerWidth}
          height={window.innerHeight}
          confettiSource={{ x: window.innerWidth * 0.2, y: -100, w: window.innerWidth * 0.6, h: 150 }}
        />
      )}

      <div
        className={`bg-white rounded-lg shadow-lg w-full max-w-md relative pt-5 transition-all duration-300 transform ${
          isVisible ? "scale-100 translate-y-0 opacity-100" : "scale-90 translate-y-5 opacity-0"
        }`}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={() => {
            setIsVisible(false);
            setTimeout(handleCloseModal, 300);
          }}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-800"
        >
          <AiOutlineClose size={24} />
        </button>

        {/* Modal Content */}
        <h3 className="text-xl font-bold mb-3 text-center">🎉 Congratulations! 🎉</h3>
        <div className="flex justify-center border-2 p-3">
          {studentData ? `${studentData.name} from ${studentData.campus}` : "Winner details here"}
        </div>

        {/* Action Button */}
        <div className="flex justify-end mt-4 space-x-2">
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded transition-transform transform active:scale-95"
            onClick={() => {
              setIsVisible(false);
              setTimeout(handleCloseModal, 300);
            }}
          >
            Add to winner list
          </button>
        </div>

        {/* Animated Progress Bar */}
        <div className="mt-4">
          <div className="w-full bg-gray-300 h-2 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-600 transition-all duration-100"
              style={{ width: `${progress}%` }} 
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default RaffleWinnerModal;
