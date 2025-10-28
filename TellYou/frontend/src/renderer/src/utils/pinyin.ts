import { pinyin } from "pinyin-pro";

class PinYinUtil {
  public POLYPHONE_HEADS: Array<{ re: RegExp; initial: string }> = [
    { re: /^(重庆)/, initial: "C" }, // Chongqing
    { re: /^(重阳)/, initial: "C" }, // Chongyang
    { re: /^(长沙)/, initial: "C" }, // Changsha（示例）
    { re: /^(单于)/, initial: "C" }, // Chanyu
    { re: /^(曾)/, initial: "Z" }, // Zeng
    { re: /^(区)/, initial: "O" }, // Ou
    { re: /^(解)/, initial: "X" }, // Xie
    { re: /^(仇)/, initial: "Q" }, // Qiu
    { re: /^(任)/, initial: "R" }, // Ren
    { re: /^(褚)/, initial: "C" }, // Chu
    { re: /^(覃)/, initial: "Q" }, // Qin（如需 Tan 可自行调整）
    { re: /^(尉迟)/, initial: "Y" }, // Yuchi
  ];
  public collator = new Intl.Collator("zh-Hans-u-co-pinyin", {
    sensitivity: "base",
    numeric: true,
  });
  public LETTERS = Array.from({ length: 26 }, (_, i) =>
    String.fromCharCode(65 + i),
  );
  public getInitial(name?: string): string {
    const n = (name || "").trim();
    if (!n) return "#";
    for (const { re, initial } of this.POLYPHONE_HEADS) {
      if (re.test(n)) return initial;
    }
    const ch = n[0];

    if (/[A-Za-z]/.test(ch)) return ch.toUpperCase();

    if (/[\u4e00-\u9fff]/.test(ch)) {
      const first = pinyin(ch, { pattern: "first", toneType: "none" });
      const initial = (first?.[0] || "").toUpperCase();
      return /[A-Z]/.test(initial) ? initial : "#";
    }
    return "#";
  }
}

const pinyinUtil = new PinYinUtil();
export default pinyinUtil;
