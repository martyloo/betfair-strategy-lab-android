const API = 'https://betfair-strategy-lab.onrender.com';

const $ = id => document.getElementById(id);

let oddsMode = 'any';
let pollTimer = null;
let lastResult = null;
let chartState = null;


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
// RACE CLASSIFICATION FILTERS
// ============================================================

function selectedChips(id) {
    const box = $(id);

    if (!box) {
        return [];
    }

    return Array.from(
        box.querySelectorAll('button.on')
    )
        .map(b => b.dataset.value)
        .filter(Boolean);
}


function bindFilterChips() {

    document
        .querySelectorAll('.filter-chips button')
        .forEach(b => {

            b.onclick = () => {
                b.classList.toggle('on');
            };

        });
}


// ============================================================
// CREATE BACKTEST REQUEST
// ============================================================

function requestBody() {

    const [min, max] = odds();

    return {

        from_date: $('from').value,
        to_date: $('to').value,

        // Great Britain only.
        countries: ['GB'],

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

        race_codes: selectedChips('raceCodes'),
        race_categories: selectedChips('raceCategories'),
        race_grades: selectedChips('raceGrades'),

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

        // Great Britain only.
        const c = 'GB';

        const x = await api(
            `/api/filter-options?plan=Basic%20Plan&country=${encodeURIComponent(c)}`
        );

        // -------------------------
        // VENUES
        // -------------------------

        const venues = Array.isArray(x.venues)
            ? x.venues
            : [];

        $('venue').innerHTML =
            '<option value="">Any venue</option>' +
            venues
                .filter(Boolean)
                .map(v =>
                    `<option value="${esc(v)}">${esc(v)}</option>`
                )
                .join('');


        // -------------------------
        // DISTANCES
        // -------------------------

        const distances = Array.isArray(x.distances)
            ? x.distances
            : [];

        $('distance').innerHTML =
            '<option value="">Any distance</option>' +
            distances
                .filter(Boolean)
                .map(v =>
                    `<option value="${esc(v)}">${esc(v)}</option>`
                )
                .join('');


        console.log(
            'Filter options loaded:',
            venues.length,
            'venues,',
            distances.length,
            'distances'
        );

    } catch (e) {

        console.error(
            'Could not load filter options:',
            e
        );

        $('venue').innerHTML =
            '<option value="">Any venue</option>';

        $('distance').innerHTML =
            '<option value="">Any distance</option>';
    }
}


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


        if (j.status === 'complete') {

            const r =
                await api(
                    '/api/jobs/' +
                    id +
                    '/result'
                );

            $('run').disabled =
                false;

            showView('results');

            render(r);

            loadHistory();

            return;
        }


        if (j.status === 'failed') {

            throw Error(
                j.message ||
                'Backtest failed'
            );
        }


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
        `${r.request?.from_date || ''} → ${r.request?.to_date || ''} · Great Britain`;


    // --------------------------------------------------------
    // SUMMARY METRICS
    // --------------------------------------------------------

    const netValue =
        Number(s.net || 0);

    $('netM').textContent =
        money(netValue);

    $('netM').classList.remove(
        'positive',
        'negative',
        'neutral'
    );

    $('netM').classList.add(
        netValue > 0
            ? 'positive'
            : netValue < 0
                ? 'negative'
                : 'neutral'
    );

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

                    <td class="${Number(x.net) >= 0 ? 'positive' : 'negative'}">
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


    // Clear old chart selection when a new result opens.
    const tip = $('chartTip');

    if (tip) {
        tip.classList.add('hide');
        tip.innerHTML = '';
    }

    requestAnimationFrame(() => {

        draw(
            r.graph_points || []
        );

    });
}


// ============================================================
// PROFIT CURVE
// ============================================================

function shortDate(value) {

    if (!value) {
        return '';
    }

    const d =
        new Date(value);

    if (
        Number.isNaN(
            d.getTime()
        )
    ) {
        return String(value)
            .slice(0, 10);
    }

    return d.toLocaleDateString(
        'en-GB',
        {
            day: '2-digit',
            month: 'short',
            year: '2-digit'
        }
    );
}


function fullDate(value) {

    if (!value) {
        return '';
    }

    const d =
        new Date(value);

    if (
        Number.isNaN(
            d.getTime()
        )
    ) {
        return String(value);
    }

    return d.toLocaleString(
        'en-GB',
        {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }
    );
}


function axisMoney(value) {

    const abs =
        Math.abs(value);

    const sign =
        value < 0
            ? '-£'
            : '£';

    if (abs >= 1000000) {

        return sign +
            (abs / 1000000)
                .toFixed(
                    abs >= 10000000
                        ? 0
                        : 1
                ) +
            'm';
    }

    if (abs >= 1000) {

        return sign +
            (abs / 1000)
                .toFixed(
                    abs >= 10000
                        ? 0
                        : 1
                ) +
            'k';
    }

    return sign +
        abs.toFixed(
            abs >= 100
                ? 0
                : 2
        );
}


function draw(
    points,
    selectedIndex = null
) {

    const c =
        $('chart');

    if (!c) {
        return;
    }

    let w =
        c.clientWidth;

    if (!w) {

        requestAnimationFrame(
            () =>
                draw(
                    points,
                    selectedIndex
                )
        );

        return;
    }

    const d =
        window.devicePixelRatio || 1;

    const h =
        270;

    c.width =
        Math.round(w * d);

    c.height =
        Math.round(h * d);

    const ctx =
        c.getContext('2d');

    if (!ctx) {
        return;
    }

    ctx.setTransform(
        d,
        0,
        0,
        d,
        0,
        0
    );

    ctx.clearRect(
        0,
        0,
        w,
        h
    );


    // --------------------------------------------------------
    // NO GRAPH DATA
    // --------------------------------------------------------

    if (!points.length) {

        chartState =
            null;

        ctx.fillStyle =
            '#718096';

        ctx.font =
            '13px sans-serif';

        ctx.fillText(
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

    let mn =
        Math.min(
            0,
            ...vals
        );

    let mx =
        Math.max(
            0,
            ...vals
        );

    if (mx === mn) {

        mx += 1;
        mn -= 1;
    }

    const range =
        mx - mn;


    // --------------------------------------------------------
    // CHART SIZE
    // --------------------------------------------------------

    const L = 58;
    const R = 12;
    const T = 16;
    const B = 48;

    const pw =
        Math.max(
            1,
            w - L - R
        );

    const ph =
        h - T - B;


    const pxFor =
        i =>
            L +
            pw *
            i /
            Math.max(
                1,
                points.length - 1
            );


    const pyFor =
        value =>
            T +
            ph *
            (mx - value) /
            range;


    // --------------------------------------------------------
    // Y AXIS — FIVE MONEY LEVELS
    // --------------------------------------------------------

    ctx.font =
        '10px sans-serif';

    ctx.textBaseline =
        'middle';

    for (
        let i = 0;
        i < 5;
        i++
    ) {

        const ratio =
            i / 4;

        const value =
            mx -
            range *
            ratio;

        const y =
            T +
            ph *
            ratio;


        // Grid line

        ctx.strokeStyle =
            '#e1e7ee';

        ctx.lineWidth =
            1;

        ctx.beginPath();

        ctx.moveTo(
            L,
            y
        );

        ctx.lineTo(
            w - R,
            y
        );

        ctx.stroke();


        // Money label

        ctx.fillStyle =
            '#718096';

        ctx.textAlign =
            'right';

        ctx.fillText(
            axisMoney(value),
            L - 7,
            y
        );
    }


    // --------------------------------------------------------
    // ZERO LINE
    // --------------------------------------------------------

    if (
        mn <= 0 &&
        mx >= 0
    ) {

        const zeroY =
            pyFor(0);

        ctx.strokeStyle =
            '#aeb8c4';

        ctx.lineWidth =
            1.2;

        ctx.beginPath();

        ctx.moveTo(
            L,
            zeroY
        );

        ctx.lineTo(
            w - R,
            zeroY
        );

        ctx.stroke();
    }


    // --------------------------------------------------------
    // PROFIT CURVE
    // --------------------------------------------------------

    ctx.strokeStyle =
        '#1769ff';

    ctx.lineWidth =
        2.5;

    ctx.lineJoin =
        'round';

    ctx.lineCap =
        'round';

    ctx.beginPath();


    points.forEach(
        (p, i) => {

            const px =
                pxFor(i);

            const py =
                pyFor(
                    Number(
                        p.cumulative
                    ) || 0
                );

            if (i === 0) {

                ctx.moveTo(
                    px,
                    py
                );

            } else {

                ctx.lineTo(
                    px,
                    py
                );
            }
        }
    );


    ctx.stroke();


    // --------------------------------------------------------
    // X AXIS — ACTUAL RACE DATES
    // --------------------------------------------------------

    const labelCount =
        w < 390
            ? 3
            : 5;

    ctx.textAlign =
        'center';

    ctx.textBaseline =
        'top';

    ctx.fillStyle =
        '#718096';

    ctx.font =
        '10px sans-serif';


    for (
        let i = 0;
        i < labelCount;
        i++
    ) {

        const index =
            Math.round(
                (points.length - 1) *
                i /
                Math.max(
                    1,
                    labelCount - 1
                )
            );

        const px =
            pxFor(index);

        ctx.fillText(
            shortDate(
                points[index]
                    .market_time
            ),
            px,
            T + ph + 10
        );
    }


    // --------------------------------------------------------
    // SELECTED RACE
    // --------------------------------------------------------

    if (
        selectedIndex !== null &&
        selectedIndex >= 0 &&
        selectedIndex < points.length
    ) {

        const p =
            points[selectedIndex];

        const px =
            pxFor(
                selectedIndex
            );

        const py =
            pyFor(
                Number(
                    p.cumulative
                ) || 0
            );


        // Vertical marker

        ctx.strokeStyle =
            '#7f8b99';

        ctx.lineWidth =
            1;

        ctx.setLineDash(
            [4, 4]
        );

        ctx.beginPath();

        ctx.moveTo(
            px,
            T
        );

        ctx.lineTo(
            px,
            T + ph
        );

        ctx.stroke();

        ctx.setLineDash([]);


        // Point marker

        ctx.beginPath();

        ctx.arc(
            px,
            py,
            5,
            0,
            Math.PI * 2
        );

        ctx.fillStyle =
            '#ffffff';

        ctx.fill();

        ctx.strokeStyle =
            '#1769ff';

        ctx.lineWidth =
            3;

        ctx.stroke();
    }


    chartState = {

        points,

        L,
        R,
        T,
        B,

        pw,
        ph,

        w,
        h,

        selectedIndex
    };
}


// ============================================================
// GRAPH RACE DETAILS
// ============================================================

function showChartPoint(index) {

    if (
        !chartState ||
        index < 0 ||
        index >=
            chartState.points.length
    ) {
        return;
    }

    const p =
        chartState.points[index];

    const tip =
        $('chartTip');

    if (!tip) {
        return;
    }

    const betNet =
        Number(
            p.bet_net || 0
        );

    const cumulative =
        Number(
            p.cumulative || 0
        );


    tip.innerHTML = `

        <div class="chart-tip-head">

            <strong>
                ${esc(
                    p.event_name ||
                    'Race'
                )}
            </strong>

            <span>
                ${esc(
                    fullDate(
                        p.market_time
                    )
                )}
            </span>

        </div>


        <div class="chart-tip-grid">

            <span>Horse</span>

            <b>
                ${esc(
                    p.horse || '—'
                )}
            </b>


            <span>Bet</span>

            <b>
                ${esc(
                    p.bet_type || '—'
                )}
            </b>


            <span>Odds</span>

            <b>
                ${Number(
                    p.bsp || 0
                ).toFixed(2)}
            </b>


            <span>Bet P/L</span>

            <b class="${
                betNet >= 0
                    ? 'positive'
                    : 'negative'
            }">

                ${money(
                    betNet
                )}

            </b>


            <span>
                Cumulative P/L
            </span>

            <b class="${
                cumulative >= 0
                    ? 'positive'
                    : 'negative'
            }">

                ${money(
                    cumulative
                )}

            </b>

        </div>
    `;


    tip.classList.remove(
        'hide'
    );


    draw(
        chartState.points,
        index
    );
}


// ============================================================
// FIND NEAREST GRAPH POINT
// ============================================================

function inspectChart(clientX) {

    if (
        !chartState ||
        !chartState.points.length
    ) {
        return;
    }

    const c =
        $('chart');

    const rect =
        c.getBoundingClientRect();

    const x =
        clientX -
        rect.left;

    const ratio =
        Math.max(
            0,
            Math.min(
                1,
                (
                    x -
                    chartState.L
                ) /
                chartState.pw
            )
        );

    const index =
        Math.round(
            ratio *
            (
                chartState
                    .points
                    .length -
                1
            )
        );

    showChartPoint(
        index
    );
}


// ============================================================
// GRAPH TOUCH / MOUSE CONTROL
// ============================================================

function bindChartInteraction() {

    const c =
        $('chart');

    if (!c) {
        return;
    }

    let dragging =
        false;


    c.addEventListener(
        'pointerdown',
        e => {

            dragging =
                true;

            if (
                c.setPointerCapture
            ) {
                c.setPointerCapture(
                    e.pointerId
                );
            }

            inspectChart(
                e.clientX
            );
        }
    );


    c.addEventListener(
        'pointermove',
        e => {

            if (dragging) {

                inspectChart(
                    e.clientX
                );
            }
        }
    );


    c.addEventListener(
        'pointerup',
        e => {

            dragging =
                false;

            inspectChart(
                e.clientX
            );
        }
    );


    c.addEventListener(
        'pointercancel',
        () => {

            dragging =
                false;
        }
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
                                Great Britain
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

bindChartInteraction();

bindFilterChips();

setDates();

setOddsMode(
    'any'
);

$('strategy').onchange();

health();

filters();

loadHistory();
