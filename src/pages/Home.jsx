import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Moon, Sun, Volume2, VolumeX, HelpCircle, Trophy, Settings } from 'lucide-react'
import MainFeature from '../components/MainFeature'

const Home = ({ darkMode, setDarkMode }) => {
  const [showGame, setShowGame] = useState(false)
  const [muted, setMuted] = useState(false)
  const [showInstructions, setShowInstructions] = useState(false)
  const [highScore, setHighScore] = useState(() => {
    const savedScore = localStorage.getItem('highScore')
    return savedScore ? parseInt(savedScore) : 0
  })

  useEffect(() => {
    localStorage.setItem('highScore', highScore.toString())
  }, [highScore])

  const toggleDarkMode = () => {
    setDarkMode(!darkMode)
  }

  const toggleMute = () => {
    setMuted(!muted)
  }

  const toggleInstructions = () => {
    setShowInstructions(!showInstructions)
  }

  const startGame = () => {
    setShowGame(true)
  }

  const backToMenu = () => {
    setShowGame(false)
  }

  const updateHighScore = (newScore) => {
    if (newScore > highScore) {
      setHighScore(newScore)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header with controls */}
      <header className="p-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleDarkMode}
            className="p-2 rounded-full bg-surface-200 dark:bg-surface-700 text-surface-700 dark:text-surface-200"
            aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleMute}
            className="p-2 rounded-full bg-surface-200 dark:bg-surface-700 text-surface-700 dark:text-surface-200"
            aria-label={muted ? "Unmute" : "Mute"}
          >
            {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </motion.button>
        </div>
        
        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleInstructions}
            className="p-2 rounded-full bg-surface-200 dark:bg-surface-700 text-surface-700 dark:text-surface-200"
            aria-label="Instructions"
          >
            <HelpCircle size={20} />
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="p-2 rounded-full bg-surface-200 dark:bg-surface-700 text-surface-700 dark:text-surface-200"
            aria-label="Settings"
          >
            <Settings size={20} />
          </motion.button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4">
        {!showGame ? (
          <div className="text-center">
            <motion.div
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="mb-8"
            >
              <h1 className="text-5xl md:text-7xl font-extrabold mb-2 bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
                VG DASH
              </h1>
              <p className="text-lg text-surface-600 dark:text-surface-400">
                Run, jump, slide & collect coins!
              </p>
            </motion.div>
            
            <div className="flex flex-col gap-4 items-center">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="btn btn-primary w-64 text-xl shadow-lg"
                onClick={startGame}
              >
                PLAY NOW
              </motion.button>
              
              <div className="flex items-center gap-2 text-surface-600 dark:text-surface-400">
                <Trophy size={20} className="text-accent" />
                <span>High Score: {highScore}</span>
              </div>
              
              <div className="mt-4 grid grid-cols-2 gap-3">
                <motion.div
                  whileHover={{ scale: 1.03 }}
                  className="bg-surface-200 dark:bg-surface-700 p-4 rounded-xl"
                >
                  <h3 className="font-bold text-primary mb-1">Characters</h3>
                  <p className="text-sm text-surface-600 dark:text-surface-400">
                    Unlock new runners
                  </p>
                </motion.div>
                
                <motion.div
                  whileHover={{ scale: 1.03 }}
                  className="bg-surface-200 dark:bg-surface-700 p-4 rounded-xl"
                >
                  <h3 className="font-bold text-secondary mb-1">Shop</h3>
                  <p className="text-sm text-surface-600 dark:text-surface-400">
                    Spend your coins
                  </p>
                </motion.div>
              </div>
            </div>
          </div>
        ) : (
          <MainFeature 
            backToMenu={backToMenu} 
            updateHighScore={updateHighScore} 
            highScore={highScore}
            muted={muted}
          />
        )}
      </main>

      {/* Instructions Modal */}
      {showInstructions && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={toggleInstructions}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-surface-100 dark:bg-surface-800 p-6 rounded-2xl max-w-md w-full shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold mb-4 text-primary">How to Play</h2>
            
            <div className="space-y-4 mb-6">
              <div>
                <h3 className="font-bold text-secondary mb-1">Controls</h3>
                <ul className="list-disc pl-5 text-surface-700 dark:text-surface-300">
                  <li>Use <span className="font-bold">Arrow Keys</span> or <span className="font-bold">WASD</span> to move</li>
                  <li><span className="font-bold">↑ or W</span>: Jump</li>
                  <li><span className="font-bold">↓ or S</span>: Slide</li>
                  <li><span className="font-bold">← → or A D</span>: Move left/right</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-bold text-secondary mb-1">Objective</h3>
                <p className="text-surface-700 dark:text-surface-300">
                  Run as far as possible, dodge obstacles, and collect coins to increase your score!
                </p>
              </div>
              
              <div>
                <h3 className="font-bold text-secondary mb-1">Power-ups</h3>
                <ul className="list-disc pl-5 text-surface-700 dark:text-surface-300">
                  <li><span className="font-bold text-accent">Magnet</span>: Attracts coins</li>
                  <li><span className="font-bold text-primary">Jetpack</span>: Fly over obstacles</li>
                  <li><span className="font-bold text-secondary">Shield</span>: Protects from one collision</li>
                </ul>
              </div>
            </div>
            
            <button 
              className="btn btn-primary w-full"
              onClick={toggleInstructions}
            >
              Got it!
            </button>
          </motion.div>
        </motion.div>
      )}

      <footer className="p-4 text-center text-sm text-surface-500">
        &copy; {new Date().getFullYear()} VG DASH | All Rights Reserved
      </footer>
    </div>
  )
}

export default Home