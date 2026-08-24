import type { Metadata } from "next";
import { A, CONTACT, H2, LegalPage, Note, P, REPO, UL } from "@/components/legal";

export const metadata: Metadata = {
  title: "Terms of use | MyoDecode",
  description: "The rules for using this site, its code, and its results.",
};

export default function Terms() {
  return (
    <LegalPage
      title="Terms of use"
      summary="This is a student research project shared for free. You can read it, quote it, and reuse the code. It comes with no warranty, it is not medical advice, and you use it at your own risk."
    >
      <H2>What this site is</H2>
      <P>
        MyoDecode is a write-up of a personal research project about reading hand
        gestures from muscle signals. It is educational. It is not a product, not a
        service, and not a medical device.
      </P>

      <H2>Accepting these terms</H2>
      <P>
        By using the site you agree to what is written here. If you do not agree, please
        stop using it. These terms cover the pages on this domain, the code in the
        repository, and the results files the site loads.
      </P>

      <H2>This is not medical advice</H2>
      <Note>
        Nothing here is medical, clinical, or professional advice. Do not use this
        project to diagnose anyone, to treat anyone, or to make decisions about a
        prosthetic limb, an assistive device, or any other piece of equipment a person
        depends on. Talk to a qualified clinician or engineer instead.
      </Note>
      <P>
        The numbers on this site come from eight people in one recording session. They
        say very little about how a real device would behave on a real user over months.
        I say so plainly in the methods section, and I mean it.
      </P>

      <H2>No warranty</H2>
      <P>
        The site, the code, and the results are provided as they are. I do not promise
        that they are correct, complete, or fit for anything in particular. I do not
        promise the site will stay online or keep working. To the extent the law allows,
        all warranties are disclaimed, whether stated or implied.
      </P>

      <H2>Limits on liability</H2>
      <P>
        To the extent the law allows, I am not liable for any loss or damage that
        follows from using this site or the code, including lost work, lost data, or any
        indirect or knock-on losses. Some places do not allow limits like this, in which
        case the limit applies as far as it legally can.
      </P>

      <H2>Using the code</H2>
      <P>
        The code in the repository is released under the MIT licence, which is included
        in full at{" "}
        <A href={`${REPO}/blob/main/LICENSE`}>LICENSE</A>. In plain terms you can use it,
        change it, and build on it, including commercially, as long as you keep the
        copyright notice. The licence text is what counts if the two ever disagree.
      </P>

      <H2>Using the results and figures</H2>
      <P>
        The text, charts, and figures on this site are released under{" "}
        <A href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</A>. You can
        reuse them, including in a paper or a class, if you credit MyoDecode and link
        back here. If you quote a number, please quote the caveats that go with it. A
        leave-one-subject-out result reported as if it were a normal accuracy is exactly
        the problem this project is about.
      </P>

      <H2>The dataset is not mine to license</H2>
      <P>
        The muscle recordings analysed here came to me as plain text files with no
        paper, no licence, and no release page, and I could not track down where they
        were published. I am including them so the work can be checked, and I make no
        ownership claim over them. Everything I know and everything I had to infer is
        written down in{" "}
        <A href={`${REPO}/blob/main/data/PROVENANCE.md`}>data/PROVENANCE.md</A>.
      </P>
      <P>
        If you are the author or rights holder, please{" "}
        <A href={CONTACT}>open an issue</A>. I will add proper credit or remove the files,
        whichever you prefer.
      </P>

      <H2>Fair use of the site</H2>
      <UL>
        <li>Do not try to break, overload, or gain access to parts of the site that are not public.</li>
        <li>Do not scrape the site in a way that degrades it for other people.</li>
        <li>Do not present the work as your own, and do not imply that I endorse what you build with it.</li>
      </UL>

      <H2>Links to other sites</H2>
      <P>
        Some pages link out to places like Vercel, GitHub, and Creative Commons. I do
        not control those sites and I am not responsible for what they contain or what
        they do with your visit.
      </P>

      <H2>Changes</H2>
      <P>
        I may update these terms as the project changes. The date at the top of the page
        shows when they last changed. Carrying on using the site after a change means
        you accept the new version.
      </P>

      <H2>Governing law</H2>
      <P>
        These terms are governed by the laws of the State of Minnesota in the United
        States, without regard to conflict of law rules. If part of these terms turns out
        to be unenforceable, the rest still applies.
      </P>

      <H2>Contact</H2>
      <P>
        Questions about these terms go in{" "}
        <A href={CONTACT}>an issue on the repository</A>.
      </P>
    </LegalPage>
  );
}
