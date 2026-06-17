
import React from "react";

const MadeByHumans = () => {
  return (
    <section id="made-by-humans" className="w-full bg-white py-8">
      <div className="section-container opacity-0 animate-on-scroll">
        <div className="w-full rounded-2xl sm:rounded-3xl overflow-hidden relative">
          <div className="bg-no-repeat bg-cover bg-center p-6 sm:p-8 min-h-[300px] sm:min-h-[400px] flex flex-col justify-between" style={{
            backgroundImage: "url('/background-section3.png')"
          }}>
            <div className="flex items-center text-white">
              <div className="text-2xl font-display font-bold text-white mr-3">
                <span>Swish</span>
                <span className="text-white/80">View</span>
              </div>
            </div>
            
            <div className="flex-1 flex items-center justify-center">
              <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-playfair text-white italic font-thin text-center">
                Trusted by Creators
              </h2>
            </div>
            
            <div className="w-[120%] bg-white h-10 rounded-t-lg absolute left-[-10%] bottom-0"></div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MadeByHumans;
