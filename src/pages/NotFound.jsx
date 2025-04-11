import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Home, ArrowLeft } from 'lucide-react'

const NotFound = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full"
      >
        <div className="mb-8">
          <h1 className="text-6xl font-bold text-primary mb-2">404</h1>
          <div className="h-2 w-24 bg-accent mx-auto rounded-full mb-6"></div>
          <h2 className="text-2xl font-bold mb-4">Page Not Found</h2>
          <p className="text-surface-600 dark:text-surface-400 mb-8">
            Oops! Looks like you've run off the tracks. The page you're looking for doesn't exist or has been moved.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="btn btn-primary flex items-center justify-center gap-2"
              >
                <Home size={18} />
                Back to Home
              </motion.button>
            </Link>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="btn bg-surface-200 dark:bg-surface-700 text-surface-700 dark:text-surface-200 flex items-center justify-center gap-2"
              onClick={() => window.history.back()}
            >
              <ArrowLeft size={18} />
              Go Back
            </motion.button>
          </div>
        </div>
        
        <div className="relative h-40 overflow-hidden rounded-xl bg-surface-200 dark:bg-surface-700">
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-8 h-16 bg-primary rounded-t-lg"></div>
          <div className="absolute bottom-0 left-0 w-full h-8 bg-surface-300 dark:bg-surface-600"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-4xl">
            🚇
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default NotFound