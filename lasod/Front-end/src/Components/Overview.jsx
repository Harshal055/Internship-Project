import React, { useState, useEffect } from "react";

const Overview = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      url: "https://images.unsplash.com/photo-1531297484001-80022131f5a1?ixlib=rb-4.0.3",
      title: "Tech 1",
    },
    {
      url: "https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?ixlib=rb-4.0.3",
      title: "Tech 2",
    },
    {
      url: "https://images.unsplash.com/photo-1661961112951-f2bfd1f253ce?ixlib=rb-4.0.3",
      title: "Tech 3",
    },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const goToSlide = (slideIndex) => {
    setCurrentSlide(slideIndex);
  };

  return (
    <div className="h-[600px] w-full relative overflow-hidden group">
      <div
        className="flex transition-transform duration-700 ease-out h-full"
        style={{ transform: `translateX(-${currentSlide * 100}%)` }}
      >
        {slides.map((slide, index) => (
          <div key={index} className="min-w-full h-full">
            <img
              src={slide.url}
              alt={slide.title}
              className="w-full h-full object-cover transition-opacity duration-700"
            />
          </div>
        ))}
      </div>

      {/* Left Arrow */}
      <div className="hidden group-hover:block absolute top-[50%] -translate-x-0 translate-y-[-50%] left-3 text-xl rounded-full p-1.5 bg-black/20 text-white cursor-pointer transition-all duration-300 hover:bg-black/40">
        <button
          onClick={() =>
            goToSlide(currentSlide === 0 ? slides.length - 1 : currentSlide - 1)
          }
        >
          ❮
        </button>
      </div>

      {/* Right Arrow */}
      <div className="hidden group-hover:block absolute top-[50%] -translate-x-0 translate-y-[-50%] right-3 text-xl rounded-full p-1.5 bg-black/20 text-white cursor-pointer transition-all duration-300 hover:bg-black/40">
        <button
          onClick={() =>
            goToSlide(currentSlide === slides.length - 1 ? 0 : currentSlide + 1)
          }
        >
          ❯
        </button>
      </div>

      {/* Indicators */}
      <div className="absolute bottom-2 right-0 left-0">
        <div className="flex items-center justify-center gap-1.5">
          {slides.map((_, slideIndex) => (
            <div
              key={slideIndex}
              onClick={() => goToSlide(slideIndex)}
              className={`
                transition-all duration-300 w-2 h-2 bg-white rounded-full cursor-pointer
                ${currentSlide === slideIndex ? "scale-150" : "bg-opacity-50"}
              `}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Overview;
