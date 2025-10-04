import React, { useState } from 'react';
import { FaPlay, FaPause, FaRedo } from 'react-icons/fa';

const TextToSignPage = () => {
  const [inputText, setInputText] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('en');

  const handleTranslate = () => {
    setIsPlaying(true);
    // Here we'll add the actual translation logic later
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  const handleReset = () => {
    setIsPlaying(false);
    // Reset animation logic will go here
  };

  return (
    <section className="bg-gray-900 text-white min-h-screen flex items-center justify-center px-6 py-10">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl w-full">
        
        {/* Left Side - Text Input */}
        <div className="bg-gray-800 rounded-2xl shadow-lg p-6 flex flex-col items-center justify-start text-center">
          <h2 className="text-2xl font-bold mb-4 text-yellow-400">Text Input</h2>
          
          {/* Language Selection */}
          <select
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            className="w-full mb-4 p-2 rounded-lg bg-gray-700 text-white border-2 border-yellow-400 focus:outline-none"
          >
            <option value="en">English</option>
            <option value="hi">Hindi</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
          </select>

          {/* Text Input Area */}
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Enter your text here..."
            className="w-full h-40 p-4 mb-4 rounded-lg bg-gray-700 text-white border-2 border-yellow-400 focus:outline-none resize-none"
          />

          {/* Control Buttons */}
          <div className="flex gap-4">
            <button
              onClick={handleTranslate}
              disabled={!inputText.trim() || isPlaying}
              className="bg-yellow-400 text-gray-900 font-semibold px-6 py-3 rounded-lg hover:bg-yellow-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Translate
            </button>
            <button
              onClick={handleReset}
              disabled={!inputText.trim()}
              className="bg-gray-600 text-white font-semibold px-6 py-3 rounded-lg hover:bg-gray-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Right Side - Avatar Animation */}
        <div className="bg-gray-800 rounded-2xl shadow-lg p-6 flex flex-col items-center justify-center text-center">
          <h2 className="text-2xl font-bold mb-4 text-yellow-400">Sign Language Avatar</h2>
          
          {/* Avatar Container */}
          <div className="w-full h-[400px] rounded-lg border-2 border-yellow-400 bg-gray-700 mb-6 flex items-center justify-center">
            {/* Avatar placeholder - We'll add the actual avatar component later */}
            <div className="text-gray-400">
              {isPlaying ? (
                <div className="animate-pulse">Signing...</div>
              ) : (
                <div>Enter text and click translate to begin</div>
              )}
            </div>
          </div>

          {/* Playback Controls */}
          <div className="flex gap-4">
            {isPlaying ? (
              <button
                onClick={handlePause}
                className="bg-yellow-400 text-gray-900 font-semibold px-6 py-3 rounded-lg hover:bg-yellow-300 transition flex items-center gap-2"
              >
                <FaPause /> Pause
              </button>
            ) : (
              <button
                onClick={handleTranslate}
                disabled={!inputText.trim()}
                className="bg-yellow-400 text-gray-900 font-semibold px-6 py-3 rounded-lg hover:bg-yellow-300 transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FaPlay /> Play
              </button>
            )}
            <button
              onClick={handleReset}
              className="bg-gray-600 text-white font-semibold px-6 py-3 rounded-lg hover:bg-gray-500 transition flex items-center gap-2"
            >
              <FaRedo /> Reset
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TextToSignPage;
