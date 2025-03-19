import { AnimatePresence, motion } from "framer-motion";
import { showToast } from "../../utils/alertHelper";
import React, { useEffect, useRef, useState } from "react";

const RafflePicker = ({
  participants = [],
  onPickWinner,
  onRemoveAttendee,
}) => {
  const [isRaffling, setIsRaffling] = useState(false);
  const [winner, setWinner] = useState(null);
  const [displayedParticipants, setDisplayedParticipants] = useState([]);
  const [countdown, setCountdown] = useState(null);
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [divSize, setDivSize] = useState({ width: 0, height: 0 });
  const spinnerRef = useRef(null);
  

  const selectRandomWinner = (participantArray) => {
    if (!participantArray || participantArray.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * participantArray.length);
    return participantArray[randomIndex];
  };

  // Function to trigger confetti
  const triggerConfetti = () => {
    const confettiSettings = {
      particleCount: 150,
      spread: 180,
      origin: { y: 0.6 },
      colors: [
        "#FFD700",
        "#FFA500",
        "#ff0000",
        "#00ff00",
        "#0000ff",
        "#800080",
      ],
    };

    if (typeof window.confetti === "function") {
      // kanan
      window.confetti({
        ...confettiSettings,
        origin: { x: 0.2, y: 0.5 },
      });

      // kaliwa
      window.confetti({
        ...confettiSettings,
        origin: { x: 0.8, y: 0.5 },
      });

      // centerrr
      setTimeout(() => {
        window.confetti({
          ...confettiSettings,
          origin: { x: 0.5, y: 0.5 },
        });
      }, 500);
    }
  };

  // Starts raffle (animation and RNG)
  const startRaffle = () => {
        if (participants.length < 2) {
          showToast(
            "error",
            "You need at least 2 participants to start the raffle!"
          );
          return;
        }
    setIsRaffling(true);
    setWinner(null);
    setShowWinnerModal(false);
    // setShowConfetti(false); // Reset confetti before picking
  
    let iterations = 0;
  
    // Function to get unique random participants
    const getUniqueRandomParticipants = (count, exclude = null) => {
      const availableParticipants = participants.filter(p => p !== exclude);
      const shuffled = [...availableParticipants].sort(() => Math.random() - 0.5);
      return shuffled.slice(0, count);
    };
  
    // Start shuffling participants with random movement
    const shuffleInterval = setInterval(() => {
      const buffer = 80;
      const randomX =
        Math.random() * (divSize.width - buffer * 2) - (divSize.width / 2 - buffer);
      const randomY =
        Math.random() * (divSize.height - buffer * 3) - (divSize.height / 2 - buffer);
  
      setPosition({ x: randomX, y: randomY });
      setDisplayedParticipants(getUniqueRandomParticipants(1));
  
      iterations++;
  
      // Stop after 100 iterations (like pickWinner)
      if (iterations > 100) {
        clearInterval(shuffleInterval);
  
        // Select a true random winner
        const selectedWinner = selectRandomWinner(participants);
  
        // Get 9 unique random participants excluding the winner
        let finalDisplayed = getUniqueRandomParticipants(0, selectedWinner);
  
        // Insert the winner in the center (index 4)
        finalDisplayed.splice(4, 0, selectedWinner);
        setDisplayedParticipants(finalDisplayed);
        setWinner(selectedWinner);
        setIsRaffling(false);
        // setShowConfetti(true); // 🎉 Trigger confetti!
  
        // Apply highlight animation to the winner
        if (spinnerRef.current) {
          const items = spinnerRef.current.querySelectorAll(".participant-item");
          if (items[4]) items[4].classList.add("winner-glow");
        }
  
        // Show winner modal after a short delay
        setTimeout(() => {
          setShowWinnerModal(true);
          triggerConfetti();
        }, 1000);
      }
    }, 90); // Faster shuffle speed for smoother effect
  
    // Handle countdown
    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };
  
  // Modal close function
  const closeWinnerModal = () => {
    setShowWinnerModal(false);
  };

  // Load confetti library
  useEffect(() => {
    // Checks if we have con petty loaded already
    if (typeof window.confetti !== "function") {
      const script = document.createElement("script");
      script.src =
        "https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js";
      script.async = true;

      document.body.appendChild(script);

      return () => {
        document.body.removeChild(script);
      };
    }
  }, []);

  return (
    <div className="w-full flex flex-col items-center">
      {/* <h2 className="text-2xl font-bold mb-6 text-center">Raffle Draw</h2> */}

      {/* Raffle visualization */}
      <div className="w-full  relative ">
        {/* Countdown overlay */}
        {countdown !== null && (
          <div className="absolute inset-0 flex items-center justify-center z-20 text-6xl font-bold text-white">
            {countdown}
          </div>
        )}

        {/* Raffle spinner */}
        <div
          ref={spinnerRef}
          className="relative w-[80vw] h-[80vw] sm:w-[60vw] sm:h-[60vw] md:w-[50vw] md:h-[50vw] lg:w-[35vw] lg:h-[35vw] xl:w-[35vw] xl:h-[35vw]  mb-5 mx-auto rounded-full border-white/30 backdrop-blur-lg flex items-center justify-center overflow-hidden animate-spinGlow"
          style={{
            background: `radial-gradient(circle at 50% 50%, 
              rgba(180, 230, 255, 0.3) 40%, 
              rgba(80, 180, 255, 0.25) 60%, 
              rgba(22, 130, 200, 0.3) 80%, 
              rgba(10, 100, 160, 0.4) 100%)`
          }}
        >
          {/* line moving in the circle */}
            {isRaffling && (
          <motion.div
            className="absolute w-full h-full border-[10px] border-transparent border-t-primary border-r-navy rounded-full"
            animate={{ rotate: 360, borderWidth: [4] }}
            transition={{ duration: 0.5, ease: "linear", repeat: Infinity }}
          />
        )}


 				{/* KANI KAY MAO NING ANIMATION WHILE PICKING INSIDE SA CIRCLE */}
         <AnimatePresence>
          {displayedParticipants && displayedParticipants.length > 0 && (
            displayedParticipants.map((participant, index) => (
              <motion.div
                key={participant.name} // Unique key
                className="absolute text-2xl md:text-2xl lg:text-4xl font-bold text-gray-900"
                initial={{ scale: 0, opacity: 0, x: participant.x, y: participant.y }}
                animate={{
                  scale: [1, 1.3, 0.9, 1.1, 1],
                  opacity: 1,
                  x: winner ? 0 : position.x,
                  y: winner ? 0 : position.y,
                }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              >
                {participant.name} {/* Display each participant's name */}
              </motion.div>
            ))
          )}
        </AnimatePresence>


        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col justify-center items-center ">
          <div className="flex justify-center items-center ">
          <button
            onClick={startRaffle}
            disabled={isRaffling}
            className={`mt-6 px-6 py-3 text-lg font-bold  rounded-md shadow-lg transition-all ${
              isRaffling
                ? "bg-gray-600 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-700 active:transform active:scale-95"
            } text-white`}
          >
            {isRaffling ? "Selecting..." : "Draw Winner"}
          </button>
          </div>
          {/* Participant counter */}
          <div className="mt-4 text-sm text-gray-400  text-center">
            {participants.length} participants in this raffle
          </div>
      </div>
      {/* Winner Modal */}
      {showWinnerModal && winner && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl shadow-2xl max-w-md w-full border border-gray-700 winner-modal-animation">
            {/* Modal header with close button */}
            <div className="p-5 border-b border-gray-700 flex justify-between items-center">
              <h3 className="text-2xl font-bold text-white">
                Winner Announced!
              </h3>
              <button
                onClick={closeWinnerModal}
                className="text-gray-400 hover:text-white transition-colors focus:outline-none"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                > 
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="p-6 flex flex-col items-center">
              <div className="w-24 h-24 rounded-full bg-gradient-to-r from-yellow-500 to-amber-600 flex items-center justify-center mb-4">
                <span className="text-4xl">🏆</span>
              </div>
              <h4 className="text-3xl font-bold text-yellow-400 text-center mb-1">
                {winner.name || "Unknown Participant"}
              </h4>
              {winner.campus && (
                <p className="text-gray-400 text-center mb-4">
                  {winner.campus}
                </p>
              )}
              <div className="w-full bg-gray-700 h-px my-4"></div>
              <p className="text-gray-300 text-center mb-6">
                What would you like to do with this winner?
              </p>
              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <button
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md font-medium transition-colors"
                  onClick={() => {
                    onPickWinner(winner.id_number);
                    closeWinnerModal();
                    showToast(
                      "success",
                      `${winner.name} added to winners list!`
                    );
                  }}
                >
                  Add to Winners
                </button>
                <button
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-md font-medium transition-colors"
                  onClick={() => {
                    onRemoveAttendee(winner.id_number);
                    closeWinnerModal();
                    showToast("info", `${winner.name} removed from raffle!`);
                  }}
                >
                  Remove from Raffle
                </button>
              </div>

              {/* Close button at the bottom */}
              <button
                className="mt-4 w-full bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-md font-medium transition-colors"
                onClick={closeWinnerModal}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
   
  );
};
 
export default RafflePicker;
