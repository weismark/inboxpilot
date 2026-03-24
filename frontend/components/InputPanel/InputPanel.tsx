'use client';

import { useEffect, useState } from 'react';
import { fetchSamples, type SampleMessage } from '@/lib/api';
import { useAnalysis } from '@/lib/AnalysisContext';
import styles from './InputPanel.module.css';

interface InputPanelProps {
  onSubmit: (message: string, subject: string) => void;
  onClear: () => void;
  loading: boolean;
}

export default function InputPanel({
  onSubmit,
  onClear,
  loading,
}: InputPanelProps) {
  const { message, subject, setMessage, setSubject } = useAnalysis();
  const [samples, setSamples] = useState<SampleMessage[]>([]);
  const [samplesOpen, setSamplesOpen] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    fetchSamples()
      .then(setSamples)
      .catch(() => {
        /* esimerkkiviestit eivät ole kriittisiä */
      });
  }, []);

  const handleSubmit = () => {
    if (!message.trim() || message.trim().length < 10) {
      setValidationError('Viesti on liian lyhyt (vähintään 10 merkkiä).');
      return;
    }
    setValidationError(null);
    onSubmit(message.trim(), subject.trim());
  };

  const handleClear = () => {
    setValidationError(null);
    onClear();
  };

  const loadSample = (sample: SampleMessage) => {
    setMessage(sample.message);
    setSubject(sample.subject);
    setValidationError(null);
    setSamplesOpen(false);
  };

  const hasContent = message.trim().length > 0 || subject.trim().length > 0;

  return (
    <div className={styles.panel}>
      {samples.length > 0 && (
        <div className={styles.samples}>
          <button
            className={styles.samplesToggle}
            onClick={() => setSamplesOpen((o) => !o)}
            type="button"
            aria-expanded={samplesOpen}
          >
            <span className={styles.samplesLabel}>Esimerkkiviestejä</span>{' '}
            <span
              className={`${styles.samplesChevron} ${samplesOpen ? styles.samplesChevronOpen : ''}`}
            >
              ▾
            </span>
          </button>
          {samplesOpen && (
            <div className={styles.samplesContent}>
              {samples.map((s) => (
                <button
                  key={s.id}
                  className={styles.sampleBtn}
                  onClick={() => loadSample(s)}
                  type="button"
                >
                  <div className={styles.sampleBtnBody}>
                    <div className={styles.sampleTitle}>{s.title}</div>
                    <div className={styles.samplePreview}>{s.preview}</div>
                  </div>
                  <span className={styles.sampleAction}>Lataa&nbsp;→</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className={styles.field}>
        <label className={styles.label} htmlFor="subject">
          Aihe (valinnainen)
        </label>
        <input
          id="subject"
          className={styles.input}
          type="text"
          placeholder="Esim. Vuotava hana huoneisto 14B"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          disabled={loading}
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="message">
          Viesti
        </label>
        <textarea
          id="message"
          className={`${styles.input} ${styles.textarea}`}
          placeholder="Liitä tai kirjoita sähköpostiviesti tähän..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          disabled={loading}
        />
      </div>

      {validationError && <div className={styles.error}>{validationError}</div>}

      <div className={styles.actions}>
        <button
          className={styles.submitBtn}
          onClick={handleSubmit}
          disabled={loading || !message.trim()}
          type="button"
        >
          {loading ? 'Analysoidaan...' : 'Analysoi viesti'}
        </button>
        {hasContent && !loading && (
          <button
            className={styles.clearBtn}
            onClick={handleClear}
            type="button"
          >
            Tyhjennä
          </button>
        )}
      </div>
    </div>
  );
}
