
"use client";

import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

const SmoothCursor = () => {
  const [isHovered, setIsHovered] = useState(false);
  const [hasMounted, setHasMounted] = useState(false); // State to prevent SSR mismatch
  const cursorSize = isHovered ? 40 : 20;

  const mouse = {
    x: useMotionValue(0),
    y: useMotionValue(0),
  };

  const smoothOptions = { damping: 20, stiffness: 300, mass: 0.5 };
  const smoothMouse = {
    x: useSpring(mouse.x, smoothOptions),
    y: useSpring(mouse.y, smoothOptions),
  };

  useEffect(() => {
    // Set hasMounted to true only on the client
    setHasMounted(true);

    const manageMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e;
      mouse.x.set(clientX - cursorSize / 2);
      mouse.y.set(clientY - cursorSize / 2);
    };

    const manageMouseOver = () => setIsHovered(true);
    const manageMouseLeave = () => setIsHovered(false);

    window.addEventListener("mousemove", manageMouseMove);

    const interactiveElements = document.querySelectorAll(
      'a, button, [role="button"], input, textarea, select, label'
    );
    interactiveElements.forEach((el) => {
      el.addEventListener("mouseover", manageMouseOver);
      el.addEventListener("mouseleave", manageMouseLeave);
      (el as HTMLElement).style.cursor = "none";
    });

    document.body.classList.add("cursor-none");

    return () => {
      window.removeEventListener("mousemove", manageMouseMove);
      interactiveElements.forEach((el) => {
        el.removeEventListener("mouseover", manageMouseOver);
        el.removeEventListener("mouseleave", manageMouseLeave);
        (el as HTMLElement).style.cursor = "auto";
      });
      document.body.classList.remove("cursor-none");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursorSize]);

  // Don't render anything on the server or during the initial client render
  if (!hasMounted) {
    return null;
  }

  return (
    <motion.div
      style={{
        left: smoothMouse.x,
        top: smoothMouse.y,
        width: cursorSize,
        height: cursorSize,
      }}
      className="pointer-events-none fixed z-[9999] rounded-full"
      animate={{ scale: isHovered ? 1.3 : 1, transition: { duration: 0.2 } }}
    >
        {/* Torch Light Effect */}
        <motion.div 
            className="absolute inset-0 rounded-full"
            style={{
                background: `radial-gradient(
                    circle,
                    hsla(var(--primary), 0.1),
                    transparent 60%
                )`,
                scale: 10, // Make the light effect much larger than the cursor itself
                opacity: 0.7
            }}
        />

        {/* Inner Cursor Dot */}
        <motion.div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-primary"
            animate={{ scale: isHovered ? 1.5 : 1 }}
        />
    </motion.div>
  );
};

export default SmoothCursor;
