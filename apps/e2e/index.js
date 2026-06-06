const { spawn } = require("child_process");
const waitOn = require("wait-on");

const processes = [];

function run(cmd, args, name) {
    const proc = spawn(cmd, args, { stdio: "inherit", shell: true });
    proc.name = name;
    processes.push(proc);
    return proc;
}

function killAll() {
    console.log("\nEncerrando todos os processos...");
    processes.forEach(p => {
        if (!p.killed) {
            p.kill("SIGTERM");
        }
    });
}

(async () => {
    try {
        run("turbo", ["run", "e2e:local", "--filter", "web"], "web");
        run("turbo", ["run", "e2e:local", "--filter", "iam"], "iam");

        await waitOn({
            resources: [
                "http://localhost:5173", // web
                "http://localhost:5002"  // iam
            ],
            timeout: 60000
        });

        console.log("Serviços prontos, rodando Cypress...");

        // 4. Rodar Cypress
        const cypress = run("turbo", ["run", "cy:run", "--filter", "web"], "web");

        cypress.on("exit", (code) => {
            console.log(`Cypress finalizado com código ${code}`);
            killAll();
            process.exit(code);
        });

    } catch (err) {
        console.error("Erro:", err);
        killAll();
        process.exit(1);
    }
})();

// Garantir cleanup em CTRL+C
process.on("SIGINT", () => {
    killAll();
    process.exit();
});
