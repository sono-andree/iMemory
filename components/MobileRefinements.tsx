"use client";

import { useEffect } from "react";

export default function MobileRefinements() {
  useEffect(() => {
    function setViewportHeight() {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty("--app-vh", `${vh}px`);
    }

    setViewportHeight();

    window.addEventListener("resize", setViewportHeight);
    window.addEventListener("orientationchange", setViewportHeight);

    return () => {
      window.removeEventListener("resize", setViewportHeight);
      window.removeEventListener("orientationchange", setViewportHeight);
    };
  }, []);

  return (
    <style jsx global>{`
      html,
      body {
        width: 100%;
        max-width: 100%;
        min-height: 100%;
        overflow-x: hidden;
        overflow-y: auto;
        background: #000;
      }

      body {
        position: static;
      }

      #__next {
        min-height: 100%;
      }

      * {
        box-sizing: border-box;
      }

      img,
      video,
      canvas,
      svg {
        max-width: 100%;
      }

      .scrollbar-none {
        scrollbar-width: none;
      }

      .scrollbar-none::-webkit-scrollbar {
        display: none;
      }

      .safe-mobile-bottom {
        padding-bottom: calc(92px + env(safe-area-inset-bottom));
      }

      .mobile-page {
        min-height: calc(var(--app-vh, 1vh) * 100);
        width: 100%;
        max-width: 100%;
        overflow-x: hidden;
        overflow-y: visible;
        padding-bottom: calc(92px + env(safe-area-inset-bottom));
      }

      .mobile-scroll {
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
      }

      .mobile-glass-card {
        border: 1px solid rgba(255, 255, 255, 0.1);
        background: rgba(24, 24, 27, 0.72);
        backdrop-filter: blur(28px);
        box-shadow: 0 0 45px rgba(168, 85, 247, 0.12);
      }

      .mobile-soft-grid {
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        gap: 16px;
      }

      .mobile-no-overflow {
        min-width: 0;
        max-width: 100%;
        overflow-x: hidden;
      }

      .mobile-break-text {
        overflow-wrap: anywhere;
        word-break: break-word;
      }

      @media (max-width: 1023px) {
        html,
        body {
          height: auto !important;
          min-height: calc(var(--app-vh, 1vh) * 100);
          overflow-y: auto !important;
          overflow-x: hidden !important;
          overscroll-behavior-y: auto;
        }

        body {
          background: #000;
          -webkit-font-smoothing: antialiased;
          text-rendering: geometricPrecision;
          touch-action: auto;
        }

        main {
          height: auto !important;
          min-height: calc(var(--app-vh, 1vh) * 100);
          overflow-y: visible !important;
          overflow-x: hidden !important;
        }

        input,
        textarea,
        select {
          font-size: 16px !important;
        }

        button,
        a,
        input,
        textarea,
        select {
          -webkit-tap-highlight-color: transparent;
        }

        button,
        a {
          touch-action: manipulation;
        }

        .desktop-only {
          display: none !important;
        }

        .mobile-card-padding {
          padding: 20px !important;
        }

        .mobile-title {
          font-size: clamp(2rem, 11vw, 3.4rem);
          line-height: 0.95;
          letter-spacing: -0.07em;
        }

        .mobile-subtitle {
          font-size: 0.92rem;
          line-height: 1.75;
        }

        .mobile-sticky-header {
          position: sticky;
          top: 0;
          z-index: 40;
          background: rgba(0, 0, 0, 0.72);
          backdrop-filter: blur(20px);
        }

        .mobile-sheet {
          border-top-left-radius: 28px;
          border-top-right-radius: 28px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(9, 9, 11, 0.96);
          backdrop-filter: blur(28px);
          box-shadow: 0 -20px 80px rgba(168, 85, 247, 0.2);
        }
      }

      @media (min-width: 1024px) {
        .mobile-only {
          display: none !important;
        }

        .safe-mobile-bottom {
          padding-bottom: 0;
        }
      }
    `}</style>
  );
}
