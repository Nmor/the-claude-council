// Size budget: 12 KB. Check: wc -c; gate: token-budget.mjs --check.
// Which files a Bash command would WRITE, for one-plan-gate.js.
//
// Judged on what it RUNS, not what it mentions (lib/command-scan.js). A heredoc body goes by
// the command it feeds: a shell runs it (scanned as shell); an interpreter runs it as a script,
// where a path is written only as the TARGET of a write call; anything else (`cat > f`,
// `git commit -F -`) carries data, so naming a plan there is no write.
// Returns [{ path, removes, unknown }], textual; the caller canonicalises. `unknown` is a file
// whose name cannot be known (glob, `{}`, `dir/.` copied into a dir), reported as `<dir>/*.md`.
// Not seen (one-plan-per-workspace.md): variable paths, archive extractors, writing editors.
"use strict";
const fs = require("fs");
const path = require("path");

const SHELL = /^(?:bash|sh|zsh|ksh|dash)$/;
const INTERP = /^(?:python[\d.]*|node|nodejs|perl|ruby|deno|bun)$/;
// Words after which the NEXT word is the command.
const PREFIX = new Set(
  "{ ! if then do else elif while until time nohup command exec builtin".split(
    " ",
  ),
);
// Wrappers, with those of their flags that take a value.
const WRAPPER = {
  env: ["-u", "-C", "-S"],
  sudo: ["-u", "-g", "-C"],
  xargs: ["-I", "-L", "-n", "-P", "-s", "-E", "-d", "-a"],
};
const OUT_FLAG = {
  curl: ["-o", "--output"],
  wget: ["-O", "--output-document"],
};

// A shell word: `$(...)`, an unquoted run, an escaped char, or a quoted string. `(` and `)`
// end a word, so `(echo x > f)` targets `f`, not `f)`.
const WORD =
  /(?:\$\([^()]*\)|[^\s"'\\<>;|&()]|\\.|"(?:[^"\\]|\\.)*"|'[^']*')+/g;
const WORD_AT = new RegExp(WORD.source, "y");
const REDIRECT = /(^|[^<>&\d])(?:\d|&)?(?:>\||>>?|<>)\s*/g;
// Named groups: each capture says what it is; no positional capture goes unused.
const HEREDOC =
  /^(?<head>.*?)<<-?\s*(?<quote>['"]?)(?<tag>[A-Za-z_]\w*)\k<quote>(?<body>[\s\S]*?)^\k<tag>\s*$/gm;
const QUOTED =
  /\\(?<escaped>.)|"(?<double>(?:[^"\\]|\\.)*)"|'(?<single>[^']*)'/g;
const unquote = (w) =>
  w.replace(QUOTED, (...captures) => {
    const { escaped, double, single } = captures.at(-1);
    if (escaped !== undefined) return escaped;
    if (double !== undefined) return double.replace(/\\(.)/g, "$1");
    return single;
  });
const wordsOf = (s) => (s.match(WORD) || []).map(unquote);

/** An absolute path, or null for what cannot be known without running the shell. */
function expand(p, cwd, home) {
  if (p === undefined) return null;
  const s = String(p).replace(/^(?:~|\$HOME|\$\{HOME\})(?=\/|$)/, home);
  if (/[$`*?[{]/.test(s) || (cwd === null && !path.isAbsolute(s))) return null;
  return path.resolve(cwd, s);
}

/** Split on ; newline | || & && outside quotes; `piped` marks a segment fed by a single `|`. */
function segments(s) {
  const out = [];
  let cur = "";
  let q = "";
  let piped = false;
  const cut = (next) => {
    out.push({ text: cur, piped });
    cur = "";
    piped = next;
  };
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) {
      cur += c;
      if (c === "\\" && q === '"') cur += s[++i] || "";
      else if (c === q) q = "";
    } else if (c === "\\") cur += c + (s[++i] || "");
    else if (c === '"' || c === "'") {
      q = c;
      cur += c;
    } else if (c === ";" || c === "\n") cut(false);
    else if (c === "|" && s[i - 1] !== ">") {
      const or = s[i + 1] === "|";
      if (or) i++;
      cut(!or);
    } else if (
      c === "&" &&
      s[i - 1] !== ">" &&
      s[i - 1] !== "<" &&
      s[i + 1] !== ">"
    ) {
      if (s[i + 1] === "&") i++;
      cut(false);
    } else cur += c;
  }
  cut(false);
  return out;
}

/** The command a word list runs, past assignments, keywords and wrappers like env and xargs. */
function commandOf(words) {
  let xargs = false;
  for (let i = 0; i < words.length;) {
    const w = words[i];
    if (/^\w+=/.test(w) || PREFIX.has(w)) i++;
    else if (WRAPPER[w]) {
      xargs = xargs || w === "xargs";
      for (
        i++;
        i < words.length &&
        (words[i].startsWith("-") || (w === "env" && /^\w+=/.test(words[i])));
        i++
      )
        if (WRAPPER[w].includes(words[i])) i++;
    } else return { name: path.basename(w), args: words.slice(i + 1), xargs };
  }
  return { name: "", args: [], xargs };
}

/** Positional operands, skipping flags and the values of flags that take one. */
function operands(args, withValue) {
  const pos = [];
  let target = null;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--") {
      pos.push(...args.slice(i + 1));
      break;
    }
    if (a === "-t" || a === "--target-directory") target = args[++i];
    else if (a.startsWith("--target-directory=")) target = a.slice(19);
    else if (withValue.includes(a)) i++;
    else if (!a.startsWith("-") || a === "-") pos.push(a);
  }
  return { pos, target };
}

/** Every `.claude/plans/<name>.md` token, found linearly (a regex scan here was quadratic). */
const STOPS = new Set([..." \t\r\n'\"`;()<>|&"].map((c) => c.charCodeAt(0)));
function planMentions(text) {
  const out = [];
  const low = text.toLowerCase();
  const N = ".claude/plans/";
  for (let i = low.indexOf(N), from; i !== -1; i = low.indexOf(N, from)) {
    let s = i;
    let e = i + N.length;
    while (s > 0 && i - s < 1024 && !STOPS.has(text.charCodeAt(s - 1))) s--;
    while (
      e < text.length &&
      e - i < 1024 &&
      !STOPS.has(text.charCodeAt(e)) &&
      text[e] !== "/"
    )
      e++;
    from = e;
    const raw = text.slice(s, e);
    if (text[e] !== "/" && /\.(?:md|markdown)$/i.test(raw))
      out.push({ s, e, raw });
  }
  return out;
}

// A script writes a path it passes to a write call, not one it merely names.
const Q = "['\"`]";
const re = (s) => new RegExp(s);
const FIRST_ARG = re(
  `(?:writeFileSync|appendFileSync|createWriteStream|writeFile|appendFile|writeTextFile|File\\.write|Bun\\.write|FileUtils\\.touch)\\s*\\(\\s*${Q}$`,
);
const OPEN = re(`\\b(?:open|openSync)\\s*\\(\\s*${Q}$`);
const WRITE_MODE = re(`^${Q}\\s*,\\s*(?:mode\\s*=\\s*)?${Q}[rbt+]*[wax]`);
const PERL_OPEN = re(
  `\\bopen\\s*\\(?\\s*[^,()'"]+,\\s*(?:${Q}\\+?>>?${Q}\\s*,\\s*${Q}|${Q}\\+?>>?\\s*)$`,
);
const SECOND_ARG = re(
  `(?:copyFileSync|copyFile|cpSync|renameSync|symlinkSync|linkSync|\\b(?:fs|os|File|promises)\\.rename|os\\.replace|shutil\\.(?:copy\\w*|move)|FileUtils\\.(?:cp|mv|copy|move))\\s*\\(\\s*[^,]*,\\s*${Q}$`,
);
const METHOD = re(`\\)\\s*\\.\\s*(?:rename|replace)\\s*\\(\\s*${Q}$`);
const PATHLIB = re(`\\bPath\\s*\\(\\s*${Q}$`);
const PATHLIB_WRITE = re(
  `^${Q}\\s*\\)\\s*\\.\\s*(?:write_text|write_bytes|touch|open\\s*\\(\\s*(?:mode\\s*=\\s*)?${Q}[rbt+]*[wax])`,
);
const END_ARG = re(`^${Q}\\s*[,)]`);
const END_CALL = re(`^${Q}\\s*\\)`);

function scriptWrites(src) {
  return planMentions(src)
    .filter(({ s, e }) => {
      const pre = src.slice(Math.max(0, s - 200), s);
      const post = src.slice(e, e + 80);
      return (
        FIRST_ARG.test(pre) ||
        PERL_OPEN.test(pre) ||
        (OPEN.test(pre) && WRITE_MODE.test(post)) ||
        (SECOND_ARG.test(pre) && END_ARG.test(post)) ||
        (METHOD.test(pre) && END_CALL.test(post)) ||
        (PATHLIB.test(pre) && PATHLIB_WRITE.test(post))
      );
    })
    .map((m) => m.raw);
}

// A copy source that may be a plan of unknown name: `dir/`, `dir/.`, a glob or `{}` (not *.json).
const opaque = (s) =>
  /(?:^|\/)\.?$/.test(s) ||
  (/[*?[{]/.test(path.basename(s)) && !/\.(?!md$|markdown$)\w+$/i.test(s));
const isDir = (p) => {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false; // absent: the operand names the file itself
  }
};

/** Every path `cmd` would write, from `cwd`. */
function bashWrites(cmd, cwd0, home, depth = 0) {
  const out = [];
  let cwd = cwd0;
  const push = (abs, removes = [], unknown = false) =>
    out.push({ path: abs, removes, unknown });
  const add = (p, removes) => {
    const a = expand(p, cwd, home);
    if (a) push(a, removes);
  };
  const scripts = [];
  const shell = String(cmd).replace(HEREDOC, (match, ...captures) => {
    const { head, body } = captures.at(-1);
    const { name } = commandOf(wordsOf(segments(head).pop().text));
    if (SHELL.test(name)) return match;
    if (INTERP.test(name)) scripts.push(body);
    return head;
  });
  let prev = "";
  for (const { text: seg, piped } of segments(shell)) {
    // Redirects are found with quoted text masked, so `echo "a > b.md"` writes nothing.
    const masked = seg.replace(
      /"(?:[^"\\]|\\.)*"|'[^']*'/g,
      (m) => m[0] + "_".repeat(m.length - 2) + m[0],
    );
    let rest = seg;
    for (let m; (m = REDIRECT.exec(masked));) {
      WORD_AT.lastIndex = REDIRECT.lastIndex;
      const w = WORD_AT.exec(seg); // `>&2` has no word here: a descriptor, not a file
      if (!w) continue;
      add(unquote(w[0]));
      const from = m.index + m[1].length;
      const to = REDIRECT.lastIndex + w[0].length;
      rest = rest.slice(0, from) + " ".repeat(to - from) + rest.slice(to);
    }
    let { name, args, xargs } = commandOf(wordsOf(rest));
    const from = piped ? prev : "";
    prev = seg;
    if (name === "git" && args[0] === "mv")
      [name, args] = ["mv", args.slice(1)];
    if (name === "find") {
      const k = args.findIndex((a) => /^-(?:exec|execdir|ok|okdir)$/.test(a));
      if (k < 0) continue;
      const inner = args
        .slice(k + 1)
        .filter((a, j, all) => !(j === all.length - 1 && /^[;+]$/.test(a)));
      ({ name, args } = commandOf(inner));
      xargs = true;
    }
    if (name === "cd" || name === "pushd") {
      const a = args.find((x) => x === "-" || !x.startsWith("-"));
      cwd = a === undefined ? home : a === "-" ? null : expand(a, cwd, home);
    } else if (SHELL.test(name) || name === "eval") {
      const k =
        name === "eval"
          ? -1
          : args.findIndex((a) => /^-[a-z]*c[a-z]*$/i.test(a));
      const script = name === "eval" ? args.join(" ") : args[k + 1];
      if ((name === "eval" || k >= 0) && script !== undefined && depth < 3)
        out.push(...bashWrites(script, cwd, home, depth + 1));
    } else if (INTERP.test(name)) {
      args.forEach((a, k) => {
        if (
          /^(?:-[a-zA-Z]*[ceE]|--eval|-p|--print)$/.test(a) &&
          args[k + 1] !== undefined
        )
          scripts.push(args[k + 1]);
      });
      if (name === "deno" && args[0] === "eval") scripts.push(args[1] || "");
    } else if (name === "tee" || name === "touch") {
      const targets =
        name === "tee"
          ? args.filter((a) => !a.startsWith("-"))
          : operands(args, ["-r", "-d", "-t"]).pos;
      targets.forEach((a) => add(a));
      // `echo path | xargs touch`: the operands arrive on stdin, from the stage before.
      if (xargs && from) planMentions(from).forEach((p) => add(p.raw));
    } else if (name === "dd") {
      args.filter((a) => a.startsWith("of=")).forEach((a) => add(a.slice(3)));
    } else if (OUT_FLAG[name]) {
      args.forEach((a, k) => {
        if (OUT_FLAG[name].includes(a)) add(args[k + 1]);
        else if (a.startsWith(`${OUT_FLAG[name][1]}=`))
          add(a.slice(OUT_FLAG[name][1].length + 1));
      });
    } else if (
      ["cp", "mv", "install", "ln", "rsync"].includes(name) &&
      !(name === "install" && args.includes("-d"))
    ) {
      const { pos, target } = operands(args, ["-m", "-o", "-g", "-S", "-e"]);
      const srcs = target ? pos : pos.slice(0, -1);
      const d = expand(target || pos[pos.length - 1], cwd, home);
      if (!d) continue;
      const intoDir = Boolean(target) || isDir(d);
      const removes =
        name === "mv"
          ? srcs.map((s) => expand(s, cwd, home)).filter(Boolean)
          : [];
      if (!srcs.length && intoDir && xargs)
        push(path.join(d, "*.md"), [], true);
      if (!intoDir) {
        if (srcs.length) push(d, removes);
        continue;
      }
      for (const s of srcs) {
        const a = expand(s, cwd, home);
        if (opaque(s)) push(path.join(d, "*.md"), [], true);
        else if (a && !isDir(a)) push(path.join(d, path.basename(a)), removes);
      }
    }
  }
  for (const src of scripts) scriptWrites(src).forEach((p) => add(p));
  return out;
}

module.exports = { bashWrites };
