const API = 'https://betfair-strategy-lab.onrender.com';

const $ = id => document.getElementById(id);

let oddsMode = 'any';
let pollTimer = null;
let lastResult = null;


// ============================================================
// HELPERS
// ============================================================

const num = id => {
    return $(id).value === '' ? null : Number($(id).value);
};

const money = x => {
    return '£' + Number(x || 0).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
};

const esc = s => {
    return String(s ?? '').replace(
        /[&<>"']/g,
        m => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        }[m])
    );
};


// ============================================================
// API
// ============================================================

async function api(path, opt = {}) {

    const r = await fetch(API + path, opt);
    const t = await r.text();

    let j;

    try {
        j = JSON.parse(t);
    } catch {
        throw Error(t || `HTTP ${r.status}`);
    }

    if (!r.ok) {
        throw Error(
            j.detail ||
            j.error ||
            `HTTP ${r.status}`
        );
    }

    return j;
}


// ============================================================
// NAVIGATION
// ============================================================

function showView(id) {

    document
        .querySelectorAll('.view,.tab')
        .forEach(x => x.classList.remove('active'));

    $(id).classList.add('active');

    const tab = document.querySelector(
        `.tab[data-view="${id}"]`
    );

    if (tab) {
        tab.classList.add('active');
    }

    window.scrollTo(0, 0);
}


document.querySelectorAll('.tab').forEach(b => {

    b.onclick = () => {

        showView(b.dataset.view);

        // Redraw the chart whenever Results becomes visible.
        if (
            b.dataset.view === 'results' &&
            lastResult
        ) {
            requestAnimationFrame(() => {
                draw(lastResult.graph_points || []);
            });
        }
    };

});


// ============================================================
// DEFAULT DATES
// ============================================================

function setDates() {

    const to = new Date();
    const from = new Date();

    from.setMonth(from.getMonth() - 1);

    $('to').value =
        to.toISOString().slice(0, 10);

    $('from').value =
        from.toISOString().slice(0, 10);
}


// ============================================================
// ODDS FILTER
// ============================================================

function setOddsMode(mode) {

    oddsMode = mode;

    document
        .querySelectorAll('#oddsModes button')
        .forEach(b => {
            b.classList.toggle(
                'on',
                b.dataset.mode === mode
            );
        });

    $('oddsInputs').classList.toggle(
        'hide',
        mode === 'any'
    );

    $('odds2Wrap').classList.toggle(
        'hide',
        mode !== 'between'
    );

    $('odds1Label').childNodes[0].nodeValue =
        mode === 'over'
            ? 'Minimum odds '
            : mode === 'under'
                ? 'Maximum odds '
                : 'Minimum odds ';

    // Handy default for laying/backing outsiders.
    if (
        mode === 'over' &&
        !$('odds1').value
    ) {
        $('odds1').value = '40';
    }
}


document
    .querySelectorAll('#oddsModes button')
    .forEach(b => {

        b.onclick = () => {
            setOddsMode(b.dataset.mode);
        };

    });


function odds() {

    const a = num('odds1');
    const b = num('odds2');

    if (oddsMode === 'over') {
        return [
            a ?? 1.01,
            1000
        ];
    }

    if (oddsMode === 'under') {
        return [
            1.01,
            a ?? 1000
        ];
    }

    if (oddsMode === 'between') {
        return [
            a ?? 1.01,
            b ?? 1000
        ];
    }

    return [
        1.01,
        1000
    ];
}


// ============================================================
// CREATE BACKTEST REQUEST
// ============================================================

function requestBody() {

    const [min, max] = odds();

    return {

        from_date: $('from').value,
        to_date: $('to').value,

        countries: [
            $('country').value
        ],

        plan: 'Basic Plan',

        strategy: $('strategy').value,

        nth: Number(
            $('nth').value || 2
        ),

        min_odds: min,
        max_odds: max,

        min_runners: Number(
            $('minRunners').value || 2
        ),

        max_runners: Number(
            $('maxRunners').value || 0
        ),

        stake_mode:
            $('stakeMode').value,

        amount: Number(
            $('amount').value || 10
        ),

        commission: Number(
            $('commission').value || 0
        ),

        venues:
            $('venue').value
                ? [$('venue').value]
                : [],

        distances:
            $('distance').value
                ? [$('distance').value]
                : [],

        days_of_week: [],
        months_of_year: [],

        time_from:
            $('timeFrom').value || null,

        time_to:
            $('timeTo').value || null,

        fav_min_bsp:
            num('favMin'),

        fav_max_bsp:
            num('favMax'),

        second_min_bsp:
            num('secondMin'),

        second_max_bsp:
            num('secondMax'),

        fav_gap_min:
            num('gapMin'),

        fav_gap_max:
            num('gapMax'),

        overround_min:
            num('overMin'),

        overround_max:
            num('overMax'),

        race_codes: [],
        race_categories: [],
        race_grades: [],

        handicap_status: null,
        number_of_winners: null,
        in_play_enabled: null,
        bet_delay: null,
        betting_type: null,

        market_base_rate_min: null,
        market_base_rate_max: null,

        cross_matching: null,
        discount_allowed: null,
        persistence_enabled: null,

        selected_ltp_min: null,
        selected_ltp_max: null,

        selected_adjustment_min: null,
        selected_adjustment_max: null,

        selected_sort_priority_min: null,
        selected_sort_priority_max: null
    };
}


// ============================================================
// SERVER HEALTH
// ============================================================

async function health() {

    try {

        const h =
            await api('/api/health');

        $('health').textContent =
            h.ok
                ? `Online · ${h.workers} worker${h.workers === 1 ? '' : 's'}`
                : 'Unavailable';

        $('health').classList.toggle(
            'ok',
            !!h.ok
        );

    } catch {

        $('health').textContent =
            'Offline';
    }
}


// ============================================================
// FILTER OPTIONS
// ============================================================

async function filters() {

    try {

        const c =
            $('country').value;

        const x =
            await api(
                `/api/filter-options?plan=Basic%20Plan&country=${encodeURIComponent(c)}`
            );

        $('venue').innerHTML =
            '<option value="">Any venue</option>' +
            x.venues
                .map(v =>
                    `<option>${esc(v)}</option>`
                )
                .join('');

        $('distance').innerHTML =
            '<option value="">Any distance</option>' +
            x.distances
                .map(v =>
                    `<option>${esc(v)}</option>`
                )
                .join('');

    } catch (e) {

        console.log(e);
    }
}


$('country').onchange = filters;


// ============================================================
// STRATEGY
// ============================================================

$('strategy').onchange = () => {

    $('nthWrap').classList.toggle(
        'hide',
        !$('strategy')
            .value
            .includes('Nth favourite')
    );
};


// ============================================================
// RUN BACKTEST
// ============================================================

$('run').onclick = async () => {

    try {

        const b =
            requestBody();

        if (
            !b.from_date ||
            !b.to_date
        ) {
            throw Error(
                'Choose both dates.'
            );
        }

        if (
            b.min_odds >
            b.max_odds
        ) {
            throw Error(
                'Minimum odds cannot exceed maximum odds.'
            );
        }

        $('run').disabled = true;

        $('job')
            .classList
            .remove('hide');

        $('jobStatus').textContent =
            'Queued';

        $('jobMsg').textContent =
            'Submitting backtest…';

        $('pct').textContent =
            '0%';

        $('bar').style.width =
            '0%';

        const j =
            await api(
                '/api/jobs',
                {
                    method: 'POST',

                    headers: {
                        'Content-Type':
                            'application/json'
                    },

                    body:
                        JSON.stringify(b)
                }
            );

        poll(j.job_id);

    } catch (e) {

        $('run').disabled =
            false;

        alert(e.message);
    }
};


// ============================================================
// JOB POLLING
// ============================================================

async function poll(id) {

    clearTimeout(pollTimer);

    try {

        const j =
            await api(
                '/api/jobs/' + id
            );

        const p =
            j.progress || 0;

        $('jobStatus').textContent =
            j.status === 'running'
                ? 'Running'
                : j.status === 'complete'
                    ? 'Complete'
                    : 'Queued';

        $('jobMsg').textContent =
            j.message || j.status;

        $('pct').textContent =
            p + '%';

        $('bar').style.width =
            p + '%';


        // --------------------------------------------
        // BACKTEST COMPLETE
        // --------------------------------------------

        if (j.status === 'complete') {

            const r =
                await api(
                    '/api/jobs/' +
                    id +
                    '/result'
                );

            $('run').disabled =
                false;

            /*
             * IMPORTANT:
             *
             * Make the Results screen visible BEFORE
             * trying to measure and draw the canvas.
             */
            showView('results');

            render(r);

            loadHistory();

            return;
        }


        // --------------------------------------------
        // FAILED
        // --------------------------------------------

        if (j.status === 'failed') {

            throw Error(
                j.message ||
                'Backtest failed'
            );
        }


        // --------------------------------------------
        // KEEP POLLING
        // --------------------------------------------

        pollTimer =
            setTimeout(
                () => poll(id),
                1000
            );

    } catch (e) {

        $('run').disabled =
            false;

        $('jobStatus').textContent =
            'Failed';

        $('jobMsg').textContent =
            e.message;
    }
}


// ============================================================
// RENDER RESULTS
// ============================================================

function render(r) {

    lastResult = r;

    $('emptyResults')
        .classList
        .add('hide');

    $('resultContent')
        .classList
        .remove('hide');

    const s =
        r.stats || {};


    // --------------------------------------------------------
    // RESULT HEADER
    // --------------------------------------------------------

    $('resultStrategy').textContent =
        r.request?.strategy ||
        'RESULT';

    $('resultSub').textContent =
        `${r.request?.from_date || ''} → ${r.request?.to_date || ''} · ${(r.request?.countries || []).join(', ')}`;


    // --------------------------------------------------------
    // SUMMARY METRICS
    // --------------------------------------------------------

    $('netM').textContent =
        money(s.net);

    $('roiM').textContent =
        Number(
            s.stake_roi || 0
        ).toFixed(2) + '%';

    $('betsM').textContent =
        Number(
            s.bets || 0
        ).toLocaleString();

    $('strikeM').textContent =
        Number(
            s.strike || 0
        ).toFixed(2) + '%';

    $('ddM').textContent =
        money(
            s.max_drawdown
        );

    $('oddsM').textContent =
        Number(
            s.avg_bsp || 0
        ).toFixed(2);


    // --------------------------------------------------------
    // ODDS BANDS
    // --------------------------------------------------------

    $('bands').innerHTML =
        (r.bands || [])
            .map(x => `

                <tr>

                    <td>
                        ${esc(x.band)}
                    </td>

                    <td>
                        ${x.bets}
                    </td>

                    <td>
                        ${x.wins}
                    </td>

                    <td>
                        ${money(x.net)}
                    </td>

                    <td>
                        ${Number(
                            x.roi || 0
                        ).toFixed(2)}%
                    </td>

                </tr>

            `)
            .join('');


    // --------------------------------------------------------
    // TRUNCATION MESSAGE
    // --------------------------------------------------------

    $('trunc').textContent =
        r.bets_truncated
            ? `Showing first ${(r.bets || []).length.toLocaleString()} of ${Number(r.total_bets || 0).toLocaleString()} bets.`
            : '';


    // --------------------------------------------------------
    // INDIVIDUAL BETS
    // --------------------------------------------------------

    $('bets').innerHTML =
        (r.bets || [])
            .slice(0, 300)
            .map(x => `

                <div class="bet">

                    <div>

                        <h4>
                            ${esc(x.horse)}
                        </h4>

                        <p>
                            ${esc(x.event_name)}
                            ·
                            ${esc(x.market_time)}
                            · odds
                            ${Number(x.bsp).toFixed(2)}
                            ·
                            ${esc(x.bet_type)}
                        </p>

                    </div>

                    <div class="pl ${x.net >= 0 ? 'win' : 'loss'}">

                        ${money(x.net)}

                    </div>

                </div>

            `)
            .join('');


    /*
     * Wait until Android/WebView has laid out
     * the Results page before drawing the chart.
     */
    requestAnimationFrame(() => {

        draw(
            r.graph_points || []
        );

    });
}


// ============================================================
// PROFIT CURVE
// ============================================================

function draw(points) {

    const c =
        $('chart');

    if (!c) {
        return;
    }

    /*
     * Android WebView can occasionally report zero width
     * immediately after changing views.
     */
    let w =
        c.clientWidth;

    if (!w) {

        requestAnimationFrame(
            () => draw(points)
        );

        return;
    }


    const d =
        window.devicePixelRatio || 1;

    const h =
        220;


    // --------------------------------------------------------
    // HIGH-DPI CANVAS
    // --------------------------------------------------------

    c.width =
        Math.round(w * d);

    c.height =
        Math.round(h * d);

    const x =
        c.getContext('2d');

    if (!x) {
        return;
    }

    x.setTransform(
        d,
        0,
        0,
        d,
        0,
        0
    );

    x.clearRect(
        0,
        0,
        w,
        h
    );


    // --------------------------------------------------------
    // NO GRAPH DATA
    // --------------------------------------------------------

    if (!points.length) {

        x.fillStyle =
            '#718096';

        x.font =
            '13px sans-serif';

        x.fillText(
            'No profit curve data available',
            16,
            30
        );

        return;
    }


    // --------------------------------------------------------
    // VALUES
    // --------------------------------------------------------

    const vals =
        points.map(
            p =>
                Number(
                    p.cumulative
                ) || 0
        );


    const mn =
        Math.min(
            0,
            ...vals
        );

    const mx =
        Math.max(
            0,
            ...vals
        );

    const range =
        mx - mn || 1;


    // --------------------------------------------------------
    // CHART DIMENSIONS
    // --------------------------------------------------------

    const L = 48;
    const R = 10;
    const T = 12;
    const B = 30;

    const pw =
        Math.max(
            1,
            w - L - R
        );

    const ph =
        h - T - B;


    // --------------------------------------------------------
    // GRID
    // --------------------------------------------------------

    x.strokeStyle =
        '#e1e7ee';

    x.lineWidth =
        1;


    for (
        let i = 0;
        i < 5;
        i++
    ) {

        const y =
            T +
            ph *
            i /
            4;

        x.beginPath();

        x.moveTo(
            L,
            y
        );

        x.lineTo(
            w - R,
            y
        );

        x.stroke();
    }


    // --------------------------------------------------------
    // ZERO LINE
    // --------------------------------------------------------

    const zeroY =
        T +
        ph *
        (mx / range);

    x.strokeStyle =
        '#aeb8c4';

    x.lineWidth =
        1;

    x.beginPath();

    x.moveTo(
        L,
        zeroY
    );

    x.lineTo(
        w - R,
        zeroY
    );

    x.stroke();


    // --------------------------------------------------------
    // PROFIT CURVE
    // --------------------------------------------------------

    x.strokeStyle =
        '#1769ff';

    x.lineWidth =
        2.5;

    x.lineJoin =
        'round';

    x.lineCap =
        'round';

    x.beginPath();


    points.forEach(
        (p, i) => {

            const px =
                L +
                pw *
                i /
                Math.max(
                    1,
                    points.length - 1
                );

            const value =
                Number(
                    p.cumulative
                ) || 0;

            const py =
                T +
                ph *
                (mx - value) /
                range;

            if (i === 0) {

                x.moveTo(
                    px,
                    py
                );

            } else {

                x.lineTo(
                    px,
                    py
                );
            }
        }
    );


    x.stroke();


    // --------------------------------------------------------
    // LABELS
    // --------------------------------------------------------

    x.fillStyle =
        '#718096';

    x.font =
        '10px sans-serif';

    x.fillText(
        money(mx),
        2,
        T + 4
    );

    x.fillText(
        money(mn),
        2,
        T + ph
    );

    x.fillText(
        'Race date →',
        L,
        h - 7
    );
}


// ============================================================
// REDRAW CHART ON SCREEN SIZE CHANGE
// ============================================================

window.addEventListener(
    'resize',
    () => {

        if (
            lastResult &&
            $('results')
                .classList
                .contains('active')
        ) {

            requestAnimationFrame(
                () => {
                    draw(
                        lastResult.graph_points ||
                        []
                    );
                }
            );
        }
    }
);


// ============================================================
// SAVED BACKTESTS
// ============================================================

async function loadHistory() {

    const box =
        $('historyList');

    box.innerHTML =
        '<div class="empty">Loading…</div>';


    try {

        const x =
            await api(
                '/api/public-runs?limit=100'
            );


        box.innerHTML =
            x.runs.length
                ? x.runs
                    .map(r => `

                        <div
                            class="run"
                            data-id="${esc(r.run_id)}"
                        >

                            <div class="runhead">

                                <h3>
                                    ${esc(r.strategy)}
                                </h3>

                                <span class="roi">
                                    ${Number(
                                        r.roi || 0
                                    ).toFixed(2)}%
                                </span>

                            </div>

                            <p>

                                ${esc(r.from_date)}
                                →
                                ${esc(r.to_date)}
                                ·
                                ${(r.countries || [])
                                    .map(esc)
                                    .join(', ')}
                                ·
                                ${Number(
                                    r.bets || 0
                                ).toLocaleString()}
                                bets
                                ·
                                ${money(r.net)}

                            </p>

                        </div>

                    `)
                    .join('')

                : '<div class="empty">No saved results yet.</div>';


        box
            .querySelectorAll('.run')
            .forEach(el => {

                el.onclick =
                    () =>
                        openRun(
                            el.dataset.id
                        );

            });


    } catch (e) {

        box.innerHTML =
            `<div class="empty">${esc(e.message)}</div>`;
    }
}


// ============================================================
// OPEN SAVED BACKTEST
// ============================================================

async function openRun(id) {

    try {

        const x =
            await api(
                '/api/public-runs/' +
                encodeURIComponent(id) +
                '/result'
            );

        /*
         * Again, display Results BEFORE drawing.
         */
        showView('results');

        render(
            x.result
        );


    } catch (e) {

        alert(
            e.message
        );
    }
}


// ============================================================
// REFRESH SAVED RESULTS
// ============================================================

$('refresh').onclick =
    loadHistory;


// ============================================================
// START APP
// ============================================================

setDates();

setOddsMode(
    'any'
);

$('strategy').onchange();

health();

filters();

loadHistory();
