import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ArrowRight, ArrowUp, ArrowDown, Pause, Play, RotateCcw, X } from 'lucide-react'

const GAME_WIDTH = 800
const GAME_HEIGHT = 500
const LANE_WIDTH = GAME_WIDTH / 3
const GRAVITY = 1.5
const JUMP_FORCE = 20
const GAME_SPEED_INITIAL = 5
const GAME_SPEED_INCREMENT = 0.001
const OBSTACLE_FREQUENCY = 0.02
const COIN_FREQUENCY = 0.03

const MainFeature = ({ backToMenu, updateHighScore, highScore, muted }) => {
  // Game state
  const [gameActive, setGameActive] = useState(true)
  const [gameOver, setGameOver] = useState(false)
  const [paused, setPaused] = useState(false)
  const [score, setScore] = useState(0)
  const [coins, setCoins] = useState(0)
  const [gameSpeed, setGameSpeed] = useState(GAME_SPEED_INITIAL)
  
  // Character state
  const [lane, setLane] = useState(1) // 0 = left, 1 = center, 2 = right
  const [jumping, setJumping] = useState(false)
  const [sliding, setSliding] = useState(false)
  const [characterY, setCharacterY] = useState(0)
  const [verticalVelocity, setVerticalVelocity] = useState(0)
  
  // Game elements
  const [obstacles, setObstacles] = useState([])
  const [collectibles, setCollectibles] = useState([])
  
  // Refs for animation frame and game container
  const animationRef = useRef(null)
  const gameContainerRef = useRef(null)
  const lastTimestamp = useRef(0)
  
  // Key press state
  const keysPressed = useRef({})
  
  // Initialize game
  useEffect(() => {
    const handleKeyDown = (e) => {
      keysPressed.current[e.key] = true
      
      // Prevent default for arrow keys to avoid scrolling
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault()
      }
      
      // Pause game with Escape or P
      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        setPaused(prev => !prev)
      }
      
      // Handle controls
      if (!paused && gameActive && !gameOver) {
        // Jump
        if ((e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') && !jumping) {
          jump()
        }
        
        // Slide
        if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
          setSliding(true)
        }
        
        // Move left
        if ((e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') && lane > 0) {
          setLane(prev => prev - 1)
        }
        
        // Move right
        if ((e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') && lane < 2) {
          setLane(prev => prev + 1)
        }
      }
    }
    
    const handleKeyUp = (e) => {
      keysPressed.current[e.key] = false
      
      // End slide
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        setSliding(false)
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [lane, jumping, paused, gameActive, gameOver])
  
  // Game loop
  useEffect(() => {
    if (paused || gameOver || !gameActive) return
    
    const gameLoop = (timestamp) => {
      if (!lastTimestamp.current) {
        lastTimestamp.current = timestamp
      }
      
      const deltaTime = timestamp - lastTimestamp.current
      lastTimestamp.current = timestamp
      
      // Update game state
      updateGameState(deltaTime)
      
      // Continue the loop
      animationRef.current = requestAnimationFrame(gameLoop)
    }
    
    animationRef.current = requestAnimationFrame(gameLoop)
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [paused, gameOver, gameActive])
  
  // Handle jumping physics
  useEffect(() => {
    if (jumping) {
      const jumpInterval = setInterval(() => {
        setCharacterY(prev => {
          // Apply gravity
          let newVelocity = verticalVelocity - GRAVITY
          setVerticalVelocity(newVelocity)
          
          // Calculate new position
          let newY = prev + newVelocity
          
          // Check if landed
          if (newY <= 0) {
            setJumping(false)
            setVerticalVelocity(0)
            newY = 0
          }
          
          return newY
        })
      }, 30)
      
      return () => clearInterval(jumpInterval)
    }
  }, [jumping, verticalVelocity])
  
  // Update game state
  const updateGameState = (deltaTime) => {
    // Increase score
    setScore(prev => Math.floor(prev + deltaTime * 0.01))
    
    // Increase game speed over time
    setGameSpeed(prev => prev + GAME_SPEED_INCREMENT)
    
    // Generate obstacles
    if (Math.random() < OBSTACLE_FREQUENCY) {
      const newObstacle = {
        id: Date.now(),
        type: Math.random() > 0.5 ? 'barrier' : 'train',
        lane: Math.floor(Math.random() * 3),
        position: GAME_HEIGHT,
        width: 60,
        height: Math.random() > 0.5 ? 60 : 100
      }
      
      setObstacles(prev => [...prev, newObstacle])
    }
    
    // Generate coins
    if (Math.random() < COIN_FREQUENCY) {
      const newCoin = {
        id: Date.now() + 1,
        lane: Math.floor(Math.random() * 3),
        position: GAME_HEIGHT,
        value: 1
      }
      
      setCollectibles(prev => [...prev, newCoin])
    }
    
    // Move obstacles
    setObstacles(prev => {
      return prev
        .map(obstacle => ({
          ...obstacle,
          position: obstacle.position - gameSpeed
        }))
        .filter(obstacle => obstacle.position > -100)
    })
    
    // Move coins
    setCollectibles(prev => {
      return prev
        .map(coin => ({
          ...coin,
          position: coin.position - gameSpeed
        }))
        .filter(coin => coin.position > -50)
    })
    
    // Check collisions
    checkCollisions()
  }
  
  // Jump function
  const jump = () => {
    setJumping(true)
    setVerticalVelocity(JUMP_FORCE)
    playSound('jump')
  }
  
  // Check for collisions
  const checkCollisions = () => {
    // Character hitbox
    const characterHitbox = {
      x: lane * LANE_WIDTH + LANE_WIDTH / 2 - 30,
      y: characterY,
      width: 60,
      height: sliding ? 50 : 100
    }
    
    // Check obstacle collisions
    obstacles.forEach(obstacle => {
      const obstacleHitbox = {
        x: obstacle.lane * LANE_WIDTH + LANE_WIDTH / 2 - obstacle.width / 2,
        y: 0,
        width: obstacle.width,
        height: obstacle.height
      }
      
      if (
        characterHitbox.x < obstacleHitbox.x + obstacleHitbox.width &&
        characterHitbox.x + characterHitbox.width > obstacleHitbox.x &&
        characterHitbox.y < obstacleHitbox.height &&
        characterHitbox.y + characterHitbox.height > 0 &&
        obstacle.lane === lane
      ) {
        handleGameOver()
      }
    })
    
    // Check coin collisions
    setCollectibles(prev => {
      const newCollectibles = [...prev]
      let coinsCollected = 0
      
      for (let i = newCollectibles.length - 1; i >= 0; i--) {
        const coin = newCollectibles[i]
        
        if (
          coin.lane === lane &&
          coin.position < 100 && 
          coin.position > 0 &&
          characterY < 150
        ) {
          coinsCollected += coin.value
          newCollectibles.splice(i, 1)
          playSound('coin')
        }
      }
      
      if (coinsCollected > 0) {
        setCoins(prev => prev + coinsCollected)
      }
      
      return newCollectibles
    })
  }
  
  // Handle game over
  const handleGameOver = () => {
    setGameOver(true)
    setGameActive(false)
    updateHighScore(score)
    playSound('crash')
  }
  
  // Restart game
  const restartGame = () => {
    setGameActive(true)
    setGameOver(false)
    setPaused(false)
    setScore(0)
    setCoins(0)
    setGameSpeed(GAME_SPEED_INITIAL)
    setLane(1)
    setJumping(false)
    setSliding(false)
    setCharacterY(0)
    setVerticalVelocity(0)
    setObstacles([])
    setCollectibles([])
    lastTimestamp.current = 0
  }
  
  // Play sound effect
  const playSound = (sound) => {
    if (muted) return
    
    // In a real implementation, you would play actual sound files here
    console.log(`Playing sound: ${sound}`)
  }
  
  // Touch controls for mobile
  const handleTouchStart = (direction) => {
    if (paused || gameOver || !gameActive) return
    
    switch (direction) {
      case 'up':
        if (!jumping) jump()
        break
      case 'down':
        setSliding(true)
        break
      case 'left':
        if (lane > 0) setLane(prev => prev - 1)
        break
      case 'right':
        if (lane < 2) setLane(prev => prev + 1)
        break
      default:
        break
    }
  }
  
  const handleTouchEnd = (direction) => {
    if (direction === 'down') {
      setSliding(false)
    }
  }
  
  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="mb-4 flex justify-between items-center">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="btn bg-surface-200 dark:bg-surface-700 text-surface-700 dark:text-surface-200 flex items-center gap-2"
          onClick={backToMenu}
        >
          <X size={18} />
          Exit Game
        </motion.button>
        
        <div className="flex gap-4 items-center">
          <div className="bg-surface-200 dark:bg-surface-700 px-4 py-2 rounded-lg flex items-center gap-2">
            <span className="text-accent font-bold">🪙</span>
            <span>{coins}</span>
          </div>
          
          <div className="bg-surface-200 dark:bg-surface-700 px-4 py-2 rounded-lg">
            <span className="font-bold">Score: {score}</span>
          </div>
        </div>
        
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="btn bg-surface-200 dark:bg-surface-700 text-surface-700 dark:text-surface-200"
          onClick={() => setPaused(prev => !prev)}
        >
          {paused ? <Play size={18} /> : <Pause size={18} />}
        </motion.button>
      </div>
      
      <div 
        ref={gameContainerRef}
        className="game-container relative w-full h-[500px] rounded-2xl overflow-hidden bg-surface-800 border-4 border-surface-700"
      >
        {/* Game background */}
        <div className="absolute inset-0 bg-gradient-to-b from-surface-700 to-surface-900">
          {/* Tracks */}
          <div className="absolute bottom-0 left-0 w-full h-20 bg-surface-700 flex">
            <div className="w-1/3 h-full border-r-2 border-surface-600 flex justify-center items-center">
              <div className="w-1/2 h-4 bg-surface-500 opacity-70"></div>
            </div>
            <div className="w-1/3 h-full border-r-2 border-surface-600 flex justify-center items-center">
              <div className="w-1/2 h-4 bg-surface-500 opacity-70"></div>
            </div>
            <div className="w-1/3 h-full flex justify-center items-center">
              <div className="w-1/2 h-4 bg-surface-500 opacity-70"></div>
            </div>
          </div>
        </div>
        
        {/* Character */}
        <div 
          className={`character ${sliding ? 'h-[50px]' : 'h-[100px]'} w-[60px] bg-primary rounded-lg`}
          style={{
            left: `${lane * LANE_WIDTH + LANE_WIDTH / 2 - 30}px`,
            bottom: `${characterY + 20}px`,
            transform: sliding ? 'scaleY(0.5)' : 'scaleY(1)'
          }}
        >
          <div className="w-full h-1/3 bg-secondary rounded-t-lg"></div>
          {!sliding && (
            <div className="absolute top-1/4 left-1/2 transform -translate-x-1/2 w-8 h-8 bg-surface-200 rounded-full flex items-center justify-center">
              <div className="w-4 h-4 bg-surface-800 rounded-full"></div>
            </div>
          )}
        </div>
        
        {/* Obstacles */}
        {obstacles.map(obstacle => (
          <div
            key={obstacle.id}
            className={`obstacle w-[${obstacle.width}px] h-[${obstacle.height}px] ${
              obstacle.type === 'barrier' ? 'bg-surface-500' : 'bg-secondary'
            } rounded-md`}
            style={{
              left: `${obstacle.lane * LANE_WIDTH + LANE_WIDTH / 2 - obstacle.width / 2}px`,
              bottom: '20px',
              height: `${obstacle.height}px`,
              width: `${obstacle.width}px`,
              transform: `translateY(-${obstacle.position}px)`
            }}
          >
            {obstacle.type === 'train' && (
              <div className="w-full h-1/4 bg-surface-600 rounded-t-md"></div>
            )}
          </div>
        ))}
        
        {/* Coins */}
        {collectibles.map(coin => (
          <div
            key={coin.id}
            className="coin w-10 h-10 bg-accent rounded-full flex items-center justify-center"
            style={{
              left: `${coin.lane * LANE_WIDTH + LANE_WIDTH / 2 - 20}px`,
              bottom: '70px',
              transform: `translateY(-${coin.position}px)`,
              boxShadow: '0 0 10px #FFE66D'
            }}
          >
            <div className="w-6 h-6 bg-surface-800 bg-opacity-20 rounded-full flex items-center justify-center text-xs font-bold">
              $
            </div>
          </div>
        ))}
        
        {/* Mobile controls */}
        <div className="absolute bottom-4 left-4 right-4 flex justify-between pointer-events-none">
          <div className="flex gap-2">
            <button
              className="w-16 h-16 bg-surface-700 bg-opacity-50 rounded-full flex items-center justify-center pointer-events-auto"
              onTouchStart={() => handleTouchStart('left')}
              onMouseDown={() => handleTouchStart('left')}
            >
              <ArrowLeft size={24} className="text-white" />
            </button>
            <button
              className="w-16 h-16 bg-surface-700 bg-opacity-50 rounded-full flex items-center justify-center pointer-events-auto"
              onTouchStart={() => handleTouchStart('right')}
              onMouseDown={() => handleTouchStart('right')}
            >
              <ArrowRight size={24} className="text-white" />
            </button>
          </div>
          
          <div className="flex gap-2">
            <button
              className="w-16 h-16 bg-surface-700 bg-opacity-50 rounded-full flex items-center justify-center pointer-events-auto"
              onTouchStart={() => handleTouchStart('down')}
              onTouchEnd={() => handleTouchEnd('down')}
              onMouseDown={() => handleTouchStart('down')}
              onMouseUp={() => handleTouchEnd('down')}
            >
              <ArrowDown size={24} className="text-white" />
            </button>
            <button
              className="w-16 h-16 bg-surface-700 bg-opacity-50 rounded-full flex items-center justify-center pointer-events-auto"
              onTouchStart={() => handleTouchStart('up')}
              onMouseDown={() => handleTouchStart('up')}
            >
              <ArrowUp size={24} className="text-white" />
            </button>
          </div>
        </div>
        
        {/* Pause overlay */}
        <AnimatePresence>
          {paused && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black bg-opacity-70 flex flex-col items-center justify-center"
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                className="bg-surface-800 p-6 rounded-xl max-w-xs w-full text-center"
              >
                <h2 className="text-2xl font-bold mb-4">Game Paused</h2>
                <div className="space-y-3">
                  <button 
                    className="btn btn-primary w-full"
                    onClick={() => setPaused(false)}
                  >
                    Resume Game
                  </button>
                  <button 
                    className="btn bg-surface-700 text-white w-full"
                    onClick={restartGame}
                  >
                    Restart
                  </button>
                  <button 
                    className="btn bg-surface-600 text-white w-full"
                    onClick={backToMenu}
                  >
                    Exit to Menu
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Game over overlay */}
        <AnimatePresence>
          {gameOver && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black bg-opacity-70 flex flex-col items-center justify-center"
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-surface-800 p-6 rounded-xl max-w-xs w-full text-center"
              >
                <h2 className="text-2xl font-bold mb-2 text-primary">Game Over!</h2>
                
                <div className="my-6 space-y-3">
                  <div className="bg-surface-700 p-3 rounded-lg">
                    <p className="text-sm text-surface-400">Score</p>
                    <p className="text-2xl font-bold">{score}</p>
                  </div>
                  
                  <div className="bg-surface-700 p-3 rounded-lg">
                    <p className="text-sm text-surface-400">Coins Collected</p>
                    <p className="text-2xl font-bold text-accent">{coins}</p>
                  </div>
                  
                  {score > highScore && (
                    <div className="bg-primary bg-opacity-20 p-3 rounded-lg border border-primary">
                      <p className="text-primary font-bold">New High Score!</p>
                    </div>
                  )}
                </div>
                
                <div className="space-y-3">
                  <button 
                    className="btn btn-primary w-full flex items-center justify-center gap-2"
                    onClick={restartGame}
                  >
                    <RotateCcw size={18} />
                    Play Again
                  </button>
                  
                  <button 
                    className="btn bg-surface-700 text-white w-full"
                    onClick={backToMenu}
                  >
                    Back to Menu
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      <div className="mt-4 text-center text-sm text-surface-500">
        <p>Use arrow keys or WASD to control. Press P or ESC to pause.</p>
      </div>
    </div>
  )
}

export default MainFeature