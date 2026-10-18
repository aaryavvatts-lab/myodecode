import type { Metadata } from "next";
import { A, CONTACT, H2, LegalPage, Note, P, REPO, UL } from "@/components/legal";

export const metadata: Metadata = {
  title: "Privacy policy | MyoDecode",
  description: "What this site does and does not collect about you.",
};

export default function Privacy() {
  return (
    <LegalPage
      title="Privacy policy"
      summary="This site does not ask who you are and does not try to find out. There are no accounts, no sign-up forms, no analytics, no advertising, and no tracking scripts. The short version is that nothing about your visit is collected or shared by me."
    >
      <H2>Who runs this site</H2>
      <P>
        MyoDecode is a personal research project. It is not a company and it does not
        sell anything. The code and the write-up are public at{" "}
        <A href={REPO}>github.com/aaryavvatts-lab/myodecode</A>.
      </P>

      <H2>What I collect</H2>
      <P>
        Nothing. There is no analytics tool on this site. No Google Analytics, no
        Plausible, no Vercel Analytics, no pixels, no fingerprinting. I do not know how
        many people visit, where they come from, or what they click.
      </P>
      <P>
        There are no forms anywhere on the site, so there is no way for you to send me
        personal information even if you wanted to.
      </P>

      <H2>What my host can see</H2>
      <P>
        The site is hosted by Vercel. Like any web host, Vercel handles the network
        request your browser makes and keeps short-term server logs. Those logs can
        include your IP address, the page you asked for, your browser type, and the
        time. This happens for every website you visit and it is needed to serve pages
        and to stop abuse.
      </P>
      <P>
        I do not read these logs, and I have not turned on any Vercel product that
        builds a profile of visitors. Vercel acts as my data processor and handles that
        data under its own policy, which you can read at{" "}
        <A href="https://vercel.com/legal/privacy-policy">vercel.com/legal/privacy-policy</A>.
      </P>

      <H2>Fonts and outside servers</H2>
      <P>
        The site uses one typeface, Erode, under the ITF Free Font License. It is bundled
        when the site is built and served from this domain, so your browser never contacts
        a font host and no one else sees your visit.
      </P>
      <P>
        Everything else the page loads comes from this domain too. That includes the
        signal data, the model files, and the WebAssembly runtime used by the live
        decoder. No content is pulled from a third party while you browse.
      </P>

      <H2>The live decoder runs on your machine</H2>
      <P>
        The decoder demo does its work inside your browser. The muscle signal it reads
        is a recording that ships with the site, and the predictions are computed on
        your own device. Nothing is uploaded and no results are sent anywhere.
      </P>

      <H2>What gets stored in your browser</H2>
      <P>
        One thing, and only if you press the Light or Dark control in the header. It is
        a single browser storage entry that remembers the colours you picked, so the next
        page matches. It holds no identifier and it never leaves your device. The{" "}
        <A href="/cookies">cookie page</A> explains this in more detail and shows you how
        to clear it.
      </P>

      <H2>Data about other people</H2>
      <P>
        This project analyses muscle recordings from eight people. That data arrived
        with no names, no dates of birth, and no contact details. The subjects are
        identified only as numbers one through eight. I have no way to work out who they
        are and I have not tried.
      </P>
      <Note>
        I could not find the paper or the release page this dataset originally came
        from, so I cannot point you at its consent documentation. I have written down
        everything I know and everything I had to infer in{" "}
        <A href={`${REPO}/blob/main/data/PROVENANCE.md`}>data/PROVENANCE.md</A>. If you
        recognise the dataset or hold rights to it, please{" "}
        <A href={CONTACT}>open an issue</A> and I will credit it properly or take it
        down.
      </Note>

      <H2>Children</H2>
      <P>
        The site is a technical write-up with no social features and no data collection,
        so it poses no particular risk to children. I do not knowingly collect
        information from anyone of any age, because I do not collect information at all.
      </P>

      <H2>Your rights</H2>
      <P>
        Laws such as the GDPR and the CCPA give you the right to see what a site holds
        about you, correct it, or have it deleted. In my case the answer to all three is
        the same: I hold nothing about you, so there is nothing to show, correct, or
        delete. If you want to exercise a right against my host, Vercel&apos;s policy
        linked above explains how.
      </P>

      <H2>Changes</H2>
      <P>
        If I ever add something that does collect data, such as an analytics tool, I
        will say so on this page and change the date at the top before turning it on. In
        the meantime the honest answer stays the simple one.
      </P>

      <H2>Contact</H2>
      <P>
        The best way to reach me about anything on this site, including privacy, is to{" "}
        <A href={CONTACT}>open an issue on the repository</A>. It is public, so please do
        not post anything private there.
      </P>
    </LegalPage>
  );
}
