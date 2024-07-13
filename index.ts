function readUntil(
  source: string,
  cursor: number,
  token: string,
): number {
  const index = source.slice(cursor).indexOf(token);
  if (index < 0) return source.length;
  return index + cursor;
}
/**
 * @see https://www.w3.org/TR/xml/#sec-common-syn
 */
function isWhitespace(char: string): boolean {
  return char === " " || char === "\t" || char === "\n" || char === "\r";
}
type SaxEventMap = {
  comment: SaxCommentEvent;
  cdata: SaxCDATAEvent;
  doctype: SaxDoctypeEvent;
  error: SaxErrorEvent;
  start: SaxStartEvent;
  end: SaxEndEvent;
  empty: SaxEmptyEvent;
  processinginstruction: SaxProcessingInstructionEvent;
  text: SaxTextEvent;
  eof: SaxEofEvent;
};
export type SaxEvent<T extends keyof SaxEventMap> = SaxEventMap[T];
type EventListener<T extends keyof SaxEventMap> = (
  evt: SaxEventMap[T],
) => void | Promise<void>;
type EventListenerObject<T extends keyof SaxEventMap> = {
  handleEvent: EventListener<T>;
};

export class SaxCommentEvent extends Event {
  readonly type = "comment";
  constructor(public data: string, public start: number, public end: number) {
    super("comment");
  }
}
export class SaxCDATAEvent extends Event {
  readonly type = "cdata";
  constructor(public data: string, public start: number, public end: number) {
    super("cdata");
  }
}
export class SaxDoctypeEvent extends Event {
  readonly type = "doctype";
  constructor(public data: string, public start: number, public end: number) {
    super("doctype");
  }
}
export class SaxErrorEvent extends Event {
  readonly type = "error";
  constructor(public message: string) {
    super("error");
  }
}
type Attributes = Record<string, string | null>;
export class SaxStartEvent extends Event {
  readonly type = "start";
  constructor(
    public node: string,
    public attributes: Attributes,
    public start: number,
    public end: number,
  ) {
    super("start");
  }
}
export class SaxEndEvent extends Event {
  readonly type = "end";
  constructor(public node: string, public start: number, public end: number) {
    super("end");
  }
}
export class SaxEmptyEvent extends Event {
  readonly type = "empty";
  constructor(
    public node: string,
    public attributes: Attributes,
    public start: number,
    public end: number,
  ) {
    super("empty");
  }
}
export class SaxProcessingInstructionEvent extends Event {
  readonly type = "processinginstruction";
  constructor(
    public data: string,
    public start: number,
    public end: number,
  ) {
    super("processinginstruction");
  }
}
export class SaxTextEvent extends Event {
  readonly type = "text";
  constructor(public data: string, public start: number, public end: number) {
    super("text");
  }
}
export class SaxEofEvent extends Event {
  readonly type = "eof";
  constructor() {
    super("eof");
  }
}

export type SaxParserOptions = {
  strict?: boolean;
  debug?: (message: string) => void;
};

export class SaxParser extends EventTarget
  implements Iterable<SaxEvent<keyof SaxEventMap>> {
  constructor(private xml: string, private options: SaxParserOptions = {}) {
    super();
  }

  *[Symbol.iterator]() {
    this.debug("start parsing");

    let cursor = 0;
    while (cursor < this.xml.length) {
      const start = cursor;
      const char = this.xml[cursor];
      if (char === "<") {
        cursor += 1;
        const next = this.xml[cursor];
        if (next === "!") {
          if (
            this.xml[cursor + 1] === "-" && this.xml[cursor + 2] === "-"
          ) {
            this.debug("found <!--");
            cursor = readUntil(this.xml, cursor, "-->") + 3;
            yield new SaxCommentEvent(
              this.xml.slice(start + 4, cursor - 3),
              start,
              cursor,
            );
            continue;
          } else if (
            this.xml[cursor + 1] === "[" &&
            this.xml[cursor + 2] === "C" &&
            this.xml[cursor + 3] === "D" &&
            this.xml[cursor + 4] === "A" &&
            this.xml[cursor + 5] === "T" &&
            this.xml[cursor + 6] === "A" &&
            this.xml[cursor + 7] === "["
          ) {
            this.debug("found <![CDATA[");
            cursor = readUntil(this.xml, cursor, "]]>") + 3;
            yield new SaxCDATAEvent(
              this.xml.slice(start + 9, cursor - 3),
              start,
              cursor,
            );
            continue;
          } else if (
            this.xml[cursor + 1] === "D" &&
            this.xml[cursor + 2] === "O" &&
            this.xml[cursor + 3] === "C" &&
            this.xml[cursor + 4] === "T" &&
            this.xml[cursor + 5] === "Y" &&
            this.xml[cursor + 6] === "P" &&
            this.xml[cursor + 7] === "E" &&
            isWhitespace(this.xml[cursor + 8])
          ) {
            this.debug("found <!DOCTYPE");
            cursor = readUntil(this.xml, cursor, ">") + 1;
            yield new SaxDoctypeEvent(
              this.xml.slice(start + 10, cursor - 1),
              start,
              cursor,
            );
            continue;
          } else {
            const lt = readUntil(this.xml, cursor, "<");
            const gt = readUntil(this.xml, cursor, ">") + 1;
            cursor = Math.min(lt, gt);
            yield new SaxErrorEvent("Invalid XML");
            continue;
          }
        } else if (next === "/") {
          this.debug("found </");
          cursor += 1;
          const end = readUntil(this.xml, cursor, ">") + 1;
          yield new SaxEndEvent(
            this.xml.slice(cursor, end - 1),
            start,
            end,
          );
          cursor = end;
          continue;
        } else if (next === "?") {
          if (
            this.xml[cursor + 1].toLowerCase() === "x" &&
            this.xml[cursor + 2].toLowerCase() === "m" &&
            this.xml[cursor + 3].toLowerCase() === "l" &&
            isWhitespace(this.xml[cursor + 4])
          ) {
            this.debug("found <?xml");
            cursor = readUntil(this.xml, cursor, "?>") + 2;
            yield new SaxProcessingInstructionEvent(
              this.xml.slice(start + 5, cursor - 2),
              start,
              cursor,
            );
            continue;
          } else {
            const lt = readUntil(this.xml, cursor, "<");
            const gt = readUntil(this.xml, cursor, ">") + 1;
            cursor = Math.min(lt, gt);
            yield new SaxErrorEvent("Invalid XML");
            continue;
          }
        } else {
          this.debug("found <");
          let nodeName = "";
          while (cursor < this.xml.length) {
            if (this.xml[cursor] === ">") {
              break;
            }
            if (this.xml[cursor] === "/" && this.xml[cursor + 1] === ">") {
              break;
            }
            if (isWhitespace(this.xml[cursor])) {
              cursor += 1;
              break;
            }
            nodeName += this.xml[cursor++];
          }
          const attributes: Attributes = {};
          attr: while (cursor < this.xml.length) {
            if (this.xml[cursor] === ">") {
              cursor += 1;
              yield new SaxStartEvent(nodeName, attributes, start, cursor);
              break;
            }
            if (this.xml[cursor] === "/" && this.xml[cursor + 1] === ">") {
              cursor += 2;
              yield new SaxEmptyEvent(nodeName, attributes, start, cursor);
              break;
            }
            if (isWhitespace(this.xml[cursor])) {
              cursor += 1;
              continue;
            }
            let key = "";
            this.debug("found attribute");
            while (cursor < this.xml.length) {
              if (this.xml[cursor] === "=") {
                break;
              }
              if (this.xml[cursor] === ">") {
                break;
              }
              if (this.xml[cursor] === "/" && this.xml[cursor] === ">") {
                break;
              }
              if (isWhitespace(this.xml[cursor])) {
                break;
              }
              key += this.xml[cursor++];
            }
            while (cursor < this.xml.length) {
              if (isWhitespace(this.xml[cursor])) cursor += 1;
              else if (this.xml[cursor] === "=") {
                cursor += 1;
                break;
              } else {
                if (key !== "") attributes[key] = null;
                continue attr;
              }
            }
            let quote = "";
            while (cursor < this.xml.length) {
              if (isWhitespace(this.xml[cursor])) {
                cursor += 1;
                continue;
              } else if (this.xml[cursor] === '"' || this.xml[cursor] === "'") {
                quote = this.xml[cursor++];
              }
              break;
            }
            let value = "";
            this.debug(`found key: ${key}`);
            while (cursor < this.xml.length) {
              if (
                quote === "" && (isWhitespace(this.xml[cursor]) ||
                  this.xml[cursor] === ">" ||
                  (this.xml[cursor] === "/" && this.xml[cursor + 1] === ">"))
              ) {
                if (key !== "") attributes[key] = value;
                continue attr;
              } else if (this.xml[cursor] === quote) {
                cursor += 1;
                if (this.xml[cursor - 1] === "\\") {
                  value = value.slice(0, -1);
                } else {
                  attributes[key] = value;
                  continue attr;
                }
              }
              value += this.xml[cursor++];
            }
            this.debug(`found value: ${value}`);
          }
        }
      } else {
        this.debug("found text");
        cursor = readUntil(this.xml, cursor, "<");
        yield new SaxTextEvent(this.xml.slice(start, cursor), start, cursor);
      }
    }
    this.debug("end parsing");
    yield new SaxEofEvent();
    return;
  }

  private parsing = false;
  parse() {
    if (this.parsing) {
      throw new Error("Currently parsing");
    }
    this.parsing = true;
    for (const event of this) {
      this.dispatchEvent(event);
    }
    this.parsing = false;
  }

  addEventListener<T extends keyof SaxEventMap>(
    type: T,
    listener:
      | EventListener<T>
      | EventListenerObject<T>
      | null,
    options?: boolean | AddEventListenerOptions | undefined,
  ): void {
    super.addEventListener(
      type,
      listener as EventListenerOrEventListenerObject | null,
      options,
    );
  }

  private debug(message: string) {
    this.options.debug?.(message);
  }
}
