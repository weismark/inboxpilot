import Link from 'next/link';
import styles from './page.module.css';

export default function HowItWorksPage() {
  return (
    <div className={styles.page}>
      <Link href="/" className={styles.backLink}>
        ← Takaisin analyysiin
      </Link>

      <div className={styles.hero}>
        <h1 className={styles.title}>Toimintamalli</h1>
        <p className={styles.intro}>
          InboxPilot on rakennettu osoittamaan{' '}
          <strong>Microsoft Agent Frameworkin</strong> käytännön soveltamista.
          Jokainen analyysivaihe on oma itsenäinen agenttinsa, jotka framework
          koordinoi yhtenäiseksi pipelineksi. Mallina on käytössä OpenAI:n{' '}
          <strong>gpt-5-nano</strong>, joka on kustannustehokas valinta
          toistuviin strukturoituihin tehtäviin etenkin demoissa.
        </p>
      </div>

      {/* ── Arkkitehtuurikaavio ─────────────────────────────────────── */}
      <section>
        <h2 className={styles.sectionTitle}>Arkkitehtuuri</h2>
        <div className={styles.arch}>
          {/* Frontend */}
          <div className={`${styles.archLayer} ${styles.layerFrontend}`}>
            <span className={styles.layerLabel}>Frontend</span>
            <div className={styles.layerRow}>
              <div className={styles.archChip}>Next.js 15</div>
              <div className={styles.archChip}>React Context</div>
              <div className={styles.archChip}>SSE-lukija</div>
            </div>
          </div>

          <div className={styles.archArrow}>
            <div className={styles.arrowLine} />
            <div className={styles.arrowLabel}>
              POST /inboxpilot/api/analyze/stream
            </div>
            <div className={styles.arrowPulse} />
          </div>

          {/* FastAPI */}
          <div className={`${styles.archLayer} ${styles.layerApi}`}>
            <span className={styles.layerLabel}>FastAPI</span>
            <div className={styles.layerRow}>
              <div className={styles.archChip}>StreamingResponse</div>
              <div className={styles.archChip}>Pydantic v2</div>
              <div className={styles.archChip}>slowapi</div>
            </div>
          </div>

          <div className={styles.archArrow}>
            <div className={styles.arrowLine} />
            <div className={styles.arrowLabel}>
              Orchestrator koordinoi pipelinen
            </div>
            <div className={styles.arrowPulse} />
          </div>

          {/* Knowledge — uusi kerros */}
          <div className={`${styles.archLayer} ${styles.layerKnowledge}`}>
            <span className={styles.layerLabel}>Knowledge Base</span>
            <div className={styles.layerRow}>
              <div className={styles.archChip}>category_agent.md</div>
              <div className={styles.archChip}>draft_agent.md</div>
              <div className={styles.archChip}>review_agent.md</div>
              <div className={styles.archChip}>+ 2 muuta</div>
            </div>
          </div>

          <div className={styles.archArrow}>
            <div className={styles.arrowLine} />
            <div className={styles.arrowLabel}>
              load_knowledge() — ladataan käynnistyksessä
            </div>
            <div className={styles.arrowPulse} />
          </div>

          {/* Agent Framework — pääosio */}
          <div className={`${styles.archLayer} ${styles.layerFramework}`}>
            <span className={`${styles.layerLabel} ${styles.labelFramework}`}>
              Microsoft Agent Framework
            </span>
            <div className={styles.frameworkInner}>
              <div className={styles.frameworkBlock}>
                <div className={styles.fbTitle}>OpenAIChatClient</div>
                <div className={styles.fbDesc}>model_id, api_key</div>
              </div>
              <div className={styles.frameworkArrow}>→</div>
              <div className={styles.frameworkBlock}>
                <div className={styles.fbTitle}>Agent</div>
                <div className={styles.fbDesc}>name, instructions</div>
              </div>
              <div className={styles.frameworkArrow}>→</div>
              <div className={styles.frameworkBlock}>
                <div className={styles.fbTitle}>agent.run()</div>
                <div className={styles.fbDesc}>prompt + options</div>
              </div>
            </div>
            <div className={styles.optionsRow}>
              <div className={styles.optionChip}>temperature: 0.1 / 0.4</div>
              <div className={styles.optionChip}>
                response_format: json_object
              </div>
              <div className={styles.optionChip}>max_tokens per agentti</div>
            </div>
          </div>

          <div className={styles.archArrow}>
            <div className={styles.arrowLine} />
            <div className={styles.arrowLabel}>HTTPS — OpenAI API</div>
            <div className={styles.arrowPulse} />
          </div>

          {/* LLM */}
          <div className={`${styles.archLayer} ${styles.layerLlm}`}>
            <span className={styles.layerLabel}>OpenAI</span>
            <div className={styles.layerRow}>
              <div className={`${styles.archChip} ${styles.chipModel}`}>
                gpt-5-nano
              </div>
              <div className={styles.archChip}>JSON mode</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Microsoft Agent Framework ───────────────────────────────── */}
      <section>
        <h2 className={styles.sectionTitle}>
          Microsoft Agent Framework käytännössä
        </h2>
        <p className={styles.sectionDesc}>
          Framework tarjoaa yhtenäisen rajapinnan LLM-agenteille. Kehittäjä
          määrittelee agentin kerran — framework hoitaa yhteyden malliin,
          optioiden välityksen ja vastauksen palautuksen. Tässä sovelluksessa
          jokainen analyysivaihe on oma agenttinsa, joka rakennetaan{' '}
          <code className={styles.code}>build_agent()</code>-funktiolla.
        </p>

        <div className={styles.codeBlock}>
          <div className={styles.codeHeader}>
            <span className={styles.codeLang}>Python · agents/base.py</span>
          </div>
          <pre className={styles.codePre}>{`from agent_framework import Agent
from agent_framework.openai import OpenAIChatClient, OpenAIChatOptions

def build_agent(name: str, instructions: str) -> Agent:
    client = OpenAIChatClient(
        model_id=os.environ.get("OPENAI_MODEL", "gpt-5-nano"),
        api_key=os.environ["OPENAI_API_KEY"],
    )
    return client.as_agent(name=name, instructions=instructions)

# Kaksi erillistä options-profiilia eri tehtäville
_ANALYSIS_OPTIONS = OpenAIChatOptions(
    temperature=0.1,          # deterministinen — luokittelu, reititys
    response_format={"type": "json_object"},
)
_CREATIVE_OPTIONS = OpenAIChatOptions(
    temperature=0.4,          # luovempi — tekstin kirjoitus
    response_format={"type": "json_object"},
)

async def run_agent(agent, prompt, *, creative=False, max_tokens=None) -> str:
    opts = _CREATIVE_OPTIONS if creative else _ANALYSIS_OPTIONS
    # max_tokens annetaan kwarg-argumenttina — EI options-objektissa
    response = await agent.run(prompt, **opts, max_tokens=tokens)
    return response.text or "{}"`}</pre>
        </div>

        <div className={styles.fwCards}>
          <div className={styles.fwCard}>
            <div className={styles.fwCardTitle}>Modulaarisuus</div>
            <p className={styles.fwCardDesc}>
              Jokainen agentti on itsenäinen Python-moduuli omalla
              system-promptillaan. Frameworkin ansiosta LLM-yhteyden toteutus on
              erotettu bisneslogiikasta.
            </p>
          </div>
          <div className={styles.fwCard}>
            <div className={styles.fwCardTitle}>
              JSON-moodilla strukturoitu output
            </div>
            <p className={styles.fwCardDesc}>
              <code className={styles.code}>response_format: json_object</code>{' '}
              pakottaa mallin vastaamaan validina JSON:ina. Pydantic-validointi
              varmistaa skeeman ennen orkestrointia.
            </p>
          </div>
          <div className={styles.fwCard}>
            <div className={styles.fwCardTitle}>Rinnakkaisajo</div>
            <p className={styles.fwCardDesc}>
              UrgencyAgent ja RoutingAgent ajetaan{' '}
              <code className={styles.code}>asyncio.gather</code>:lla — molemmat
              odottavat vastaustaan samanaikaisesti, mikä puolittaa odotusajan
              tässä vaiheessa.
            </p>
          </div>
          <div className={styles.fwCard}>
            <div className={styles.fwCardTitle}>SSE-streaming</div>
            <p className={styles.fwCardDesc}>
              Orchestrator välittää SSE-tapahtumat agentti kerrallaan. Frontend
              saa reaaliaikaiset tilapäivitykset ilman jatkuvaa kyselyä
              (polling) tai WebSocket-yhteyttä.
            </p>
          </div>
          <div className={styles.fwCard}>
            <div className={styles.fwCardTitle}>
              Konfiguroitava knowledge base
            </div>
            <p className={styles.fwCardDesc}>
              Jokaisen agentin domain-logiikka on erillisessä{' '}
              <code className={styles.code}>.md</code>-tiedostossa kansiossa{' '}
              <code className={styles.code}>knowledge/</code>. Asiakaskohtaiset
              ohjeet ja säännöt päivitetään muuttamatta yhtään koodiriviä —
              tiedostot ladataan käynnistyksessä{' '}
              <code className={styles.code}>load_knowledge()</code>-funktiolla
              ja injektoidaan agentin system-promptiin.
            </p>
          </div>
        </div>
      </section>

      {/* ── Agenttipipeline ─────────────────────────────────────────── */}
      <section>
        <h2 className={styles.sectionTitle}>Agenttipipeline</h2>

        <div className={styles.pipeline}>
          <div className={styles.step}>
            <div className={styles.stepBadge}>1</div>
            <div className={styles.stepContent}>
              <h3 className={styles.stepTitle}>CategoryAgent</h3>
              <p className={styles.stepDesc}>
                Luokittelee viestin tyypin (vikailmoitus / tiedustelu /
                tiedonanto / reklamaatio / muu) ja tunnistaa käytetyn kielen.
                Luokittelusäännöt ladataan{' '}
                <code className={styles.code}>knowledge/category_agent.md</code>
                -tiedostosta.
              </p>
              <div className={styles.stepMeta}>
                <span className={styles.metaChip}>max_tokens 300</span>
                <span className={styles.metaChip}>temperature 0.1</span>
              </div>
            </div>
          </div>

          <div className={styles.pipelineArrow} />

          <div className={styles.parallelGroup}>
            <div className={styles.parallelBadge}>
              asyncio.gather — rinnakkain
            </div>
            <div className={styles.parallelSteps}>
              <div className={styles.step}>
                <div className={styles.stepBadge}>2a</div>
                <div className={styles.stepContent}>
                  <h3 className={styles.stepTitle}>UrgencyAgent</h3>
                  <p className={styles.stepDesc}>
                    Arvioi kiireellisyyden ja pisteyttää 0–10. Ehdottaa
                    vasteajan.
                  </p>
                  <div className={styles.stepMeta}>
                    <span className={styles.metaChip}>max_tokens 400</span>
                  </div>
                </div>
              </div>
              <div className={styles.step}>
                <div className={styles.stepBadge}>2b</div>
                <div className={styles.stepContent}>
                  <h3 className={styles.stepTitle}>RoutingAgent</h3>
                  <p className={styles.stepDesc}>
                    Ohjaa oikealle tiimille ja arvioi eskalaatiotarpeen.
                  </p>
                  <div className={styles.stepMeta}>
                    <span className={styles.metaChip}>max_tokens 300</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.pipelineArrow} />

          <div className={styles.step}>
            <div className={styles.stepBadge}>3</div>
            <div className={styles.stepContent}>
              <h3 className={styles.stepTitle}>DraftAgent</h3>
              <p className={styles.stepDesc}>
                Kirjoittaa vastausluonnoksen kategoria, kiireellisyys ja tiimi
                kontekstina. Käyttää creative-moodia (temperature 0.4)
                luontevamman tekstin saamiseksi.
              </p>
              <div className={styles.stepMeta}>
                <span className={styles.metaChip}>max_tokens 800</span>
                <span className={`${styles.metaChip} ${styles.chipCreative}`}>
                  temperature 0.4
                </span>
              </div>
            </div>
          </div>

          <div className={styles.pipelineArrow} />

          <div className={styles.step}>
            <div className={styles.stepBadge}>4</div>
            <div className={styles.stepContent}>
              <h3 className={styles.stepTitle}>ReviewAgent</h3>
              <p className={styles.stepDesc}>
                Tarkistaa luonnoksen: ei lupaa liikoja, kielioppi oikein, sävy
                sopiva. Palauttaa tarkistetun version sekä listan muutoksista ja
                varoituksista.
              </p>
              <div className={styles.stepMeta}>
                <span className={styles.metaChip}>max_tokens 600</span>
                <span className={styles.metaChip}>temperature 0.1</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Tekninen pino ───────────────────────────────────────────── */}
      <section>
        <h2 className={styles.sectionTitle}>Teknologiavalinnat</h2>
        <div className={styles.stackGrid}>
          <div className={styles.stackCard}>
            <div className={styles.stackCardTitle}>Backend</div>
            <ul className={styles.stackList}>
              <li>
                <strong>Python 3.12</strong> + FastAPI
              </li>
              <li>
                <strong>Microsoft Agent Framework</strong>{' '}
                (agent-framework-core)
              </li>
              <li>Pydantic v2 — skeemavalidointi</li>
              <li>slowapi — rate limiting (5 req/min)</li>
              <li>SSE StreamingResponse — reaaliaikainen tilapäivitys</li>
              <li>asyncio.gather — rinnakkaisajo</li>
              <li>
                <strong>knowledge/*.md</strong> — agenttikohtaiset
                konfiguraatiotiedostot
              </li>
            </ul>
          </div>
          <div className={styles.stackCard}>
            <div className={styles.stackCardTitle}>Frontend</div>
            <ul className={styles.stackList}>
              <li>
                <strong>Next.js 15</strong> (App Router, Turbopack)
              </li>
              <li>TypeScript + CSS Modules</li>
              <li>React Context — tiedot säilyvät navigoidessa</li>
              <li>Fetch Streams API — SSE-virran lukeminen</li>
            </ul>
          </div>
          <div className={styles.stackCard}>
            <div className={styles.stackCardTitle}>Tietoturva</div>
            <ul className={styles.stackList}>
              <li>
                CORS — <code className={styles.code}>ALLOWED_ORIGINS</code>{' '}
                env:stä
              </li>
              <li>Input-validointi — 10–10 000 merkkiä</li>
              <li>Security headers (X-Frame-Options, CSP)</li>
              <li>Startup-validointi — API-avain vaaditaan</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
