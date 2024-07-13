import { assertEquals } from "jsr:@std/assert";

import {
  SaxCDATAEvent,
  SaxCommentEvent,
  SaxDoctypeEvent,
  SaxEmptyEvent,
  SaxEndEvent,
  SaxEofEvent,
  SaxParser,
  SaxStartEvent,
  SaxTextEvent,
} from "./index.ts";

const options = {
  // debug: console.log,
};

Deno.test("blank", () => {
  const parser = new SaxParser("", options);
  const events = Array.from(parser);
  assertEquals(events, [
    new SaxEofEvent(),
  ]);
});

Deno.test("comment", () => {
  const parser = new SaxParser("<!-- -><-- -->", options);
  const events = Array.from(parser);
  assertEquals(events, [
    new SaxCommentEvent(" -><-- ", 0, 14),
    new SaxEofEvent(),
  ]);
});

Deno.test("cdata", () => {
  const parser = new SaxParser("<![CDATA[(><;)]]>", options);
  const events = Array.from(parser);
  assertEquals(events, [
    new SaxCDATAEvent("(><;)", 0, 17),
    new SaxEofEvent(),
  ]);
});

Deno.test("doctype", () => {
  const parser = new SaxParser("<!DOCTYPE html>", options);
  const events = Array.from(parser);
  assertEquals(events, [
    new SaxDoctypeEvent("html", 0, 15),
    new SaxEofEvent(),
  ]);
});

Deno.test("start", () => {
  const parser = new SaxParser(
    `<html double="quote" single='quote' no=quote bool>`,
    options,
  );
  const events = Array.from(parser);
  assertEquals(events, [
    new SaxStartEvent(
      "html",
      {
        double: "quote",
        single: "quote",
        no: "quote",
        bool: null,
      },
      0,
      50,
    ),
    new SaxEofEvent(),
  ]);
});

Deno.test("end", () => {
  const parser = new SaxParser("</html>", options);
  const events = Array.from(parser);
  assertEquals(events, [
    new SaxEndEvent("html", 0, 7),
    new SaxEofEvent(),
  ]);
});

Deno.test("empty", () => {
  const parser = new SaxParser("<br/>", options);
  const events = Array.from(parser);
  assertEquals(events, [
    new SaxEmptyEvent("br", {}, 0, 5),
    new SaxEofEvent(),
  ]);
});

Deno.test("text", () => {
  const parser = new SaxParser("text", options);
  const events = Array.from(parser);
  assertEquals(events, [
    new SaxTextEvent("text", 0, 4),
    new SaxEofEvent(),
  ]);
});

Deno.test("mixed", () => {
  const parser = new SaxParser(
    `<!DOCTYPE html>
<!-- comment -->
<html lang=ja>
  <head>
    <title>title</title>
    <meta charset="utf-8">
  </head>
  <body>
    <p>paragraph</p>
    <br class="pc-only" />
  </body>
</html>`,
    options,
  );
  const events = Array.from(parser);
  assertEquals(events, [
    new SaxDoctypeEvent("html", 0, 15),
    new SaxTextEvent("\n", 15, 16),
    new SaxCommentEvent(" comment ", 16, 32),
    new SaxTextEvent("\n", 32, 33),
    new SaxStartEvent("html", { lang: "ja" }, 33, 47),
    new SaxTextEvent("\n  ", 47, 50),
    new SaxStartEvent("head", {}, 50, 56),
    new SaxTextEvent("\n    ", 56, 61),
    new SaxStartEvent("title", {}, 61, 68),
    new SaxTextEvent("title", 68, 73),
    new SaxEndEvent("title", 73, 81),
    new SaxTextEvent("\n    ", 81, 86),
    new SaxStartEvent("meta", { charset: "utf-8" }, 86, 108),
    new SaxTextEvent("\n  ", 108, 111),
    new SaxEndEvent("head", 111, 118),
    new SaxTextEvent("\n  ", 118, 121),
    new SaxStartEvent("body", {}, 121, 127),
    new SaxTextEvent("\n    ", 127, 132),
    new SaxStartEvent("p", {}, 132, 135),
    new SaxTextEvent("paragraph", 135, 144),
    new SaxEndEvent("p", 144, 148),
    new SaxTextEvent("\n    ", 148, 153),
    new SaxEmptyEvent("br", { class: "pc-only" }, 153, 175),
    new SaxTextEvent("\n  ", 175, 178),
    new SaxEndEvent("body", 178, 185),
    new SaxTextEvent("\n", 185, 186),
    new SaxEndEvent("html", 186, 193),
    new SaxEofEvent(),
  ]);
});
