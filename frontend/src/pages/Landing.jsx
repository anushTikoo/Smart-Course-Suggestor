import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <main className="relative h-[100dvh] w-full overflow-hidden flex items-center justify-center">
      <div
        className="absolute top-10 left-1/4 w-32 h-32 bg-[#FFD93D] rotate-12 opacity-60 -z-10"
        style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }}
      ></div>
      <div
        className="absolute top-1/2 right-1/4 w-40 h-40 bg-[#4D96FF] opacity-50 -z-10"
        style={{ clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)' }}
      ></div>
      <div className="absolute bottom-20 left-10 w-48 h-48 bg-[#6BCB77] rounded-full opacity-60 -z-10"></div>
      <div className="absolute top-1/3 right-1/3 w-24 h-24 bg-[#FF6B6B] -rotate-45 opacity-50 -z-10"></div>
      <div
        className="absolute bottom-40 right-20 w-36 h-36 bg-[#FFD93D] opacity-60 -z-10"
        style={{ clipPath: 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)' }}
      ></div>

      {/* Geometric Floats Background Elements */}
      <div className="absolute top-20 -left-20 w-96 h-96 bg-[#FF6B6B]/40 rounded-full blur-2xl -z-10 animate-pulse"></div>
      <div className="absolute top-80 right-10 w-72 h-72 bg-[#58e7ab]/40 rounded-full blur-2xl -z-10"></div>
      <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-secondary-container/10 rounded-[100%] blur-[120px] -z-10"></div>

      {/* Hero Section */}
      <section className="max-w-screen-xl mx-auto px-12 w-full relative z-10 -mt-16 sm:-mt-24">
        <div className="flex flex-col items-start gap-6 sm:gap-8 max-w-4xl">
          {/* Abstract Symbol */}
          <div className="w-16 h-16 rounded-2xl bg-surface-container-highest flex items-center justify-center shadow-sm">
            <span className="material-symbols-outlined text-primary text-4xl" data-icon="auto_awesome">auto_awesome</span>
          </div>

          {/* Hero Content */}
          <div className="space-y-10">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-headline font-extrabold text-on-surface leading-[1.1] tracking-tight">
              Stop guessing what to learn. <span className="text-secondary">Start learning</span> what employers are actually hiring for.
            </h1>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 sm:gap-8 pt-2">
              <div
                onClick={() => navigate('/signup')}
                className="relative inline-flex rounded-full p-[3px] bg-gradient-to-r from-primary to-blue-500 shadow-[0_0_40px_-5px_rgba(37,76,216,0.4)] hover:shadow-[0_0_60px_-5px_rgba(37,76,216,0.6)] hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer"
              >
                {/* The animated inner track */}
                <div className="relative overflow-hidden rounded-full w-full h-full p-[2px]">
                  {/* Animated snake glowing trail */}
                  <div className="absolute top-1/2 left-1/2 w-[300%] h-[300%] -translate-x-1/2 -translate-y-1/2 animate-[spin_4s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,transparent_0%,transparent_80%,#ffffff_100%)]"></div>

                  {/* Inner button core */}
                  <div className="relative z-10 px-8 py-4 bg-gradient-to-r from-primary to-blue-500 text-white rounded-full font-bold tracking-wide text-base sm:text-lg flex items-center justify-center w-full h-full">
                    Try Now
                  </div>
                </div>
              </div>

              {/* Social Proof Blocks */}
              <div className="flex flex-wrap items-center gap-6 sm:gap-8">
                <div className="flex flex-col">
                  <span className="text-xl sm:text-2xl font-headline font-bold text-primary">5M+</span>
                  <span className="text-[10px] sm:text-xs font-label uppercase tracking-widest text-on-surface-variant mt-1">Downloads</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xl sm:text-2xl font-headline font-bold text-primary">15+</span>
                  <span className="text-[10px] sm:text-xs font-label uppercase tracking-widest text-on-surface-variant mt-1">Languages</span>
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1">
                    <span className="text-xl sm:text-2xl font-headline font-bold text-primary">4.7</span>
                    <span className="material-symbols-outlined text-tertiary text-xl sm:text-2xl" data-icon="star" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                  </div>
                  <span className="text-[10px] sm:text-xs font-label uppercase tracking-widest text-on-surface-variant mt-1">Rating</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Visual Decoration (Geometric Float Overlay) */}
        <div className="absolute -right-4 top-1/2 -translate-y-1/2 hidden lg:block w-[40%] opacity-90 pointer-events-none">
          <svg className="w-full h-auto" viewBox="0 0 400 400">
            <circle className="text-error-container/30" cx="200" cy="200" fill="currentColor" r="140"></circle>
            <rect className="text-tertiary-container/30" fill="currentColor" height="100" transform="rotate(15 50 50)" width="100" x="50" y="50"></rect>
            <polygon className="text-primary-container/30" fill="currentColor" points="300,50 350,150 250,150"></polygon>
          </svg>
        </div>
      </section>
    </main>
  );
}
