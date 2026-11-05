import React, { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import LandingPage from './pages/LandingPage';
import AllergyProfile from './pages/AllergyProfile';
import ScanPage from './pages/ScanPage';
import ResultPage from './pages/ResultPage';
import TreatDatabasePage from './pages/TreatDatabasePage';
import Grimoire from './pages/Grimoire';
import Navbar from './components/Navbar';
import SpookyEnvironment from './components/SpookyEnvironment';
import { useAllergyProfile } from './hooks/useAllergyProfile';
import { useHistory } from './hooks/useHistory';
import { checkAllergenMatches, isGibberish } from './utils/allergyMatcher';

const VALID_OUTCOMES = ['MATCH_FOUND', 'NO_MATCH_FOUND_IN_READABLE_TEXT', 'CHECK_MANUALLY'];

function App() {
  const [page, setPage] = useState('landing');
  const profile = useAllergyProfile();
  const reduceMotion = useReducedMotion();
  const { history, addEntry, clearHistory } = useHistory();
  const [scanResult, setScanResult] = useState(null);

  const navigateTo = (newPage) => {
    setPage(newPage);
  };

  const handleScan = async (scanData) => {
    const { text: recognizedText, isFoodPhotoDetected, treatName } = scanData;
    const matches = Array.isArray(scanData.matches)
      ? scanData.matches
      : checkAllergenMatches(recognizedText, profile.selectedAllergens);
    const isNoise = Boolean(isFoodPhotoDetected) || isGibberish(recognizedText);
    const wordCount = (recognizedText || '').trim().split(/\s+/).filter(Boolean).length;
    const incomplete = !recognizedText || recognizedText.trim().length < 8 || wordCount < 3;

    let status = VALID_OUTCOMES.includes(scanData.status) ? scanData.status : 'NO_MATCH_FOUND_IN_READABLE_TEXT';
    if (matches.length > 0) status = 'MATCH_FOUND';
    else if (isNoise || incomplete) status = 'CHECK_MANUALLY';

    const result = {
      status,
      text: recognizedText || '',
      matches,
      isFoodPhotoDetected: isNoise,
      treatName: treatName || (isNoise ? 'Unlabeled Snack / Food Platter' : 'Scanned Wrapper')
    };

    addEntry(result);

    setScanResult(result);
    setPage('result');
  };

  const handleSelectTreat = (treat) => {
    const conflictingAllergens = treat.allergens.filter(a =>
      profile.selectedAllergens.includes(a)
    );
    const status = !profile.selectedAllergens.length
      ? 'CHECK_MANUALLY'
      : conflictingAllergens.length > 0 ? 'MATCH_FOUND' : 'NO_MATCH_FOUND_IN_READABLE_TEXT';

    const result = {
      status,
      text: treat.ingredients.join(', '),
      matches: conflictingAllergens,
      isFoodPhotoDetected: false,
      treatName: treat.name,
      treatData: treat
    };

    addEntry(result);
    setScanResult(result);
    setPage('result');
  };

  const pageContent = (
    <>
      {page === 'landing' && (
        <LandingPage
          key="landing"
          onGetStarted={() => navigateTo('profile')}
          onOpenScan={() => navigateTo('scan')}
          onOpenDatabase={() => navigateTo('database')}
          onSelectTreat={handleSelectTreat}
        />
      )}

      {page === 'scan' && (
        <ScanPage
          key="scan"
          profile={profile}
          onScan={handleScan}
          onEditProfile={() => navigateTo('profile')}
          onOpenDatabase={() => navigateTo('database')}
        />
      )}

      {page === 'database' && (
        <TreatDatabasePage
          key="database"
          profile={profile}
          onSelectTreat={handleSelectTreat}
          onBack={() => navigateTo('landing')}
        />
      )}

      {page === 'profile' && (
        <AllergyProfile
          key="profile"
          profile={profile}
          onContinue={() => navigateTo('scan')}
        />
      )}

      {page === 'result' && scanResult && (
        <ResultPage
          key="result"
          result={scanResult}
          onReset={() => navigateTo('scan')}
          onEditProfile={() => navigateTo('profile')}
          onOpenDatabase={() => navigateTo('database')}
          onSelectTreat={handleSelectTreat}
        />
      )}

      {page === 'grimoire' && (
        <Grimoire
          key="grimoire"
          history={history}
          onBack={() => navigateTo('landing')}
          onClear={clearHistory}
        />
      )}
    </>
  );

  return (
    <SpookyEnvironment>
      <Navbar
        currentPage={page}
        onNavigate={navigateTo}
        profile={profile}
      />

      <main className="main-content" id="main-content">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={page}
            className="page-transition"
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
            transition={{ duration: reduceMotion ? 0 : 0.2, ease: 'easeOut' }}
          >
            {pageContent}
          </motion.div>
        </AnimatePresence>
      </main>
    </SpookyEnvironment>
  );
}

export default App;
