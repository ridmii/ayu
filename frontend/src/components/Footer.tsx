import React from "react";

const Footer: React.FC = () => {
  const colors = {
    primary: "#0F828C",
    secondary: "#0A6168",
    dark: "#08444A",
    gradient: "linear-gradient(135deg, #0F828C 0%, #0A6168 50%, #08444A 100%)",
    gradientHover:
      "linear-gradient(135deg, #14A3B0 0%, #0F828C 50%, #0A6168 100%)",
  };

  return (
    <footer
      className="w-full text-white py-6 relative shadow-[0_-4px_20px_rgba(15,130,140,0.3)]"
      style={{
        background: colors.gradient,
      }}
    >
      {/* hover overlay */}
      <div
        className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-500"
        style={{ background: colors.gradientHover }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-6 text-center text-sm">
        <span
          className="font-medium"
          style={{
            background: "linear-gradient(135deg, #FFFFFF, #E6F4F6)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            textShadow: "0 2px 4px rgba(0,0,0,0.3)",
          }}
        >
          © 2025 Aura. All rights reserved.
        </span>
      </div>
    </footer>
  );
};

export default Footer;
