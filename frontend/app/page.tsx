'use client';

import { useRef, useState } from 'react';
import {
  analyzeMessageStream,
  type AgentEvent,
  type ConversationMessage,
  type CategoryResult,
  type UrgencyResult,
  type RoutingResult,
} from '@/lib/api';
import { useAnalysis } from '@/lib/AnalysisContext';
import InputPanel from '@/components/InputPanel/InputPanel';
import ResultPanel from '@/components/ResultPanel/ResultPanel';
import AgentProgress, {
  type AgentStatus,
} from '@/components/AgentProgress/AgentProgress';
import ConversationPanel from '@/components/ConversationPanel/ConversationPanel';
import LiveResults from '@/components/LiveResults/LiveResults';
import styles from './page.module.css';

interface PartialResults {
  category?: CategoryResult;
  urgency?: UrgencyResult;
  routing?: RoutingResult;
}

const INITIAL_STATUSES: AgentStatus[] = [
  { id: 'CategoryAgent', label: 'Luokittelu', status: 'waiting' },
  {
    id: 'UrgencyRoutingGroup',
    label: 'Kiireellisyys & Reititys',
    status: 'waiting',
    parallel: true,
  },
  { id: 'DraftAgent', label: 'Vastausluonnos', status: 'waiting' },
  { id: 'ReviewAgent', label: 'Tarkistus', status: 'waiting' },
];

function agentToGroup(agent: string): string {
  if (agent === 'UrgencyAgent' || agent === 'RoutingAgent')
    return 'UrgencyRoutingGroup';
  return agent;
}

export default function HomePage() {
  const {
    result,
    loading,
    error,
    message,
    subject,
    setResult,
    setLoading,
    setError,
    setMessage,
    setSubject,
  } = useAnalysis();
  const [agentStatuses, setAgentStatuses] =
    useState<AgentStatus[]>(INITIAL_STATUSES);
  const [liveConversation, setLiveConversation] = useState<
    ConversationMessage[]
  >([]);
  const [partialResults, setPartialResults] = useState<PartialResults>({});
  const parallelGroupDone = useRef(0);

  // Tallennetaan analysoidun viestin tiedot tulosta varten
  const submittedMessage = useRef('');
  const submittedSubject = useRef('');

  const handleClear = () => {
    setMessage('');
    setSubject('');
    setResult(null);
    setError(null);
    setAgentStatuses(INITIAL_STATUSES);
    setLiveConversation([]);
    setPartialResults({});
  };

  const handleSubmit = async (msg: string, subj: string) => {
    submittedMessage.current = msg;
    submittedSubject.current = subj;

    setLoading(true);
    setError(null);
    setResult(null);
    setLiveConversation([]);
    setPartialResults({});
    parallelGroupDone.current = 0;
    setAgentStatuses(INITIAL_STATUSES);

    try {
      const data = await analyzeMessageStream(
        msg,
        subj || undefined,
        (event: AgentEvent) => {
          const groupId = event.agent ? agentToGroup(event.agent) : '';

          if (
            event.type === 'conversation_message' &&
            event.agent &&
            event.content !== undefined &&
            event.turn !== undefined
          ) {
            setLiveConversation((prev) => [
              ...prev,
              {
                agent: event.agent!,
                content: event.content!,
                turn: event.turn!,
                approved: event.approved ?? null,
                feedback: event.feedback ?? null,
              },
            ]);
          } else if (event.type === 'agent_start') {
            setAgentStatuses((prev) =>
              prev.map((s) =>
                s.id === groupId ? { ...s, status: 'running' } : s,
              ),
            );
          } else if (event.type === 'agent_done') {
            if (event.agent_result) {
              if (event.agent === 'CategoryAgent')
                setPartialResults((p) => ({
                  ...p,
                  category: event.agent_result as unknown as CategoryResult,
                }));
              else if (event.agent === 'UrgencyAgent')
                setPartialResults((p) => ({
                  ...p,
                  urgency: event.agent_result as unknown as UrgencyResult,
                }));
              else if (event.agent === 'RoutingAgent')
                setPartialResults((p) => ({
                  ...p,
                  routing: event.agent_result as unknown as RoutingResult,
                }));
            }
            if (groupId === 'UrgencyRoutingGroup') {
              parallelGroupDone.current++;
              if (parallelGroupDone.current >= 2) {
                setAgentStatuses((prev) =>
                  prev.map((s) =>
                    s.id === 'UrgencyRoutingGroup'
                      ? { ...s, status: 'done', duration_ms: event.duration_ms }
                      : s,
                  ),
                );
              }
            } else {
              setAgentStatuses((prev) =>
                prev.map((s) =>
                  s.id === groupId
                    ? { ...s, status: 'done', duration_ms: event.duration_ms }
                    : s,
                ),
              );
            }
          }
        },
      );
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tuntematon virhe');
    } finally {
      setLoading(false);
    }
  };

  const phase = loading ? 'loading' : result ? 'result' : 'input';
  const runningAgent = agentStatuses.find((s) => s.status === 'running');

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Viestien analyysi</h1>
        <p className={styles.subtitle}>
          Syötä sähköpostiviesti kiinteistöyhtiölle — tekoälypipeline
          luokittelee sen, arvioi kiireellisyyden, ohjaa oikealle tiimille ja
          kirjoittaa vastausluonnoksen.
        </p>
      </div>

      <div className={styles.sandboxBanner}>
        <span className={styles.sandboxIcon}>ℹ</span>
        <span>
          <strong>Demotila</strong> — Tämä on testisovelluksen interaktiivinen
          esittely. Normaalissa käyttöympäristössä viestit käsitellään
          automaattisesti suoraan postilaatikosta ilman manuaalista syöttöä.
        </span>
      </div>

      {error && (
        <div className={styles.errorBanner}>
          Virhe: {error}
          <button className={styles.errorRetry} onClick={handleClear}>
            Yritä uudelleen
          </button>
        </div>
      )}

      {phase === 'input' && (
        <div className={styles.inputView}>
          <InputPanel
            onSubmit={handleSubmit}
            onClear={handleClear}
            loading={false}
          />
        </div>
      )}

      {phase === 'loading' && (
        <div className={styles.loadingView}>
          <AgentProgress statuses={agentStatuses} />
          <LiveResults
            category={partialResults.category}
            urgency={partialResults.urgency}
            routing={partialResults.routing}
          />
          <ConversationPanel messages={liveConversation} isLive />
        </div>
      )}

      {phase === 'loading' && (
        <div className={styles.stickyBar}>
          <span className={styles.stickySpinner} />
          <span className={styles.stickyText}>Analyysi käynnissä</span>
          {runningAgent && (
            <>
              <span className={styles.stickySep}>·</span>
              <span className={styles.stickyAgent}>{runningAgent.label}</span>
            </>
          )}
        </div>
      )}

      {phase === 'result' && (
        <div className={styles.resultView}>
          <button
            className={styles.newAnalysisBtn}
            onClick={handleClear}
            type="button"
          >
            ← Analysoi uusi viesti
          </button>
          <ResultPanel
            result={result}
            originalMessage={submittedMessage.current}
            originalSubject={submittedSubject.current}
            conversation={result?.conversation ?? []}
          />
        </div>
      )}
    </div>
  );
}
