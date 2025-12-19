/**
 * SignOutTransition - Loading overlay during sign out
 * 
 * Shows a smooth transition animation when the user signs out
 * to prevent the jarring static screen experience.
 */

'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';

interface SignOutTransitionProps {
  isVisible: boolean;
}

export function SignOutTransition({ isVisible }: SignOutTransitionProps) {
  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950"
    >
      {/* Animated Logo */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 20 }}
        className="flex flex-col items-center"
      >
        <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl overflow-hidden shadow-2xl mb-6">
          <Image src="/logo.png" alt="Logo" width={80} height={80} className="w-full h-full object-cover" />
        </div>
        
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center"
        >
          <h2 className="text-xl md:text-2xl font-bold text-white mb-1">Signing out...</h2>
          <p className="text-sm text-slate-400">See you next time!</p>
        </motion.div>

        {/* Loading spinner */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-8"
        >
          <div className="w-8 h-8 border-2 border-slate-600 border-t-blue-500 rounded-full animate-spin" />
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
