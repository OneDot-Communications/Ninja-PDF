"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

// Scroll-triggered animation component - optimized
export const ScrollReveal = ({
    children,
    className = "",
    delay = 0,
    direction = "up"
}: {
    children: React.ReactNode;
    className?: string;
    delay?: number;
    direction?: "up" | "down" | "left" | "right";
}) => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-50px" });

    const directions = {
        up: { y: 40, x: 0 },
        down: { y: -40, x: 0 },
        left: { x: 40, y: 0 },
        right: { x: -40, y: 0 }
    };

    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, ...directions[direction] }}
            animate={isInView ? { opacity: 1, x: 0, y: 0 } : {}}
            transition={{ duration: 0.5, delay, ease: "easeOut" }}
            className={className}
            style={{ willChange: "transform, opacity" }}
        >
            {children}
        </motion.div>
    );
};

// Staggered children animation
export const StaggerContainer = ({
    children,
    className = "",
    staggerDelay = 0.1
}: {
    children: React.ReactNode;
    className?: string;
    staggerDelay?: number;
}) => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, amount: 0 });

    return (
        <motion.div
            ref={ref}
            initial="visible"
            animate="visible"
            variants={{
                hidden: { opacity: 1 },
                visible: { opacity: 1, transition: { staggerChildren: staggerDelay } }
            }}
            className={className}
        >
            {children}
        </motion.div>
    );
};

export const StaggerItem = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <motion.div
        variants={{
            hidden: { opacity: 0, y: 20 },
            visible: {
                opacity: 1,
                y: 0,
                transition: { duration: 0.3, ease: "easeOut" }
            }
        }}
        className={className}
        style={{ willChange: "transform, opacity" }}
    >
        {children}
    </motion.div>
);
