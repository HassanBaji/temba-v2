# The Standing shares as two images, a PDF, a CSV or a link, for every member

**Status:** accepted. Design: "Group standings" (section 02). Follows
[ADR-0091](./0091-the-standing-has-three-views-by-ladder.md).

Groups post their table to the group chat and to stories, print it for the club wall, and keep it
in spreadsheets. They did it with screenshots.

## Decision

- **One way in.** A share button at the end of the Standing views row opens one sheet. It shares
  the lens and view on screen, so there is no export screen and nothing to pick twice. A padel
  Group that is not Verified, which has no views row, still gets the row for the button.
- **Five formats:** a story image (1080 × 1920, the top 8), a square image (1080 × 1080, the top 5),
  the full table as a one-page A4 PDF, the same table as CSV, and a link.
- **Every member gets all five.** The owner chose this over limiting PDF and CSV to Organizers:
  each only shows what every member already sees on the Standing tab.
- **Highlight me is off by default**, so a shared table marks nobody. On, it marks the viewer's
  row on the images and the PDF, and adds it below the top rows when it would be cut.
- **By level shares one category per image** (the viewer's, else the top one). **Most improved
  leads with the top gainer** and lists ranked players only.
- **The content is worked out once**, in `@repo/domain/standing-share`. Each App draws the cards at
  export size and captures them the way the result share does.
- **The PDF is the page as an image inside a PDF.** Both Apps already render a page to an image;
  `@repo/domain/image-pdf` wraps one JPEG in a PDF page. No PDF library on either App, no native
  module on mobile, and Arabic and the house type come out exactly as on screen.
- **The CSV opens safely.** UTF-8 with a byte order mark, so Excel reads Arabic names; plain numbers;
  and a cell that would start a formula is opened with an apostrophe.
- **The link is a web link to Group home** with the lens and view in its query
  (`groups.standingLink`). Group home opens the Standing on them; a member sees it, anyone else the
  usual join notice.
- **On mobile a file goes through the system share sheet**, which is also where Save to Files
  lives, so PDF and CSV keep one button. Images keep Save to Photos.

**Considered Options**: vector PDF from a PDF library (a library on each App and a native module on
mobile, and right-to-left text is its own project); printing through the browser (no file to share,
and nothing on mobile); limiting PDF and CSV to Organizers (declined by the owner); a separate
export screen (the design keeps one door, next to the views).

## Consequences

- Text in the PDF cannot be selected or searched. The CSV carries the same data for that.
- Universal links are Phase 7: until then the link opens the web App, on phones too.
