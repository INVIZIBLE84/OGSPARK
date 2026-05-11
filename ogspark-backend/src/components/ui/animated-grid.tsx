
"use client";

import React, { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export const AnimatedGrid = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
    const handleMouseMove = (event: MouseEvent) => {
      setMousePosition({ x: event.clientX, y: event.clientY });
    };

    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  const cols = useMemo(() => {
    if (typeof window === "undefined") return 0;
    return Math.floor(window.innerWidth / 50);
  }, []);

  const rows = useMemo(() => {
    if (typeof window === "undefined") return 0;
    return Math.floor(window.innerHeight / 50);
  }, []);

  const createTile = (rowIndex: number, colIndex: number) => {
    const key = `${rowIndex}-${colIndex}`;
    return (
      <div key={key} className="w-[50px] h-[50px] border-t border-l border-muted/20" />
    );
  };

  return (
    <div className="absolute inset-0 h-screen w-full bg-background z-0">
        {/* Glow effect */}
        <motion.div
            className="pointer-events-none absolute -inset-px rounded-full"
            style={{
            background: `radial-gradient(
                350px at ${mousePosition.x}px ${mousePosition.y}px,
                hsla(var(--primary) / 0.15),
                transparent 80%
            )`,
            }}
        />
        <motion.div
            className="pointer-events-none absolute -inset-px rounded-full"
            style={{
            background: `radial-gradient(
                550px at ${mousePosition.x + 100}px ${mousePosition.y + 100}px,
                hsla(var(--accent) / 0.1),
                transparent 80%
            )`,
            }}
        />

        {/* Grid */}
        <div className="absolute inset-0 z-0">
            <div className="grid grid-cols-[repeat(auto-fill,50px)] w-full">
            {hasMounted && Array.from({ length: rows * cols }).map((_, i) =>
                createTile(Math.floor(i / cols), i % cols)
            )}
            </div>
        </div>
    </div>
  );
};
