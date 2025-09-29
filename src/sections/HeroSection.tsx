import React from "react";
import { useNavigate } from 'react-router-dom';
import {
  FaHands,
  FaSmile,
  FaWifi,
  FaVrCardboard,
  FaLanguage,
  FaChalkboardTeacher,
} from "react-icons/fa";

const HeroSection = () => {
  const navigate = useNavigate();

  return (
    <section className="bg-gray-900 text-white min-h-screen w-full flex flex-col justify-center items-center px-6 text-center">
      {/* Heading */}
      <h1 className="text-4xl md:text-5xl font-bold mb-6 text-yellow-400">
        SignVerse – Bridging Communication Beyond Barriers
      </h1>
      <p className="text-lg md:text-xl max-w-2xl mx-auto mb-12 text-gray-300">
        Multilingual Sign Language Recognition empowered with AI, emotion-awareness, AR, and interactive learning.
      </p>

      {/* Features Grid as Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
        
        {/* Multilingual sign recognition */}
        <div className="bg-gray-800 rounded-2xl shadow-lg p-6 flex flex-col items-center text-center hover:shadow-yellow-400/50 transition-shadow">
          <FaHands className="text-5xl text-yellow-400 mb-4" />
          <h3 className="text-xl font-semibold text-white">Multilingual Recognition</h3>
          <p className="text-gray-400 mb-6">Supports ASL, ISL, BSL, and more.</p>
          <button className="bg-yellow-400 text-gray-900 font-semibold px-4 py-2 rounded-lg hover:bg-yellow-300 transition" onClick={() => navigate('/sign-to-text')}>
            Explore More
          </button>
        </div>

        {/* Reverse translation */}
        <div className="bg-gray-800 rounded-2xl shadow-lg p-6 flex flex-col items-center text-center hover:shadow-yellow-400/50 transition-shadow">
          <FaLanguage className="text-5xl text-yellow-400 mb-4" />
          <h3 className="text-xl font-semibold text-white">Reverse Translation</h3>
          <p className="text-gray-400 mb-6">Customizable avatars for better interaction.</p>
          <button 
            className="bg-yellow-400 text-gray-900 font-semibold px-4 py-2 rounded-lg hover:bg-yellow-300 transition"
            onClick={() => navigate('/text-to-sign')}
          >
            Explore More
          </button>
        </div>

        {/* Learning mode */}
        <div className="bg-gray-800 rounded-2xl shadow-lg p-6 flex flex-col items-center text-center hover:shadow-yellow-400/50 transition-shadow">
          <FaChalkboardTeacher className="text-5xl text-yellow-400 mb-4" />
          <h3 className="text-xl font-semibold text-white">Learning Mode</h3>
          <p className="text-gray-400 mb-6">Real-time feedback for learners.</p>
          <button className="bg-yellow-400 text-gray-900 font-semibold px-4 py-2 rounded-lg hover:bg-yellow-300 transition">
            Explore More
          </button>
        </div>

      </div>
    </section>
  );
};

export default HeroSection;
