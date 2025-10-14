import React, { useState, useEffect } from 'react';
import '../styles/BrandingSlider.css';

const motivationalQuotes = [
  {
    quote: "The only way to do great work is to love what you do.",
    author: "Steve Jobs"
  },
  {
    quote: "Success is not the key to happiness. Happiness is the key to success.",
    author: "Albert Schweitzer"
  },
  {
    quote: "Believe you can and you're halfway there.",
    author: "Theodore Roosevelt"
  },
  {
    quote: "Your limitation—it's only your imagination.",
    author: "Unknown"
  },
  {
    quote: "Push yourself, because no one else is going to do it for you.",
    author: "Unknown"
  },
  {
    quote: "Great things never come from comfort zones.",
    author: "Unknown"
  },
  {
    quote: "Dream it. Wish it. Do it.",
    author: "Unknown"
  },
  {
    quote: "Success doesn’t just find you. You have to go out and get it.",
    author: "Unknown"
  }
];

const BrandingSlider = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex(prevIndex => (prevIndex + 1) % motivationalQuotes.length);
    }, 5000); // Change quote every 5 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="branding-slider">
      <div className="slider-content">
        <div className="brand-logo">
          <div className="logo-icon">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1H5C3.89 1 3 1.89 3 3V21C3 22.11 3.89 23 5 23H19C20.11 23 21 22.11 21 21V9M19 9H14V4H19V9Z"/>
            </svg>
          </div>
          <h1 className="brand-title">HRIS</h1>
        </div>
        <p className="brand-subtitle">Empowering Your Workforce</p>
        
        <div className="quote-container">
          <p className="quote-text">"{motivationalQuotes[currentIndex].quote}"</p>
          <p className="quote-author">- {motivationalQuotes[currentIndex].author}</p>
        </div>
      </div>
      <div className="slider-dots">
        {motivationalQuotes.map((_, index) => (
          <span
            key={index}
            className={`dot ${index === currentIndex ? 'active' : ''}`}
            onClick={() => setCurrentIndex(index)}
          ></span>
        ))}
      </div>
    </div>
  );
};

export default BrandingSlider;
