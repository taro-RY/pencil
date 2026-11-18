import React from 'react';

interface NavbarProps {
  onOrderClick?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOrderClick }) => {
  return (
    <header className="fixed top-0 inset-x-0 z-40 border-b border-white/[0.08] bg-[#111520]/95">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between gap-8 px-6 md:px-10">
        {/* Zone 1: Brand wordmark (single text element) */}
        <a
          href="#top"
          className="font-mono-tech text-base font-medium tracking-[0.18em] text-[#E6E4DF] whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#C89B6E]"
        >
          M-01
        </a>

        {/* Zone 2: 3 concise single-line anchors */}
        <nav
          aria-label="主导航"
          className="flex items-center gap-6 md:gap-10 text-sm text-[#9A9891]"
        >
          <a
            href="#structure"
            className="whitespace-nowrap shrink-0 transition-colors duration-150 hover:text-[#E6E4DF] focus-visible:outline-none focus-visible:text-[#E6E4DF]"
          >
            结构
          </a>
          <a
            href="#feel"
            className="whitespace-nowrap shrink-0 transition-colors duration-150 hover:text-[#E6E4DF] focus-visible:outline-none focus-visible:text-[#E6E4DF]"
          >
            手感
          </a>
          <a
            href="#specs"
            className="whitespace-nowrap shrink-0 transition-colors duration-150 hover:text-[#E6E4DF] focus-visible:outline-none focus-visible:text-[#E6E4DF]"
          >
            规格
          </a>
        </nav>

        {/* Zone 3: Single primary action */}
        <div className="shrink-0">
          <a
            href="#order"
            onClick={() => onOrderClick?.()}
            className="inline-flex items-center justify-center border border-[#C89B6E]/60 bg-[#C89B6E]/10 px-4 py-2 text-xs font-medium tracking-wide text-[#E6E4DF] whitespace-nowrap shrink-0 transition-colors duration-150 hover:border-[#C89B6E] hover:bg-[#C89B6E] hover:text-[#0E0F12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C89B6E]"
          >
            定制与预订
          </a>
        </div>
      </div>
    </header>
  );
};
