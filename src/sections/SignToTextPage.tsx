import React, { useState, useRef, useEffect } from "react";

const SignToTextPage = () => {
  const [cameraOn, setCameraOn] = useState(false);
  const [translatedText] = useState("Hello, how are you?");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Handle camera open
  const handleOpenCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;

        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch((err) => {
            console.error("Autoplay failed:", err);
          });
        };
      }
      setCameraOn(true);
    } catch (err) {
      console.error("Error accessing camera:", err);
    }
  };

  // Handle camera stop
  const handleStopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraOn(false);
  };

  // Cleanup when component unmounts
  useEffect(() => {
    return () => {
      handleStopCamera();
    };
  }, []);

  // Read aloud function
  const handleReadAloud = () => {
    const speech = new SpeechSynthesisUtterance(translatedText);
    window.speechSynthesis.speak(speech);
  };

  return (
    <section className="bg-gray-900 text-white min-h-screen flex items-center justify-center px-6 py-10">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl w-full">
        {/* Left Side - Camera */}
        <div className="bg-gray-800 rounded-2xl shadow-lg p-6 flex flex-col items-center justify-center text-center">
          <h2 className="text-2xl font-bold mb-4 text-yellow-400">Sign Input</h2>

          <div className="relative w-full">
            {!cameraOn ? (
              <button
                onClick={handleOpenCamera}
                className="bg-yellow-400 text-gray-900 font-semibold px-6 py-3 rounded-lg hover:bg-yellow-300 transition"
              >
                Open Camera
              </button>
            ) : (
              <div className="relative">
                <div className="absolute top-2 right-2 z-10 flex items-center text-green-400">
                  <div className="w-3 h-3 rounded-full bg-current mr-2 animate-pulse"></div>
                  <span className="text-sm font-medium">Camera Active</span>
                </div>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-[400px] rounded-lg border-2 border-yellow-400 object-cover bg-black"
                  style={{ transform: "scaleX(-1)" }} // Mirror effect
                />
                <button
                  onClick={handleStopCamera}
                  className="mt-4 bg-red-500 text-white font-semibold px-6 py-2 rounded-lg hover:bg-red-400 transition"
                >
                  Stop Camera
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Side - Translated Text */}
        <div className="bg-gray-800 rounded-2xl shadow-lg p-6 flex flex-col items-center justify-center text-center">
          <h2 className="text-2xl font-bold mb-4 text-yellow-400">Translated Text</h2>
          <div className="bg-gray-700 p-4 rounded-lg w-full h-40 flex items-center justify-center text-xl text-white mb-6">
            {translatedText}
          </div>
          <button
            onClick={handleReadAloud}
            className="bg-yellow-400 text-gray-900 font-semibold px-6 py-3 rounded-lg hover:bg-yellow-300 transition"
          >
            Read Aloud
          </button>
        </div>
      </div>
    </section>
  );
};

export default SignToTextPage;
