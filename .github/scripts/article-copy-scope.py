"""既存記事の段落と出典だけを変更したか、PRの両ツリーを比較する。"""
from html.parser import HTMLParser
import re
import subprocess
import sys


class Article(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=False)
        self.structure = []
        self.body = False
        self.opaque = []
        self.paragraph = None
        self.plain = False

    def record(self, value):
        if self.paragraph is None:
            self.structure.append(value)
        else:
            self.paragraph.append(value)

    def handle_starttag(self, tag, attrs):
        raw = self.get_starttag_text()
        if tag == "body":
            self.body = True
        if tag == "p" and self.body and not self.opaque and self.paragraph is None and not attrs:
            self.paragraph = [raw]
            self.plain = True
            return
        if self.paragraph is not None:
            simple = tag in ("br", "strong", "em", "cite") and not attrs
            link = dict(attrs)
            reference = (tag == "a" and len(link) == len(attrs)
                         and set(link) <= {"href", "target", "rel", "class"}
                         and link.get("class", "") in ("", "text-sky-500 hover:underline")
                         and (link.get("target", "_self") == "_self" or
                              (link.get("target") == "_blank" and "noopener" in (link.get("rel") or "").split()))
                         and re.fullmatch(r"https://[^\s<>]+", link.get("href") or ""))
            if not simple and not reference:
                self.plain = False
        if tag in ("script", "style", "textarea", "template", "svg", "noscript", "pre"):
            self.opaque.append(tag)
        self.record(raw)

    def handle_endtag(self, tag):
        if tag == "p" and self.paragraph is not None:
            if not self.plain or self.opaque:
                self.structure.extend(self.paragraph + ["</p>"])
            self.paragraph = None
            return
        if self.paragraph is not None and tag not in ("a", "strong", "em", "cite"):
            self.plain = False
        self.record("</" + tag + ">")
        if self.opaque and self.opaque[-1] == tag:
            self.opaque.pop()
        if tag == "body":
            self.body = False

    def handle_data(self, data):
        if data.strip() or self.opaque:
            self.record(data)

    def handle_entityref(self, name):
        self.record("&" + name + ";")

    def handle_charref(self, name):
        self.record("&#" + name + ";")

    def handle_comment(self, data):
        if self.paragraph is not None:
            self.plain = False
        self.record("<!--" + data + "-->")

    def handle_decl(self, declaration):
        self.record("<!" + declaration + ">")

    def handle_pi(self, data):
        self.record("<?" + data + ">")


def structure(revision, name):
    source = subprocess.check_output(["git", "show", revision + ":" + name]).decode("utf-8")
    parser = Article()
    parser.feed(source)
    parser.close()
    if parser.paragraph is not None or parser.opaque or parser.body:
        raise ValueError("記事の構造を確定できません")
    return parser.structure


def main():
    base, head, *files = sys.argv[1:]
    for name in files:
        line = subprocess.check_output(["git", "diff", "--raw", "--no-renames", "-z", base, head, "--", name])
        if not re.fullmatch(rb":100644 100644 [0-9a-f]+ [0-9a-f]+ M\x00[^\x00]+\x00", line):
            return 1
        if structure(base, name) != structure(head, name):
            return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
