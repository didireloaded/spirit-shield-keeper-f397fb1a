import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, MapPin, Users, Bell, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface OnboardingProps {
  onComplete: () => void;
}

const slides = [
  {
    icon: Shield,
    title: 'Your Safety, Our Priority',
    description: 'SafeGuard provides real-time protection with instant emergency alerts and location sharing.',
    color: 'from-red-500 to-orange-500',
  },
  {
    icon: MapPin,
    title: 'Real-Time Location',
    description: 'Share your location with trusted contacts and see incidents happening near you on the live map.',
    color: 'from-blue-500 to-purple-500',
  },
  {
    icon: Users,
    title: 'Community Watch',
    description: 'Connect with your community. Report incidents and help keep your neighborhood safe.',
    color: 'from-green-500 to-teal-500',
  },
  {
    icon: Bell,
    title: 'Instant Alerts',
    description: 'Get notified immediately about nearby emergencies and safety updates in your area.',
    color: 'from-yellow-500 to-red-500',
  },
];

export const Onboarding = ({ onComplete }: OnboardingProps) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      onComplete();
    }
  };

  const skip = () => {
    onComplete();
  };

  const slide = slides[currentSlide];
  const Icon = slide.icon;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Skip Button */}
      <div className="flex justify-end p-6">
        <button
          onClick={skip}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          Skip
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="text-center"
          >
            {/* Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className={`w-32 h-32 rounded-full bg-gradient-to-br ${slide.color} flex items-center justify-center mx-auto mb-8`}
            >
              <Icon className="w-16 h-16 text-white" />
            </motion.div>

            {/* Title */}
            <h1 className="text-3xl font-bold mb-4">{slide.title}</h1>

            {/* Description */}
            <p className="text-muted-foreground text-lg max-w-xs mx-auto">
              {slide.description}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Progress & Button */}
      <div className="p-8">
        {/* Progress Dots */}
        <div className="flex justify-center gap-2 mb-8">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentSlide
                  ? 'w-8 bg-primary'
                  : 'bg-muted-foreground/30'
              }`}
            />
          ))}
        </div>

        {/* Next Button */}
        <Button
          onClick={nextSlide}
          className="w-full h-14 text-lg rounded-full"
        >
          {currentSlide === slides.length - 1 ? 'Get Started' : 'Next'}
          <ChevronRight className="w-5 h-5 ml-2" />
        </Button>
      </div>
    </div>
  );
};
