import React from "react";

export const Highlight = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 300 25"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    preserveAspectRatio="none"
  >
    <path
      d="M3 20C50 5 150 5 297 15"
      stroke="currentColor"
      strokeWidth="12"
      strokeLinecap="round"
      strokeOpacity="0.4"
    />
  </svg>
);

export const Underline = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 300 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    preserveAspectRatio="none"
  >
    <path
      d="M5 10C80 15 200 15 295 5"
      stroke="currentColor"
      strokeWidth="6"
      strokeLinecap="round"
    />
  </svg>
);

export const Circle = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 200 80"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    preserveAspectRatio="none"
  >
    <path
      d="M10 40C10 20 40 5 100 5C160 5 190 20 190 40C190 60 160 75 100 75C40 75 10 60 10 40Z"
      stroke="currentColor"
      strokeWidth="4"
      strokeLinecap="round"
    />
  </svg>
);

export const Arrow = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M10 10C30 50 50 50 80 80M80 80L60 80M80 80L80 60"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
