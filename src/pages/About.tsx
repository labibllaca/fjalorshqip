const EmailLink = () => <a href="mailto:contact@shqip.dev">email</a>;
const DiscordLink = () => (
  <a href="https://shqip.dev/discord" target="_blank" rel="noopener noreferrer">
    Discord
  </a>
);
const GitHubLink = () => (
  <a href="https://github.com/shqip-dev/fjalorshqip.com" target="_blank" rel="noopener noreferrer">
    GitHub
  </a>
);
const WebArchiveLink = () => (
  <a
    href="https://web.archive.org/web/20210614061957/http://fjalorshqip.com/"
    target="_blank"
    rel="noopener noreferrer"
  >
    WebArchive
  </a>
);
const CloudFlareLink = () => (
  <a href="https://pages.cloudflare.com/" target="_blank" rel="noopener noreferrer">
    CloudFlare Pages
  </a>
);

const About = () => {
  return (
    <div>
      <h1>Rreth FjalorShqip</h1>

      <h2>Pse ekziston ky projekt</h2>
      <p>
        Si përdorues i faqes fjalorshqip.com (<WebArchiveLink />
        ) e cila pushoi së punuari, vendosa ta rindërtoj pas skadimit të domain-it. Synimi është që kjo faqe të
        jetë një burim i hapur (`open source`) dhe të ofrojë më shumë veçori për përdoruesit.
      </p>

      <h2>Gjendja aktuale</h2>
      <p>
        Faqja aktualisht ofron kërkimin për definicione të fjalëve (me kufizime për fjalët me tre ose më shumë
        shkronja) dhe shërbehet përmes <CloudFlareLink />. Mënyra e kërkimit nuk është e avancuar, por
        përdoruesit mund të gjejnë përputhje të sakta të fjalëve.
      </p>

      <h2>Synimet</h2>
      <p>
        Plani është përmirësimi i metodës së kërkimit, pasurimi i fjalorit dhe zhvillimi i veçorive të tjera për
        ta bërë faqen më të dobishme dhe të çasshme për përdoruesit.
      </p>

      <h2>Open Source</h2>
      <p>
        Ky projekt është me krenari `open source`, dhe kodi mund të gjendet në <GitHubLink />. Një licencë MIT
        do të bashkëngjitet për përdorim dhe ndryshim të lirë.
      </p>

      <h2>Kontribuoni</h2>
      <p>
        Për përmirësime, përkthime apo raportime të problemeve, mund të kontaktoni në contact@shqip.dev ose të
        hapni `Issues` dhe `PR` në <GitHubLink />.
      </p>

      <h2>Kontakt</h2>
      <p>
        <EmailLink />, <DiscordLink />
      </p>
    </div>
  );
};

export default About;
