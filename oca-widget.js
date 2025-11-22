class OcaMeteoWidget extends HTMLElement {
    constructor() {
        super();

        this.attachShadow({ mode: "open" });

        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    width: 100%;
                    max-width: 600px;
                    padding: 10px;
                    background: #111;
                    color: #e0e0e0;
                    border-radius: 12px;
                    font-family: Arial;
                }

                h3 {
                    text-align: center;
                    margin: 0;
                    padding: 0;
                }

                #chart {
                    width: 100%;
                    height: 250px;
                }

                .info {
                    margin-top: 10px;
                    padding: 10px;
                    background: #222;
                    border-radius: 8px;
                }

                button {
                    background: #0066ff;
                    padding: 8px 14px;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                }
            </style>

            <h3>🌦️ OCA Sistem Meteo</h3>
            <canvas id="chart"></canvas>

            <div class="info">
                <div id="rain"></div>
                <div id="detail"></div>
                <button id="askAI">Preguntar a la IA</button>
            </div>
        `;
    }

    connectedCallback() {
        // 👉 Por defecto apuntamos al backend de Render
        this.api = this.getAttribute("api") || "https://oca-sistem-meteo.onrender.com";

        this.initNotifications();
        this.loadCombined();
        this.loadAI();
        this.startAutoRefresh();

        this.shadowRoot.querySelector("#askAI").onclick = () => {
            this.askAI("¿Va a llover hoy en mi ubicación?").then(r => alert(r));
        };
    }

    // 1. NOTIFICACIONES PUSH
    initNotifications() {
        if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission();
        }
    }

    sendNotification(msg) {
        if (Notification.permission === "granted") {
            new Notification("OCA Sistem Meteo", { body: msg });
        }
    }

    // 2. CARGAR DATOS COMBINADOS
    async loadCombined() {
        try {
            const url = `${this.api}/meteo/combined`;
            const res = await fetch(url);
            const data = await res.json();

            const labels = data.map(e => new Date(e.ts).getHours() + ":00");
            const temps = data.map(e => e.temp);

            this.drawChart(labels, temps);

            const detailBox = this.shadowRoot.querySelector("#detail");
            detailBox.innerHTML = `
                ☁ Cielo: ${data[0].sky} <br>
                🌡 Tendencia Máx: ${data[0].tendencia_max} <br>
                🌡 Tendencia Mín: ${data[0].tendencia_min}
            `;

        } catch (e) {
            console.error("Error loadCombined:", e);
        }
    }

    // 3. CARGAR PROBABILIDAD DE LLUVIA (IA)
    async loadAI() {
        try {
            const res = await fetch(`${this.api}/meteo/ai_rain`);
            const data = await res.json();

            const rainBox = this.shadowRoot.querySelector("#rain");
            rainBox.innerHTML = `🌧️ Probabilidad de lluvia: <b>${data.prob_lluvia}%</b>`;

            if (data.prob_lluvia > 70) {
                this.sendNotification("Alta probabilidad de lluvia en las próximas horas");
            }

        } catch (e) {
            console.error("Error IA:", e);
        }
    }

    // 4. REFRESH AUTOMÁTICO CADA 10 MINUTOS
    startAutoRefresh() {
        setInterval(() => {
            this.loadCombined();
            this.loadAI();
        }, 10 * 60 * 1000);
    }

    // 5. GRAFICO
    drawChart(labels, values) {
        const ctx = this.shadowRoot.getElementById("chart");

        if (this.chart) {
            this.chart.data.labels = labels;
            this.chart.data.datasets[0].data = values;
            this.chart.update();
            return;
        }

        this.chart = new Chart(ctx, {
            type: "line",
            data: {
                labels,
                datasets: [{
                    label: "Temperatura °C",
                    data: values,
                    borderWidth: 2,
                    borderColor: "#66aaff",
                    backgroundColor: "rgba(102,170,255,0.3)",
                    tension: 0.35,
                    pointRadius: 0
                }]
            },
            options: {
                responsive: true,
                scales: {
                    x: { grid: { color: "#333" } },
                    y: { grid: { color: "#333" } }
                }
            }
        });
    }

    // 6. CHATGPT
    async askAI(q) {
        try {
            const res = await fetch(`${this.api}/chatgpt`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ question: q })
            });

            const data = await res.json();
            return data.reply;

        } catch (e) {
            console.error("Error askAI:", e);
            return "La IA no está disponible";
        }
    }
}

customElements.define("oca-meteo-widget", OcaMeteoWidget);
