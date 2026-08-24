import type { Metadata } from "next";
import { A, CONTACT, H2, LegalPage, Note, P, UL } from "@/components/legal";

export const metadata: Metadata = {
  title: "Accessibility | MyoDecode",
  description: "How this site is built to be usable, and where it still falls short.",
};

export default function Accessibility() {
  return (
    <LegalPage
      title="Accessibility"
      summary="I aim for WCAG 2.1 level AA. Some of it is done and checked, some of it is not there yet. This page says which is which instead of claiming the site is finished."
    >
      <H2>What I have done</H2>

      <H2>Colour</H2>
      <P>
        Every colour used to tell one thing from another was checked with a script, not
        by eye. The four gesture colours were picked by testing all six pairs for how
        they separate under the three common types of colour blindness, in both light and
        dark mode, and only a set that passed every check was used. Body text sits at or
        above the 4.5 to 1 contrast ratio that level AA asks for.
      </P>
      <P>
        Colour is never the only way something is labelled. Charts carry a legend, the
        scatter plot uses a different marker shape for each gesture as well as a
        different colour, and every chart has a plain data table you can open underneath
        it.
      </P>

      <H2>Keyboard</H2>
      <P>
        You can reach every control with the Tab key, including the buttons, the toggles,
        and the sliders. Focused elements get a visible outline. Nothing traps focus, and
        there are no pop-ups that take over the page.
      </P>

      <H2>Motion</H2>
      <P>
        The scrolling signal at the top of the page and the live decoder both animate. If
        your system is set to reduce motion, the animation stops and you get a still
        picture instead. The decoder only ever moves after you press start.
      </P>

      <H2>Structure and screen readers</H2>
      <UL>
        <li>Headings run in order so you can jump through the page by heading.</li>
        <li>Sections are marked up as sections with real headings rather than styled text.</li>
        <li>Toggle buttons report whether they are pressed.</li>
        <li>Charts drawn as images carry a text description, and the underlying numbers are in the data tables.</li>
        <li>Text resizes normally to 200 percent without content being cut off.</li>
      </UL>

      <H2>Small screens</H2>
      <P>
        The layout works down to a 320 pixel wide screen. Wide things such as the heatmap
        and the tables scroll sideways inside their own box, so the page itself never
        scrolls sideways.
      </P>

      <Note>
        Both colour schemes are built on purpose. Dark mode is not the light palette
        flipped. Each colour was re-picked for the dark background and checked again.
      </Note>

      <H2>Where it still falls short</H2>
      <P>
        These are real gaps, listed so you know before you hit them.
      </P>
      <UL>
        <li>
          The charts are drawn as SVG and you cannot Tab through the individual points.
          Hover gives you a tooltip with a mouse, but keyboard and screen reader users
          need the data table underneath instead. A proper keyboard chart cursor is on my
          list.
        </li>
        <li>
          The live decoder updates its numbers many times a second. It is not announced
          to screen readers, because doing so would flood them. The result summary is
          static text you can read after pausing.
        </li>
        <li>
          The heatmap relies on colour depth for its reading, softened by printing the
          number inside every cell and offering the table view.
        </li>
        <li>
          I have tested with VoiceOver on macOS and with keyboard only. I have not tested
          with JAWS or NVDA on Windows.
        </li>
        <li>
          There is no formal third party audit. The claims here come from my own testing.
        </li>
      </UL>

      <H2>How it was checked</H2>
      <UL>
        <li>A colour contrast and colour blindness script, run over the palette as a set.</li>
        <li>Keyboard only navigation through every page.</li>
        <li>Browser zoom to 200 percent and a 320 pixel wide viewport.</li>
        <li>Light mode, dark mode, and the system default.</li>
        <li>The reduce motion setting turned on.</li>
      </UL>

      <H2>If something does not work for you</H2>
      <P>
        Please tell me. Accessibility bugs are bugs, and I would rather hear about one
        than have someone quietly give up on the page. The best route is{" "}
        <A href={CONTACT}>an issue on the repository</A>. It helps if you say which page,
        what you were trying to do, and what browser or assistive tool you use.
      </P>
      <P>
        If you cannot get at something on this site, the same numbers are in the results
        files and the figures in the repository, and I am happy to send them another way.
      </P>
    </LegalPage>
  );
}
