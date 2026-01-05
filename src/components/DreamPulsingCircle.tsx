import { PulsingBorder } from "@paper-design/shaders-react"
import { motion } from "framer-motion"
import { useNavigate } from "react-router-dom"
import { supabase } from "@/integrations/supabase/client"

export function DreamPulsingCircle() {
  const navigate = useNavigate()

  const handleClick = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      navigate('/new-dream')
    } else {
      navigate('/auth')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.8 }}
      className="absolute bottom-8 right-8 z-20"
    >
      <motion.div
        onClick={handleClick}
        className="relative w-[300px] h-[300px] cursor-pointer"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {/* Pulsing Border Circle */}
        <PulsingBorder
          colorBack="hsl(270, 60%, 10%)"
          colors={["hsl(290, 70%, 50%)", "hsl(270, 70%, 60%)", "hsl(320, 70%, 50%)"]}
          roundness={1}
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            borderRadius: "50%",
          }}
        />

        {/* Rotating Text Around the Pulsing Border */}
        <motion.div
          className="absolute inset-0"
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        >
          <svg viewBox="0 0 300 300" className="w-full h-full">
            <defs>
              <path
                id="dreamCirclePath"
                d="M 150, 150 m -120, 0 a 120,120 0 1,1 240,0 a 120,120 0 1,1 -240,0"
              />
            </defs>
            <text className="fill-white text-[14px] font-medium tracking-widest uppercase">
              <textPath href="#dreamCirclePath">
                Scrivi il tuo sogno • Scrivi il tuo sogno • Scrivi il tuo sogno • Scrivi il tuo sogno •
              </textPath>
            </text>
          </svg>
        </motion.div>
      </motion.div>
    </motion.div>
  )
}
