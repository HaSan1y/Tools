(() => {

    // =========================
    // STORAGE
    // =========================

    const listenerStats = {};
    const intervals = new Set();
    const timeouts = new Set();
    const rafs = new Set();

    // =========================
    // LISTENER TRACKING
    // =========================

    const originalAdd =
        EventTarget.prototype.addEventListener;

    EventTarget.prototype.addEventListener =
        function (type, listener, options) {

            listenerStats[type] =
                (listenerStats[type] || 0) + 1;

            return originalAdd.call(
                this,
                type,
                listener,
                options
            );
        };

    // =========================
    // INTERVAL TRACKING
    // =========================

    const originalSetInterval =
        window.setInterval;

    window.setInterval =
        function (callback, delay, ...args) {

            const id = originalSetInterval(
                callback,
                delay,
                ...args
            );

            intervals.add(id);

            return id;
        };

    // =========================
    // TIMEOUT TRACKING
    // =========================

    const originalSetTimeout =
        window.setTimeout;

    window.setTimeout =
        function (callback, delay, ...args) {

            const id = originalSetTimeout(
                callback,
                delay,
                ...args
            );

            timeouts.add(id);

            return id;
        };

    // =========================
    // RAF TRACKING
    // =========================

    const originalRAF =
        window.requestAnimationFrame;

    window.requestAnimationFrame =
        function (callback) {

            const id =
                originalRAF(callback);

            rafs.add(id);

            return id;
        };

    // =========================
    // MEDIA TRACKING
    // =========================

    function pauseAllMedia() {

        document
            .querySelectorAll("video, audio")
            .forEach(media => {

                media.pause();

                media.autoplay = false;
                media.loop = false;
            });
    }

    // =========================
    // PANIC MODE
    // =========================

    function activatePanicMode() {

        // kill tracked intervals
        intervals.forEach(id => {
            clearInterval(id);
        });

        // kill tracked timeouts
        timeouts.forEach(id => {
            clearTimeout(id);
        });

        // kill tracked rafs
        rafs.forEach(id => {
            cancelAnimationFrame(id);
        });

        // nuclear option
        for (let i = 0; i < 99999; i++) {
            clearInterval(i);
            clearTimeout(i);
            cancelAnimationFrame(i);
        }

        // stop media
        pauseAllMedia();

        // stop animations
        const style =
            document.createElement("style");

        style.innerHTML = `
            *,
            *::before,
            *::after {
                animation: none !important;
                transition: none !important;
            }
        `;

        document.head.appendChild(style);

        console.log(
            "[Webpage Stabilizer] PANIC MODE"
        );
    }

    // =========================
    // MESSAGE HANDLER
    // =========================

    chrome.runtime.onMessage.addListener(
        (message, sender, sendResponse) => {

            if (message.type === "GET_STATS") {

                sendResponse({
                    listeners: listenerStats,
                    intervals: intervals.size,
                    timeouts: timeouts.size,
                    rafs: rafs.size
                });
            }

            if (message.type === "PANIC") {

                activatePanicMode();

                sendResponse({
                    success: true
                });
            }
        }
    );

})();