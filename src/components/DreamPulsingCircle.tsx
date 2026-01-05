import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const DreamPulsingCircle = () => {
  const navigate = useNavigate();

  const handleClick = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
      navigate('/new-dream');
    } else {
      navigate('/auth');
    }
  };

  return (
    <div className="flex items-center justify-center py-16">
      <motion.div
        className="relative cursor-pointer"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleClick}
      >
        {/* Outer pulsing circle */}
        <div className="relative w-[280px] h-[280px] sm:w-[320px] sm:h-[320px]">
          {/* Pulsing border effect */}
          <div className="absolute inset-0 rounded-full animate-pulsing-border border-2 border-[hsl(var(--mystic-magenta)/0.6)]" />
          
          {/* Inner glow layer */}
          <div className="absolute inset-4 rounded-full bg-gradient-to-br from-[hsl(var(--mystic-violet)/0.2)] via-[hsl(var(--mystic-magenta)/0.1)] to-transparent" />
          
          {/* Core gradient */}
          <div className="absolute inset-8 rounded-full bg-gradient-radial from-[hsl(var(--mystic-pink)/0.15)] via-[hsl(var(--mystic-deep)/0.5)] to-transparent" />

          {/* Rotating text */}
          <motion.div
            className="absolute inset-0"
            animate={{ rotate: 360 }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "linear"
            }}
          >
            <svg viewBox="0 0 320 320" className="w-full h-full">
              <defs>
                <path
                  id="textCircle"
                  d="M 160, 160 m -130, 0 a 130,130 0 1,1 260,0 a 130,130 0 1,1 -260,0"
                  fill="none"
                />
              </defs>
              <text className="fill-[hsl(var(--mystic-pink))] text-[16px] sm:text-[18px] font-medium tracking-[0.2em] uppercase">
                <textPath href="#textCircle" startOffset="0%">
                  Scrivi il tuo sogno • Scrivi il tuo sogno • Scrivi il tuo sogno • Scrivi il tuo sogno •
                </textPath>
              </text>
            </svg>
          </motion.div>

          {/* Center icon/indicator */}
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              className="w-16 h-16 rounded-full bg-gradient-to-br from-[hsl(var(--mystic-magenta)/0.4)] to-[hsl(var(--mystic-violet)/0.3)] flex items-center justify-center mystic-glow"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <span className="text-2xl">✨</span>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default DreamPulsingCircle;
