import { spawn, spawnSync, type SpawnOptions } from "child_process";

// Set on the relaunched process so it knows it owns the terminal window.
const SPAWNED_ENV = "LOCAL_EXECUTABLE_SPAWNED";

// Set by pkg in the packaged executable.
declare global {
  namespace NodeJS {
    interface Process {
      pkg?: unknown;
    }
  }
}

// Command that re-runs this program: the binary itself when packaged with pkg,
// otherwise `node <script>`.
function selfCommand(): string[] {
  const args = process.pkg ? [] : [process.argv[1]];
  return [process.execPath, ...args, ...process.argv.slice(2)];
}

function shellQuote(arg: string): string {
  return `'${arg.replace(/'/g, `'\\''`)}'`;
}

export function commandExists(cmd: string): boolean {
  return spawnSync("sh", ["-c", `command -v ${cmd}`], { stdio: "ignore" }).status === 0;
}

// [terminal, args-before-command] for common Linux terminal emulators.
const LINUX_TERMINALS: [string, string[]][] = [
  ["gnome-terminal", ["--"]],
  ["ptyxis", ["--"]],
  ["kgx", ["--"]],
  ["konsole", ["-e"]],
  ["xfce4-terminal", ["-x"]],
  ["kitty", []],
  ["alacritty", ["-e"]],
  ["wezterm", ["start", "--"]],
  ["foot", []],
  ["xterm", ["-e"]],
  ["x-terminal-emulator", ["-e"]],
];

// Snap apps (e.g. VS Code installed via snap) leak GTK/library paths into child
// processes, which crash native terminals like gnome-terminal. Drop them and
// restore the originals the snap saved.
const SNAP_LEAKED_VARS = [
  "GTK_PATH", "GTK_EXE_PREFIX", "GTK_IM_MODULE_FILE", "GDK_PIXBUF_MODULE_FILE",
  "GDK_PIXBUF_MODULEDIR", "GIO_MODULE_DIR", "GSETTINGS_SCHEMA_DIR", "LOCPATH",
];

function terminalEnv(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env, [SPAWNED_ENV]: "1" };
  if (!env.SNAP) return env;
  for (const name of SNAP_LEAKED_VARS) delete env[name];
  for (const name of Object.keys(env)) {
    const match = name.match(/^(.+)_VSCODE_SNAP_ORIG$/);
    if (match) {
      env[match[1]] = env[name];
      delete env[name];
    }
  }
  return env;
}

function detach(cmd: string, args: string[], options: SpawnOptions = {}): void {
  const child = spawn(cmd, args, {
    detached: true,
    stdio: "ignore",
    env: terminalEnv(),
    ...options,
  });
  child.unref();
}

export function openInTerminal(): boolean {
  const command = selfCommand();

  if (process.platform === "win32") {
    detach("cmd.exe", ["/c", "start", '""', ...command.map((a) => `"${a}"`)], {
      windowsVerbatimArguments: true,
    });
    return true;
  }

  if (process.platform === "darwin") {
    const shellCmd = `${SPAWNED_ENV}=1 ${command.map(shellQuote).join(" ")}`;
    const script = shellCmd.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    detach("osascript", [
      "-e", `tell application "Terminal" to do script "${script}"`,
      "-e", 'tell application "Terminal" to activate',
    ]);
    return true;
  }

  if (!process.env.DISPLAY && !process.env.WAYLAND_DISPLAY) return false;
  const terminal = LINUX_TERMINALS.find(([cmd]) => commandExists(cmd));
  if (!terminal) return false;
  const [cmd, prefix] = terminal;
  detach(cmd, [...prefix, ...command]);
  return true;
}

// Started without a terminal (e.g. double-clicked in a file manager)?
export function launchedWithoutTerminal(): boolean {
  return !process.env[SPAWNED_ENV] && !process.stdin.isTTY && !process.stdout.isTTY;
}

// Windows closes the console as soon as the program exits when it was
// double-clicked. cmd.exe sets PROMPT, so its absence suggests Explorer.
export function shouldPauseOnExit(): boolean {
  if (process.env[SPAWNED_ENV]) return true;
  return process.platform === "win32" && !process.env.PROMPT && process.stdin.isTTY;
}

export function waitForEnter(message = "\nPress Enter to close..."): Promise<void> {
  return new Promise((resolve) => {
    process.stdout.write(message);
    process.stdin.resume();
    // Also on end of input (no terminal), which would otherwise wait forever.
    const done = () => {
      process.stdin.off("data", done).off("end", done).pause();
      resolve();
    };
    process.stdin.once("data", done).once("end", done);
  });
}

// Asks a yes/no question (default yes). Returns false when there's no terminal to answer in.
export function askYesNo(question: string): Promise<boolean> {
  if (!process.stdin.isTTY) return Promise.resolve(false);
  return new Promise((resolve) => {
    process.stdout.write(`${question} [Y/n] `);
    process.stdin.resume();
    process.stdin.once("data", (data) => {
      process.stdin.pause();
      resolve(!/^\s*n/i.test(String(data)));
    });
  });
}

// Waits for Enter (true) or "q" (false). Returns false when there's no terminal to answer in.
export function askRetry(question: string): Promise<boolean> {
  if (!process.stdin.isTTY) return Promise.resolve(false);
  return new Promise((resolve) => {
    process.stdout.write(`${question} `);
    process.stdin.resume();
    process.stdin.once("data", (data) => {
      process.stdin.pause();
      resolve(!/^\s*q/i.test(String(data)));
    });
  });
}
