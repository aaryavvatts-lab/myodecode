import type { Metadata } from "next";
import { A, CONTACT, H2, LegalPage, Note, P, UL } from "@/components/legal";

export const metadata: Metadata = {
  title: "Cookies | MyoDecode",
  description: "This site sets no cookies. Here is what it does store and why.",
};

export default function Cookies() {
  return (
    <LegalPage
      title="Cookies"
      summary="This site sets no cookies at all. It stores one small item in your browser, and only if you dismiss the notice at the bottom of the screen. Nothing is used to track you."
    >
      <H2>The short answer</H2>
      <P>
        A cookie is a small file a site asks your browser to keep and send back on every
        later request. Sites use them for logins, shopping carts, and tracking. This site
        does none of those things, so it sets no cookies.
      </P>

      <H2>What is stored, exactly</H2>
      <P>
        One entry in local storage, which is a separate browser feature from cookies. It
        is never sent to a server. It looks like this:
      </P>
      <div className="scroll-x mt-4 rounded-lg border">
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr style={{ background: "var(--surface-2)" }}>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Value</th>
              <th className="px-3 py-2 font-medium">Why</th>
              <th className="px-3 py-2 font-medium">How long</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t">
              <td className="whitespace-nowrap px-3 py-2 font-[family-name:var(--font-mono)] text-[12px]">
                myodecode-notice
              </td>
              <td className="whitespace-nowrap px-3 py-2 font-[family-name:var(--font-mono)] text-[12px]">
                dismissed
              </td>
              <td className="px-3 py-2">
                Remembers that you closed the notice bar so it does not reappear.
              </td>
              <td className="whitespace-nowrap px-3 py-2">Until you clear it</td>
            </tr>
          </tbody>
        </table>
      </div>
      <P>
        That is the entire list. It holds no identifier, no visit count, and no history.
        If you never dismiss the notice, nothing is stored at all.
      </P>

      <Note>
        Because the site sets nothing that tracks you, there is no consent to ask for and
        no &ldquo;reject all&rdquo; button that would do anything. A banner demanding
        consent for storage that does not exist would be theatre. The notice bar is there
        to tell you the situation, not to collect a decision.
      </Note>

      <H2>What this site does not use</H2>
      <UL>
        <li>No analytics of any kind, including Vercel Analytics.</li>
        <li>No advertising or advertising identifiers.</li>
        <li>No social media buttons or embedded players.</li>
        <li>No session cookies, because there are no accounts or sessions.</li>
        <li>No third party scripts. Every file the page loads comes from this domain.</li>
      </UL>

      <H2>What your browser caches</H2>
      <P>
        Your browser will cache ordinary files such as the page itself, the fonts, the
        signal recordings, and the model used by the live decoder. That is normal browser
        caching, not tracking, and clearing your browsing data removes it.
      </P>
      <P>
        The live decoder loads a WebAssembly runtime that is a few megabytes. Your
        browser caches it so a second visit does not download it again. It is a plain
        file served from this domain and it reports nothing back.
      </P>

      <H2>How to clear what is stored</H2>
      <P>
        Clearing site data for this domain in your browser settings removes the one entry
        described above along with the cache. In Chrome and Edge this is under Settings,
        Privacy and security, Third party cookies, See all site data. In Firefox and
        Safari it sits under the privacy section of the settings. Private or incognito
        windows discard everything when you close them.
      </P>

      <H2>Server logs</H2>
      <P>
        My host keeps short-term request logs, which is separate from anything stored in
        your browser. The <A href="/privacy">privacy page</A> covers what that means.
      </P>

      <H2>Contact</H2>
      <P>
        If you find something on this site storing more than what is listed here, that is
        a bug and I want to know. Please{" "}
        <A href={CONTACT}>open an issue</A>.
      </P>
    </LegalPage>
  );
}
