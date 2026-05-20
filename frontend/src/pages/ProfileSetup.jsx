import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../lib/api.js';
import Stepper from '../components/Stepper.jsx';
import StepPersonalDetails  from '../components/steps/StepPersonalDetails.jsx';
import StepSkills           from '../components/steps/StepSkills.jsx';
import StepAiProfile        from '../components/steps/StepAiProfile.jsx';
import StepCertifications   from '../components/steps/StepCertifications.jsx';

// Slide animation — forward slides left, back slides right
const variants = {
  enter:  (dir) => ({ x: dir > 0 ?  40 : -40, opacity: 0 }),
  center:           ({ x: 0, opacity: 1 }),
  exit:   (dir) => ({ x: dir > 0 ? -40 :  40, opacity: 0 }),
};

export default function ProfileSetup() {
  const { updateProfile } = useAuth();
  const navigate          = useNavigate();

  const [step,      setStep]      = useState(0);
  const [direction, setDirection] = useState(1);   // 1 = forward, -1 = back
  const [completed, setCompleted] = useState([]);
  const [saving,    setSaving]    = useState(false);

  const goForward = useCallback(async (saveData) => {
    setSaving(true);
    try {
      // POC step sends array of { poc_name, … } or empty []
      if (Array.isArray(saveData) && (saveData.length === 0 || saveData[0]?.poc_name !== undefined)) {
        await api.post('/users/me/pocs', { pocs: saveData });
      // Skills step sends array of { name, category, proficiency }
      } else if (Array.isArray(saveData)) {
        await api.post('/users/me/skills', { skills: saveData });
      // Personal details — avatar goes to its own endpoint, rest via PATCH
      } else if (saveData && Object.keys(saveData).length > 0) {
        const { avatar_url, ...rest } = saveData;
        if (avatar_url?.startsWith('data:')) {
          await api.post('/users/me/avatar', { avatar: avatar_url });
        }
        if (Object.keys(rest).length > 0) {
          await api.patch('/users/me', rest);
        }
        await updateProfile({});
      }
    } catch (err) {
      console.error('Step save failed:', err);
    } finally {
      setSaving(false);
    }
    setCompleted(prev => prev.includes(step) ? prev : [...prev, step]);
    setDirection(1);
    setStep(s => s + 1);
  }, [step, updateProfile]);

  const goBack = useCallback(() => {
    setDirection(-1);
    setStep(s => s - 1);
  }, []);

  // Called by the final step — marks profile complete and redirects
  const handleFinish = useCallback(async () => {
    setSaving(true);
    try {
      await api.post('/users/me/complete-profile', {});
      await updateProfile({});
      navigate('/dashboard', { replace: true });
    } catch (err) {
      console.error('Complete profile failed:', err);
      setSaving(false);
    }
  }, [updateProfile, navigate]);

  const steps = [
    <StepPersonalDetails onSave={(data)   => goForward(data)}   saving={saving} />,
    <StepSkills          onSave={(skills) => goForward(skills)} onBack={goBack} saving={saving} />,
    <StepAiProfile       onSave={(pocs)   => goForward(pocs)}   onBack={goBack} saving={saving} />,
    <StepCertifications  onSave={handleFinish}                  onBack={goBack} saving={saving} />,
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="mx-auto max-w-2xl"
    >
      {/* Header row */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Your profile
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Keep this updated — your team and stack power the leadership dashboard.
          </p>
        </div>
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-slate-500
                     hover:bg-slate-100 hover:text-slate-700
                     dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200
                     transition-colors"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          Back to Dashboard
        </button>
      </div>

      <Stepper current={step} completed={completed} />

      <div className="card overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
          >
            {steps[step]}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
